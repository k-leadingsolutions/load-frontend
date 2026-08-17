import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DriverAssignmentsPage } from '@/features/driver/pages/DriverAssignmentsPage'

describe('DriverAssignmentsPage', () => {
  it('records proof of delivery for a delivery stop', async () => {
    const user = userEvent.setup()
    render(
      <QueryClientProvider client={new QueryClient()}>
        <DriverAssignmentsPage />
      </QueryClientProvider>,
    )

    expect(await screen.findByText('Driver workflow')).toBeInTheDocument()

    const proofInput = await screen.findByLabelText('Proof of delivery')
    await user.type(proofInput, 'Signed by concierge')
    await user.click(screen.getByRole('button', { name: 'Confirm delivery' }))

    await waitFor(() => {
      expect(screen.getByText('Recorded proof: Signed by concierge')).toBeInTheDocument()
    })
  })
})
