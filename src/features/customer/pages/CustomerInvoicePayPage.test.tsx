import { render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'

vi.mock('@/services/api/customerOrderService', async () => {
  const { mockCustomerOrderService } = await import('@/services/mock')
  return { apiCustomerOrderService: mockCustomerOrderService }
})
vi.mock('@/services/api/invoiceService', async () => {
  const { mockInvoiceService } = await import('@/services/mock')
  return { apiInvoiceService: mockInvoiceService }
})
vi.mock('@/services/api/paymentService', async () => {
  const { mockPaymentService } = await import('@/services/mock')
  return { apiPaymentService: mockPaymentService }
})
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/app/providers/AuthProvider'
import { RequireCustomerAuth } from '@/app/router/RequireCustomerAuth'
import { appPaths } from '@/app/router/paths'
import { CustomerInvoicePayPage } from '@/features/customer/pages/CustomerInvoicePayPage'
import { mockCustomerProfile } from '@/services/mock/data'
import { AUTH_STORAGE_KEY } from '@/services/mock/sessionStore'
import { upsertLoadInvoice, mockInvoiceService } from '@/services/mock'
import { getStoredOrder, prependStoredOrder } from '@/services/mock/orderStore'
import type { Invoice } from '@/domain/models'

const buildInvoice = (overrides: Partial<Invoice> = {}): Invoice => ({
  id: 'inv-PAY-TEST',
  invoiceNumber: 'INV-PAY-TEST',
  orderId: 'LD-PAY-TEST',
  customerId: mockCustomerProfile.id,
  customerName: 'Test Customer',
  serviceLabel: 'Wash & Fold',
  lines: [{ id: 'line-1', description: 'Wash & Fold', quantity: 1, unitPrice: 785, total: 785, lineType: 'SERVICE' }],
  pickupFee: 0,
  deliveryFee: 0,
  subtotal: 785,
  adjustmentTotal: 0,
  discountTotal: 0,
  loyaltyRedemptionTotal: 0,
  taxTotal: 0,
  finalTotal: 785,
  status: 'ISSUED',
  paymentStatus: 'PENDING',
  posSyncStatus: 'SYNCED',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
})

const renderPayPage = (invoiceId: string) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AuthProvider>
        <MemoryRouter initialEntries={[`/customer/invoice/${invoiceId}/pay`]}>
          <Routes>
            <Route element={<RequireCustomerAuth />}>
              <Route path={appPaths.customerInvoicePay} element={<CustomerInvoicePayPage />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  )

describe('CustomerInvoicePayPage', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(mockCustomerProfile))
  })

  it('uses Invoice.finalTotal (never estimatedTotal) as the payment amount', async () => {
    const invoice = buildInvoice({ id: 'inv-amount-check', orderId: 'LD-AMOUNT-CHECK', finalTotal: 785 })
    upsertLoadInvoice(invoice)
    prependStoredOrder({
      id: 'LD-AMOUNT-CHECK',
      customerId: mockCustomerProfile.id,
      status: 'AWAITING_PAYMENT',
      friendlyStatus: 'Awaiting payment',
      pickupWindow: { date: '2026-09-16', windowLabel: 'Today' },
      pickupAddress: mockCustomerProfile.addresses[0]!,
      deliveryAddress: mockCustomerProfile.addresses[0]!,
      deliveryWindow: { date: '2026-09-16', windowLabel: 'Today, 14:00 - 16:00' },
      services: [{ serviceId: 'ev-wash-dry-fold', quantity: 5, unitLabel: 'kg' }],
      // Deliberately mismatched: estimatedTotal MUST NOT be used for payment.
      estimatedTotal: 420,
      paymentStatus: 'PENDING',
      invoiceStatus: 'READY',
      invoiceId: invoice.id,
      finalInvoiceTotal: invoice.finalTotal,
      loyaltyPointsEarned: 0,
      promotionsApplied: [],
      internalNotes: [],
      canRepeat: false,
      fulfilmentType: 'DELIVERY',
    })

    renderPayPage(invoice.id)

    // R785.00 (the invoice final total) must appear; R420 (estimatedTotal) must not drive payment.
    expect((await screen.findAllByText(/R\s?785[,.]00/)).length).toBeGreaterThan(0)
    expect(await screen.findByRole('button', { name: /pay r\s?785[,.]00 with apple pay/i })).toBeInTheDocument()
    expect(screen.queryByText(/R\s?420[,.]00/)).not.toBeInTheDocument()
  })

  it('does not render DriverTipSelector during invoice payment (tipping is post-delivery only)', async () => {
    const invoice = buildInvoice({ id: 'inv-tip-check', orderId: 'LD-TIP-CHECK' })
    upsertLoadInvoice(invoice)
    prependStoredOrder({
      id: 'LD-TIP-CHECK',
      customerId: mockCustomerProfile.id,
      status: 'AWAITING_PAYMENT',
      friendlyStatus: 'Awaiting payment',
      pickupWindow: { date: '2026-09-16', windowLabel: 'Today' },
      pickupAddress: mockCustomerProfile.addresses[0]!,
      deliveryAddress: mockCustomerProfile.addresses[0]!,
      deliveryWindow: { date: '2026-09-16', windowLabel: 'Today, 14:00 - 16:00' },
      services: [{ serviceId: 'ev-wash-dry-fold', quantity: 5, unitLabel: 'kg' }],
      estimatedTotal: 420,
      paymentStatus: 'PENDING',
      invoiceStatus: 'READY',
      invoiceId: invoice.id,
      finalInvoiceTotal: invoice.finalTotal,
      loyaltyPointsEarned: 0,
      promotionsApplied: [],
      internalNotes: [],
      canRepeat: false,
      fulfilmentType: 'DELIVERY',
    })

    renderPayPage(invoice.id)
    await screen.findByText('Pay your invoice')

    expect(screen.queryByText(/add a tip/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/driver tip/i)).not.toBeInTheDocument()
  })

  it('blocks online payment for STORE_COLLECTION and shows pay-at-store messaging', async () => {
    const invoice = buildInvoice({ id: 'inv-store-collection', orderId: 'LD-STORE-COLLECTION' })
    upsertLoadInvoice(invoice)
    prependStoredOrder({
      id: 'LD-STORE-COLLECTION',
      customerId: mockCustomerProfile.id,
      status: 'AWAITING_PAYMENT',
      friendlyStatus: 'Awaiting payment',
      pickupWindow: { date: '2026-09-16', windowLabel: 'Today' },
      pickupAddress: mockCustomerProfile.addresses[0]!,
      services: [{ serviceId: 'ev-wash-dry-fold', quantity: 5, unitLabel: 'kg' }],
      estimatedTotal: 420,
      paymentStatus: 'NOT_REQUIRED',
      invoiceStatus: 'READY',
      invoiceId: invoice.id,
      finalInvoiceTotal: invoice.finalTotal,
      loyaltyPointsEarned: 0,
      promotionsApplied: [],
      internalNotes: [],
      canRepeat: false,
      fulfilmentType: 'STORE_COLLECTION',
    })

    renderPayPage(invoice.id)

    expect(await screen.findByText('Pay at store')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /pay .* with apple pay/i })).not.toBeInTheDocument()
  })

  it('completes payment without any POS mutation and sets LOAD payment status to PAID', async () => {
    const user = userEvent.setup()
    const invoice = buildInvoice({ id: 'inv-success-check', orderId: 'LD-SUCCESS-CHECK' })
    upsertLoadInvoice(invoice)
    prependStoredOrder({
      id: 'LD-SUCCESS-CHECK',
      customerId: mockCustomerProfile.id,
      status: 'AWAITING_PAYMENT',
      friendlyStatus: 'Awaiting payment',
      pickupWindow: { date: '2026-09-16', windowLabel: 'Today' },
      pickupAddress: mockCustomerProfile.addresses[0]!,
      deliveryAddress: mockCustomerProfile.addresses[0]!,
      deliveryWindow: { date: '2026-09-16', windowLabel: 'Today, 14:00 - 16:00' },
      services: [{ serviceId: 'ev-wash-dry-fold', quantity: 5, unitLabel: 'kg' }],
      estimatedTotal: 420,
      paymentStatus: 'PENDING',
      invoiceStatus: 'READY',
      invoiceId: invoice.id,
      finalInvoiceTotal: invoice.finalTotal,
      loyaltyPointsEarned: 0,
      promotionsApplied: [],
      internalNotes: [],
      canRepeat: false,
      fulfilmentType: 'DELIVERY',
    })

    renderPayPage(invoice.id)

    const applePayButton = await screen.findByRole('button', { name: /pay .* with apple pay/i })
    await user.click(applePayButton)

    await waitFor(async () => {
      const updatedInvoice = await mockInvoiceService.getInvoice(invoice.id)
      expect(updatedInvoice.status).toBe('PAID')
      expect(updatedInvoice.paymentStatus).toBe('CONFIRMED')
    }, { timeout: 3000 })

    await waitFor(() => {
      const order = getStoredOrder('LD-SUCCESS-CHECK')
      expect(order?.paymentStatus).toBe('CONFIRMED')
    }, { timeout: 3000 })

    // The PosReadService interface has no mutation method — there is nothing
    // to spy on for "no POS write" beyond the read-only contract test, but we
    // additionally assert LOAD's own invoice/order state reflects PAID.
    expect(await screen.findByText('Payment complete!')).toBeInTheDocument()
  })
})
