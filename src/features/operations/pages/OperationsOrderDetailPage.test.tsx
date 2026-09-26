import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi } from 'vitest'

vi.mock('@/services/api/operationsService', async () => {
  const { mockOperationsService } = await import('@/services/mock')
  return { apiOperationsService: mockOperationsService }
})
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

  it('remains functional and shows an unavailable notice when refreshing invoice while POS cannot be reached', async () => {
    const user = userEvent.setup()
    __setMockPosScenario('LD10235', { kind: 'UNAVAILABLE' })
    renderPage('LD10235')

    expect(await screen.findByText('Order #LD10235')).toBeInTheDocument()
    await user.click(await screen.findByRole('button', { name: /refresh invoice from pos/i }))
    await waitFor(() => {
      expect(screen.getByText(/unable to retrieve your invoice/i)).toBeInTheDocument()
    })
    // LOAD's own operational data is still fully visible despite POS failure.
    expect(screen.getByText('DELIVERY')).toBeInTheDocument()
  })

  it('exposes POS-derived finalInvoiceTotal and READY status after a successful invoice refresh', async () => {
    const user = userEvent.setup()
    __setMockPosScenario('LD10235', {
      kind: 'INVOICED',
      invoice: {
        vendorInvoiceId: 'POS-INV-LD10235',
        vendorOrderId: 'POS-ORD-LD10235',
        loadOrderRef: 'LD10235',
        currency: 'ZAR',
        lines: [{ description: 'Wash + Dry + Fold', quantity: 1, unitAmount: 314, lineAmount: 314 }],
        totalAmountDue: 314,
        vendorStatus: 'FINAL',
        issuedAt: new Date().toISOString(),
      },
    })
    renderPage('LD10235')

    expect(await screen.findByText('Order #LD10235')).toBeInTheDocument()
    await user.click(await screen.findByRole('button', { name: /refresh invoice from pos/i }))

    await waitFor(() => {
      expect(screen.getByText('READY')).toBeInTheDocument()
    })
    expect(screen.getByText('R314.00')).toBeInTheDocument()
  })

  it('shows a not-found state for an unknown order rather than crashing', async () => {
    renderPage('LD-UNKNOWN')

    expect(await screen.findByText('Order not found')).toBeInTheDocument()
  })
})
