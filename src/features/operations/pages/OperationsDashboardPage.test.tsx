import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'

vi.mock('@/services/api/operationsService', async () => {
  const { mockOperationsService } = await import('@/services/mock')
  return { apiOperationsService: mockOperationsService }
})
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { OperationsDashboardPage } from '@/features/operations/pages/OperationsDashboardPage'

const renderPage = () =>
  render(
    <MemoryRouter>
      <QueryClientProvider client={new QueryClient()}>
        <OperationsDashboardPage />
      </QueryClientProvider>
    </MemoryRouter>,
  )

describe('OperationsDashboardPage', () => {
  it('links the actionable Active orders summary card to the Orders queue', async () => {
    renderPage()

    const activeOrdersLink = await screen.findByRole('link', { name: /active orders/i })
    expect(activeOrdersLink).toHaveAttribute('href', '/operations/orders')
  })

  it('does not render the non-actionable on-time delivery metric as a link', async () => {
    renderPage()

    await screen.findByRole('link', { name: /active orders/i })
    expect(screen.getByText(/on-time delivery/i)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /on-time delivery/i })).not.toBeInTheDocument()
  })

  it('links needs-attention cards to their existing Operations queues', async () => {
    renderPage()

    const productionLink = await screen.findByRole('link', { name: /awaiting store intake/i })
    expect(productionLink).toHaveAttribute('href', '/operations/production')

    const dispatchLink = await screen.findByRole('link', { name: /ready for dispatch\/collection/i })
    expect(dispatchLink).toHaveAttribute('href', '/operations/collections')
  })
})
