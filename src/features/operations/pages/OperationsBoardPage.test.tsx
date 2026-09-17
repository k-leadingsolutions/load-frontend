import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { OperationsBoardPage } from '@/features/operations/pages/OperationsBoardPage'

describe('OperationsBoardPage', () => {
  it('allows operations staff to confirm receipt on an order', async () => {
    const user = userEvent.setup()
    render(
      <QueryClientProvider client={new QueryClient()}>
        <OperationsBoardPage />
      </QueryClientProvider>,
    )

    expect(await screen.findByText('Operations workflow')).toBeInTheDocument()

    const confirmButtons = await screen.findAllByRole('button', { name: 'Confirm received' })
    const actionableButton = confirmButtons.find((button) => !button.hasAttribute('disabled'))

    expect(actionableButton).toBeDefined()
    await user.click(actionableButton!)

    await waitFor(() => {
      expect(screen.getAllByText(/Received: Confirmed/)[0]).toBeInTheDocument()
    })
  })

  it('renders QC controls and store intake, but never a price adjustment control', async () => {
    // "Adjust price" was removed: LOAD must never write to POS or override commercial
    // pricing from Operations. Store intake capture replaces it as an operational-only record.
    render(
      <QueryClientProvider client={new QueryClient()}>
        <OperationsBoardPage />
      </QueryClientProvider>,
    )

    expect((await screen.findAllByRole('button', { name: /qc pass/i })).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: /save intake/i })[0]).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /adjust price/i })).not.toBeInTheDocument()
  })

  it('allows recording store intake for a received order', async () => {
    const user = userEvent.setup()
    render(
      <QueryClientProvider client={new QueryClient()}>
        <OperationsBoardPage />
      </QueryClientProvider>,
    )

    expect(await screen.findByText('Operations workflow')).toBeInTheDocument()

    const weightInputs = await screen.findAllByLabelText('Actual weight in kilograms')
    const enabledIndex = weightInputs.findIndex((input) => !input.hasAttribute('disabled'))
    expect(enabledIndex).toBeGreaterThanOrEqual(0)

    await user.type(weightInputs[enabledIndex]!, '9.5')
    const saveButtons = screen.getAllByRole('button', { name: /save intake/i })
    await user.click(saveButtons[enabledIndex]!)

    await waitFor(() => {
      expect(screen.getAllByText(/Recorded weight: 9.5 kg/)[0]).toBeInTheDocument()
    })
  })
})
