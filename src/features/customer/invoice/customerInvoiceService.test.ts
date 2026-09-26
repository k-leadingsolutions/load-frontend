import { vi } from 'vitest'

vi.mock('@/services/api/invoiceService', () => ({
  apiInvoiceService: {
    getInvoice: vi.fn(),
  },
}))

import type { Invoice, LaundryOrder } from '@/domain/models'
import { getCustomerInvoiceState } from '@/features/customer/invoice/customerInvoiceService'
import { apiInvoiceService } from '@/services/api/invoiceService'

const mockGetInvoice = vi.mocked(apiInvoiceService.getInvoice)

const baseOrder = (overrides: Partial<LaundryOrder> = {}): LaundryOrder => ({
  id: 'LD-TEST-001',
  customerId: 'cust-test-001',
  status: 'BOOKING_RECEIVED',
  friendlyStatus: 'Booking received',
  pickupWindow: { date: '2026-09-16', windowLabel: 'Today, 09:00 - 11:00' },
  pickupAddress: {
    id: 'addr-1',
    label: 'Home',
    line1: '1 Test Street',
    suburb: 'Testville',
    city: 'Testcity',
    province: 'Gauteng',
    postalCode: '0001',
    isDefault: true,
  },
  services: [{ serviceId: 'ev-wash-dry-fold', quantity: 5, unitLabel: 'kg' }],
  estimatedTotal: 420,
  paymentStatus: 'NOT_REQUIRED',
  invoiceStatus: 'NOT_AVAILABLE',
  loyaltyPointsEarned: 0,
  promotionsApplied: [],
  internalNotes: [],
  canRepeat: false,
  fulfilmentType: 'DELIVERY',
  ...overrides,
})

const buildInvoice = (overrides: Partial<Invoice> = {}): Invoice => ({
  id: 'inv-LD-TEST-004',
  invoiceNumber: 'INV-LD-TEST-004',
  orderId: 'LD-TEST-004',
  customerId: 'cust-test-001',
  customerName: '',
  serviceLabel: 'Wash + Fold',
  lines: [],
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

describe('getCustomerInvoiceState — real backend Order/invoice data only', () => {
  beforeEach(() => {
    mockGetInvoice.mockReset()
  })

  it('returns NOT_AVAILABLE without calling the invoice service when the order invoice is not yet READY', async () => {
    const order = baseOrder({ id: 'LD-TEST-002' })

    const state = await getCustomerInvoiceState(order)
    expect(state.kind).toBe('NOT_AVAILABLE')
    expect(mockGetInvoice).not.toHaveBeenCalled()
  })

  it('returns NOT_AVAILABLE when invoiceStatus is READY but invoiceId is missing (never fabricated)', async () => {
    const order = baseOrder({ id: 'LD-TEST-003', invoiceStatus: 'READY' })

    const state = await getCustomerInvoiceState(order)
    expect(state.kind).toBe('NOT_AVAILABLE')
    expect(mockGetInvoice).not.toHaveBeenCalled()
  })

  it('propagates a failure to retrieve the invoice — the order object itself is untouched', async () => {
    const order = baseOrder({ id: 'LD-TEST-003B', invoiceStatus: 'READY', invoiceId: 'inv-LD-TEST-003B' })
    mockGetInvoice.mockRejectedValueOnce(new Error('Unable to retrieve invoice.'))

    await expect(getCustomerInvoiceState(order)).rejects.toThrow()
    expect(order.invoiceStatus).toBe('READY')
    expect(order.id).toBe('LD-TEST-003B')
  })

  it('resolves to READY with the backend-sourced invoice once invoiceStatus is READY', async () => {
    const order = baseOrder({
      id: 'LD-TEST-004',
      invoiceStatus: 'READY',
      invoiceId: 'inv-LD-TEST-004',
      finalInvoiceTotal: 300,
    })
    mockGetInvoice.mockResolvedValueOnce(buildInvoice())

    const state = await getCustomerInvoiceState(order)
    expect(state.kind).toBe('READY')
    if (state.kind === 'READY') {
      expect(state.invoice.finalTotal).toBe(300)
      expect(state.order.invoiceStatus).toBe('READY')
      expect(state.order.invoiceId).toBe('inv-LD-TEST-004')
    }
    expect(mockGetInvoice).toHaveBeenCalledWith('inv-LD-TEST-004')
  })

  it('never uses estimatedTotal as the invoice final total — the amount originates from the backend Invoice', async () => {
    const order = baseOrder({
      id: 'LD-TEST-005',
      estimatedTotal: 420,
      invoiceStatus: 'READY',
      invoiceId: 'inv-LD-TEST-005',
    })
    mockGetInvoice.mockResolvedValueOnce(
      buildInvoice({ id: 'inv-LD-TEST-005', orderId: 'LD-TEST-005', finalTotal: 785, subtotal: 785 }),
    )

    const state = await getCustomerInvoiceState(order)
    expect(state.kind).toBe('READY')
    if (state.kind === 'READY') {
      expect(state.invoice.finalTotal).toBe(785)
      expect(state.invoice.finalTotal).not.toBe(order.estimatedTotal)
    }
  })

  it('passes through the backend-computed paymentStatus for STORE_COLLECTION orders once invoiced', async () => {
    const order = baseOrder({
      id: 'LD-TEST-006',
      fulfilmentType: 'STORE_COLLECTION',
      invoiceStatus: 'READY',
      invoiceId: 'inv-LD-TEST-006',
      paymentStatus: 'NOT_REQUIRED',
    })
    mockGetInvoice.mockResolvedValueOnce(
      buildInvoice({
        id: 'inv-LD-TEST-006',
        orderId: 'LD-TEST-006',
        finalTotal: 250,
        subtotal: 250,
        paymentStatus: 'NOT_REQUIRED',
      }),
    )

    const state = await getCustomerInvoiceState(order)
    expect(state.kind).toBe('READY')
    if (state.kind === 'READY') {
      expect(state.order.paymentStatus).toBe('NOT_REQUIRED')
      expect(state.order.deliveryAddress).toBeUndefined()
    }
  })
})
