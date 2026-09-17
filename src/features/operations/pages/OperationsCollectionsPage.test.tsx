import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { OperationsCollectionsPage } from '@/features/operations/pages/OperationsCollectionsPage'
import { updateStoredDriverAssignment } from '@/services/mock/driverStore'

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <OperationsCollectionsPage />
    </QueryClientProvider>,
  )

describe('OperationsCollectionsPage', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('shows dispatch-ready DELIVERY and STORE_COLLECTION orders in distinct sections', async () => {
    renderPage()

    expect(await screen.findByText('Ready for dispatch (Driver delivery)')).toBeInTheDocument()
    expect(screen.getByText('Ready for store collection')).toBeInTheDocument()
    expect(await screen.findByText(/#LD10241/)).toBeInTheDocument()
    expect(await screen.findByText(/#LD10242/)).toBeInTheDocument()
  })

  it('dispatches a paid, invoice-ready DELIVERY order for delivery', async () => {
    const user = userEvent.setup()
    renderPage()

    const listItem = (await screen.findByText(/#LD10241/)).closest('li')
    expect(listItem).not.toBeNull()
    const dispatchButton = within(listItem!).getByRole('button', { name: /dispatch for delivery/i })
    await user.click(dispatchButton)

    await waitFor(() => {
      expect(screen.queryByText(/#LD10241/)).not.toBeInTheDocument()
    })
  })

  it('blocks dispatch for an unpaid DELIVERY order and surfaces an error', async () => {
    const user = userEvent.setup()
    renderPage()

    const listItem = (await screen.findByText(/#LD10243/)).closest('li')
    expect(listItem).not.toBeNull()
    const dispatchButton = within(listItem!).getByRole('button', { name: /dispatch for delivery/i })
    await user.click(dispatchButton)

    expect(await screen.findByText(/action could not be completed/i)).toBeInTheDocument()
    expect(screen.getByText(/#LD10243/)).toBeInTheDocument()
  })

  it('marks a STORE_COLLECTION order as collected without any Driver delivery assignment', async () => {
    const user = userEvent.setup()
    renderPage()

    const collectButton = await screen.findByRole('button', { name: /mark collected/i })
    await user.click(collectButton)

    await waitFor(() => {
      expect(screen.queryByText(/#LD10242/)).not.toBeInTheDocument()
    })
  })

  it('lets Operations approve a Driver reschedule request', async () => {
    updateStoredDriverAssignment('run-01', (current) => ({
      ...current,
      stopStatus: 'RESCHEDULE_REQUESTED',
      rescheduleReason: 'CUSTOMER_UNAVAILABLE',
    }))
    const user = userEvent.setup()
    renderPage()

    expect(await screen.findByText(/Order #LD10236/)).toBeInTheDocument()
    const approveButton = screen.getByRole('button', { name: 'Approve' })
    await user.click(approveButton)

    await waitFor(() => {
      expect(screen.queryByText(/Order #LD10236/)).not.toBeInTheDocument()
    })
  })

  it('lets Operations retry a failed collection/delivery attempt', async () => {
    updateStoredDriverAssignment('run-01', (current) => ({
      ...current,
      stopStatus: 'FAILED',
      failureReason: 'CUSTOMER_UNAVAILABLE',
    }))
    const user = userEvent.setup()
    renderPage()

    expect(await screen.findByText(/Order #LD10236/)).toBeInTheDocument()
    const retryButton = screen.getByRole('button', { name: /retry/i })
    await user.click(retryButton)

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument()
    })
  })
})
