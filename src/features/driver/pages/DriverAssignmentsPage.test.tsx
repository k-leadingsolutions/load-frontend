import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DriverAssignmentsPage } from '@/features/driver/pages/DriverAssignmentsPage'

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <DriverAssignmentsPage />
    </QueryClientProvider>,
  )

describe('DriverAssignmentsPage', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('lists assignments ordered by stop sequence', async () => {
    renderPage()

    const headings = await screen.findAllByText(/^Stop #/)
    const order = headings.map((node) => node.textContent)
    expect(order[0]).toMatch(/Stop #1/)
    expect(order[1]).toMatch(/Stop #2/)
    expect(order[2]).toMatch(/Stop #3/)
  })

  it('does not expose payment, pricing, or weight-capture controls (no POS dependency)', async () => {
    renderPage()
    await screen.findByText('Driver workflow')

    expect(screen.queryByText(/capture weight/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/payment/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/price/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/invoice/i)).not.toBeInTheDocument()
  })

  it('runs the collection lifecycle: en route -> arrival -> verify -> collect', async () => {
    const user = userEvent.setup()
    renderPage()

    const stop1 = (await screen.findByText(/Stop #1/)).closest('article')
    if (!stop1) throw new Error('Stop #1 card not found')
    const stopScope = within(stop1)

    await user.click(stopScope.getByRole('button', { name: 'Start · En route' }))
    await waitFor(() => expect(stopScope.getByText('En route')).toBeInTheDocument())

    await user.click(stopScope.getByRole('button', { name: 'Confirm arrival' }))
    await waitFor(() => expect(stopScope.getByText('Arrived')).toBeInTheDocument())

    const codeInput = stopScope.getByLabelText(/verify collection code/i)
    await user.type(codeInput, '123456')
    await user.click(stopScope.getByRole('button', { name: 'Verify' }))
    await waitFor(() => expect(stopScope.getByText('Verified')).toBeInTheDocument(), { timeout: 3000 })
    await waitFor(() => expect(stopScope.getByRole('button', { name: 'Confirm collection' })).not.toBeDisabled())

    await user.click(stopScope.getByRole('button', { name: 'Confirm collection' }))
    await waitFor(() => {
      expect(screen.getByText(/Stop #1 · PICKUP #LD10236/)).toBeInTheDocument()
    })
  })

  it('runs the delivery lifecycle and records proof of delivery', async () => {
    const user = userEvent.setup()
    renderPage()

    const stop2 = (await screen.findByText(/Stop #2/)).closest('article')
    if (!stop2) throw new Error('Stop #2 card not found')
    const stopScope = within(stop2)

    // run-02 seed data starts as ARRIVED, so verification is available immediately.
    const codeInput = stopScope.getByLabelText(/verify delivery code/i)
    await user.type(codeInput, '123456')
    await user.click(stopScope.getByRole('button', { name: 'Verify' }))
    await waitFor(() => expect(stopScope.getByText('Verified')).toBeInTheDocument(), { timeout: 3000 })

    const proofInput = stopScope.getByLabelText('Proof of delivery')
    await user.type(proofInput, 'Signed by concierge')
    await waitFor(() => expect(stopScope.getByRole('button', { name: 'Confirm delivery' })).not.toBeDisabled())
    await user.click(stopScope.getByRole('button', { name: 'Confirm delivery' }))

    await waitFor(() => {
      expect(screen.getByText(/Stop #2 · DELIVERY #LD10235/)).toBeInTheDocument()
    })
  })

  it('records a failed stop attempt with reason and note', async () => {
    const user = userEvent.setup()
    renderPage()

    const stop3 = (await screen.findByText(/Stop #3/)).closest('article')
    if (!stop3) throw new Error('Stop #3 card not found')
    const stopScope = within(stop3)

    await user.selectOptions(stopScope.getByLabelText('Failed stop'), 'ACCESS_ISSUE')
    await user.click(stopScope.getByRole('button', { name: 'Record failure' }))

    await waitFor(() => {
      expect(stopScope.getByText(/Failure reason: Access issue/)).toBeInTheDocument()
    })
  })

  it('records a reschedule request without changing scheduling authority', async () => {
    const user = userEvent.setup()
    renderPage()

    const stop3 = (await screen.findByText(/Stop #3/)).closest('article')
    if (!stop3) throw new Error('Stop #3 card not found')
    const stopScope = within(stop3)

    await user.click(stopScope.getByRole('button', { name: 'Request reschedule' }))

    await waitFor(() => {
      expect(stopScope.getByText(/pending Operations approval/)).toBeInTheDocument()
    })
  })

  it('disables mutation controls while a request is pending (duplicate-action protection)', async () => {
    const user = userEvent.setup()
    renderPage()

    const stop1 = (await screen.findByText(/Stop #1/)).closest('article')
    if (!stop1) throw new Error('Stop #1 card not found')
    const stopScope = within(stop1)

    const enRouteButton = stopScope.getByRole('button', { name: 'Start · En route' })
    await user.click(enRouteButton)

    expect(enRouteButton).toBeDisabled()

    await waitFor(() => expect(stopScope.getByText('En route')).toBeInTheDocument())
  })
})
