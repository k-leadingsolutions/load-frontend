import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'

vi.mock('@/services/api/customerOrderService', async () => {
  const { mockCustomerOrderService } = await import('@/services/mock')
  return { apiCustomerOrderService: mockCustomerOrderService }
})
vi.mock('@/services/api/invoiceService', async () => {
  const { mockInvoiceService } = await import('@/services/mock')
  return { apiInvoiceService: mockInvoiceService }
})
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/app/providers/AuthProvider'
import { RequireCustomerAuth } from '@/app/router/RequireCustomerAuth'
import { appPaths } from '@/app/router/paths'
import { CustomerInvoicePage } from '@/features/customer/pages/CustomerInvoicePage'
import { mockCustomerProfile } from '@/services/mock/data'
import { AUTH_STORAGE_KEY } from '@/services/mock/sessionStore'
import { upsertLoadInvoice } from '@/services/mock'
import { prependStoredOrder } from '@/services/mock/orderStore'
import type { Invoice, LaundryOrder } from '@/domain/models'

const buildInvoice = (overrides: Partial<Invoice> = {}): Invoice => ({
  id: 'inv-fulfilment-test',
  invoiceNumber: 'INV-FULFILMENT-TEST',
  orderId: 'LD-FULFILMENT-TEST',
  customerId: mockCustomerProfile.id,
  customerName: 'Test Customer',
  serviceLabel: 'Wash & Fold',
  lines: [{ id: 'line-1', description: 'Wash & Fold', quantity: 1, unitPrice: 300, total: 300, lineType: 'SERVICE' }],
  pickupFee: 0,
  deliveryFee: 0,
  subtotal: 300,
  adjustmentTotal: 0,
  discountTotal: 0,
  loyaltyRedemptionTotal: 0,
  taxTotal: 0,
  finalTotal: 300,
  status: 'ISSUED',
  paymentStatus: 'PENDING',
  posSyncStatus: 'SYNCED',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
})

const buildOrder = (overrides: Partial<LaundryOrder> & { id: string }): LaundryOrder => ({
  customerId: mockCustomerProfile.id,
  status: 'AWAITING_PAYMENT',
  friendlyStatus: 'Awaiting payment',
  pickupWindow: { date: '2026-09-16', windowLabel: 'Today' },
  pickupAddress: mockCustomerProfile.addresses[0]!,
  services: [{ serviceId: 'ev-wash-dry-fold', quantity: 5, unitLabel: 'kg' }],
  estimatedTotal: 300,
  paymentStatus: 'PENDING',
  invoiceStatus: 'READY',
  loyaltyPointsEarned: 0,
  promotionsApplied: [],
  internalNotes: [],
  canRepeat: false,
  fulfilmentType: 'DELIVERY',
  ...overrides,
})

const renderInvoicePage = (invoiceId: string) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AuthProvider>
        <MemoryRouter initialEntries={[`/customer/invoice/${invoiceId}`]}>
          <Routes>
            <Route element={<RequireCustomerAuth />}>
              <Route path={appPaths.customerInvoice} element={<CustomerInvoicePage />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  )

describe('CustomerInvoicePage — fulfilment-aware payment gating', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(mockCustomerProfile))
  })

  it('DELIVERY + invoice ready + unpaid → shows Pay now', async () => {
    const invoice = buildInvoice({ id: 'inv-delivery-unpaid', orderId: 'LD-DELIVERY-UNPAID' })
    upsertLoadInvoice(invoice)
    prependStoredOrder(buildOrder({
      id: 'LD-DELIVERY-UNPAID',
      invoiceId: invoice.id,
      deliveryAddress: mockCustomerProfile.addresses[0]!,
      deliveryWindow: { date: '2026-09-16', windowLabel: 'Today, 14:00 - 16:00' },
      fulfilmentType: 'DELIVERY',
      paymentStatus: 'PENDING',
    }))

    renderInvoicePage(invoice.id)

    expect(await screen.findByText(/pay now/i)).toBeInTheDocument()
  })

  it('DELIVERY + paid → no Pay now, displays payment-confirmed message', async () => {
    const invoice = buildInvoice({ id: 'inv-delivery-paid', orderId: 'LD-DELIVERY-PAID', status: 'PAID', paymentStatus: 'CONFIRMED' })
    upsertLoadInvoice(invoice)
    prependStoredOrder(buildOrder({
      id: 'LD-DELIVERY-PAID',
      invoiceId: invoice.id,
      deliveryAddress: mockCustomerProfile.addresses[0]!,
      deliveryWindow: { date: '2026-09-16', windowLabel: 'Today, 14:00 - 16:00' },
      fulfilmentType: 'DELIVERY',
      paymentStatus: 'CONFIRMED',
    }))

    renderInvoicePage(invoice.id)

    await screen.findByText(`Invoice ${invoice.invoiceNumber}`)
    expect(screen.queryByText(/pay now/i)).not.toBeInTheDocument()
    expect(screen.getByText(/payment confirmed/i)).toBeInTheDocument()
  })

  it('STORE_COLLECTION + invoice ready → no Pay now, shows Pay at store messaging', async () => {
    const invoice = buildInvoice({ id: 'inv-store-collection-ready', orderId: 'LD-STORE-COLLECTION-READY' })
    upsertLoadInvoice(invoice)
    prependStoredOrder(buildOrder({
      id: 'LD-STORE-COLLECTION-READY',
      invoiceId: invoice.id,
      fulfilmentType: 'STORE_COLLECTION',
      paymentStatus: 'NOT_REQUIRED',
    }))

    renderInvoicePage(invoice.id)

    await screen.findByText(`Invoice ${invoice.invoiceNumber}`)
    expect(await screen.findByText(/collect your order from LOAD/i)).toBeInTheDocument()
    expect(screen.queryByText(/pay now/i)).not.toBeInTheDocument()
  })
})
