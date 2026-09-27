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
import { __resetMockPosScenarios, __setMockPosScenario, mockOperationsService } from '@/services/mock'
import { successResponse } from '@/services/api/envelope'
import type { ProductionOrder } from '@/domain/models'

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

  it('shows the human-friendly orderNumber in the heading, never the raw UUID id, and preserves the UUID for routing', async () => {
    const uuid = '3f2504e0-4f89-11d3-9a0c-0305e82c3301'
    const realApiOrder: ProductionOrder = {
      id: uuid,
      orderNumber: 'LD10482',
      customerName: 'Customer details available in the LOAD operations system',
      suburb: '',
      status: 'BOOKING_RECEIVED',
      stageLabel: 'Booking received',
      qualityCheckPending: false,
      internalNotes: [],
      itemsSummary: [],
      quantityReviewStatus: 'PENDING',
      receivedAtStore: false,
      fulfilmentType: 'DELIVERY',
    }
    vi.spyOn(mockOperationsService, 'getProductionOrder').mockResolvedValueOnce(successResponse(realApiOrder))

    renderPage(uuid)

    expect(await screen.findByText('Order #LD10482')).toBeInTheDocument()
    expect(screen.queryByText(`Order #${uuid}`)).not.toBeInTheDocument()
  })

  it('shows the actual date combined with the stored time-range label for collection/delivery windows', async () => {
    const realApiOrder: ProductionOrder = {
      id: 'order-uuid-1',
      orderNumber: 'LD10490',
      customerName: 'Customer details available in the LOAD operations system',
      suburb: '',
      status: 'BOOKING_RECEIVED',
      stageLabel: 'Booking received',
      qualityCheckPending: false,
      internalNotes: [],
      itemsSummary: [],
      quantityReviewStatus: 'PENDING',
      receivedAtStore: false,
      fulfilmentType: 'DELIVERY',
      pickupWindowDate: '2026-08-08',
      pickupWindowLabel: '09:00 - 11:00',
      deliveryWindowDate: '2026-08-08',
      deliveryWindowLabel: '14:00 - 16:00',
    }
    vi.spyOn(mockOperationsService, 'getProductionOrder').mockResolvedValueOnce(successResponse(realApiOrder))

    renderPage('order-uuid-1')

    expect(await screen.findByText(/Aug 2026 · 09:00 - 11:00/)).toBeInTheDocument()
    expect(screen.getByText(/Aug 2026 · 14:00 - 16:00/)).toBeInTheDocument()
  })
})
