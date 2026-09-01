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

  it('renders QC and price adjustment controls', async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <OperationsBoardPage />
      </QueryClientProvider>,
    )

    expect((await screen.findAllByRole('button', { name: /qc pass/i })).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: /adjust price/i })[0]).toBeInTheDocument()
  })
})
