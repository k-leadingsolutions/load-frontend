import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { OperationsOrderDetailPage } from '@/features/operations/pages/OperationsOrderDetailPage'
import { __resetMockPosScenarios, __setMockPosScenario } from '@/services/mock'

const renderPage = (orderId: string) =>
  render(
    <MemoryRouter initialEntries={[`/operations/orders/${orderId}`]}>
      <QueryClientProvider client={new QueryClient()}>
        <Routes>
          <Route path="/operations/orders/:orderId" element={<OperationsOrderDetailPage />} />
        </Routes>
      </QueryClientProvider>
    </MemoryRouter>,
  )

describe('OperationsOrderDetailPage', () => {
  beforeEach(() => {
    window.localStorage.clear()
    __resetMockPosScenarios()
  })

  it('shows fulfilment, operational status, and services for an order', async () => {
    renderPage('LD10235')

    expect(await screen.findByText('Order #LD10235')).toBeInTheDocument()
    expect(screen.getByText('DELIVERY')).toBeInTheDocument()
    expect(screen.getByText('Sipho Khumalo')).toBeInTheDocument()
  })

  it('remains functional and shows an unavailable notice when POS cannot be reached', async () => {
    __setMockPosScenario('LD10235', { kind: 'UNAVAILABLE' })
    renderPage('LD10235')

    expect(await screen.findByText('Order #LD10235')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText(/POS is currently unavailable/i)).toBeInTheDocument()
    })
    // LOAD's own operational data is still fully visible despite POS failure.
    expect(screen.getByText('DELIVERY')).toBeInTheDocument()
  })

  it('shows a not-found state for an unknown order rather than crashing', async () => {
    renderPage('LD-UNKNOWN')

    expect(await screen.findByText('Order not found')).toBeInTheDocument()
  })
})
