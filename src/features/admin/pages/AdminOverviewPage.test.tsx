import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AdminOverviewPage } from '@/features/admin/pages/AdminOverviewPage'

describe('AdminOverviewPage', () => {
  it('allows delivery zone fee edits in the admin workspace', async () => {
    const user = userEvent.setup()
    render(
      <QueryClientProvider client={new QueryClient()}>
        <AdminOverviewPage />
      </QueryClientProvider>,
    )

    expect(await screen.findByText('Catalogue, pricing, and delivery configuration')).toBeInTheDocument()

    const feeInputs = await screen.findAllByDisplayValue('45')
    await user.clear(feeInputs[0]!)
    await user.type(feeInputs[0]!, '60')
    await user.click(screen.getByRole('button', { name: 'Save catalogue changes' }))

    expect(await screen.findByText('Catalogue and pricing changes saved for the current mock session.')).toBeInTheDocument()
  })
})
