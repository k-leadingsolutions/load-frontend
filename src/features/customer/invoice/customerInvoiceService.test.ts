import type { LaundryOrder } from '@/domain/models'
import { getCustomerInvoiceState } from '@/features/customer/invoice/customerInvoiceService'
import { __setMockPosScenario, __resetMockPosScenarios } from '@/services/mock'
import { prependStoredOrder } from '@/services/mock/orderStore'

const baseOrder = (overrides: Partial<LaundryOrder> = {}): LaundryOrder => ({
  id: 'LD-TEST-001',
  customerId: 'cust-test-001',
  status: 'BOOKING_RECEIVED',
  friendlyStatus: 'Booking received',
  pickupWindow: { date: '2026-09-16', windowLabel: 'Today, 09:00 - 11:00' },
  pickupAddress: { id: 'addr-1', label: 'Home', line1: '1 Test Street', suburb: 'Testville', city: 'Testcity', province: 'Gauteng', postalCode: '0001', isDefault: true },
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

describe('getCustomerInvoiceState — booking independence from POS', () => {
  afterEach(() => {
    __resetMockPosScenarios()
  })

  it('renders a freshly confirmed booking with no externalPosOrderId, invoiceId, or finalInvoiceTotal', () => {
    const order = baseOrder()
    expect(order.externalPosOrderId).toBeUndefined()
    expect(order.invoiceId).toBeUndefined()
    expect(order.finalInvoiceTotal).toBeUndefined()
    expect(order.invoiceStatus).toBe('NOT_AVAILABLE')
  })

  it('returns NOT_AVAILABLE when the POS order has not yet been received (invoice pending)', async () => {
    const order = baseOrder({ id: 'LD-TEST-002' })
    __setMockPosScenario(order.id, { kind: 'NOT_RECEIVED' })

    const state = await getCustomerInvoiceState(order, 'Test Customer')
    expect(state.kind).toBe('NOT_AVAILABLE')
  })

  it('does not remove or break the LOAD booking when POS retrieval fails', async () => {
    const order = baseOrder({ id: 'LD-TEST-003' })
    __setMockPosScenario(order.id, { kind: 'UNAVAILABLE' })

    await expect(getCustomerInvoiceState(order, 'Test Customer')).rejects.toThrow()
    // The order object itself is untouched — no mutation occurs on failure.
    expect(order.invoiceStatus).toBe('NOT_AVAILABLE')
    expect(order.id).toBe('LD-TEST-003')
  })

  it('resolves to READY with the invoice once the POS invoice becomes available, and can retry after failure', async () => {
    const order = baseOrder({ id: 'LD-TEST-004' })
    prependStoredOrder(order)

    __setMockPosScenario(order.id, { kind: 'UNAVAILABLE' })
    await expect(getCustomerInvoiceState(order, 'Test Customer')).rejects.toThrow()

    __setMockPosScenario(order.id, {
      kind: 'INVOICED',
      invoice: {
        vendorInvoiceId: 'POS-INV-TEST-004',
        vendorOrderId: 'POS-ORD-TEST-004',
        loadOrderRef: order.id,
        currency: 'ZAR',
        lines: [{ description: 'Wash + Fold', quantity: 1, unitAmount: 300, lineAmount: 300 }],
        totalAmountDue: 300,
        vendorStatus: 'FINAL',
        issuedAt: new Date().toISOString(),
      },
    })

    const state = await getCustomerInvoiceState(order, 'Test Customer')
    expect(state.kind).toBe('READY')
    if (state.kind === 'READY') {
      expect(state.invoice.finalTotal).toBe(300)
      expect(state.order.invoiceStatus).toBe('READY')
      expect(state.order.invoiceId).toBeTruthy()
    }
  })

  it('never uses estimatedTotal as the invoice final total — the invoice amount originates from the Invoice object', async () => {
    const order = baseOrder({ id: 'LD-TEST-005', estimatedTotal: 420 })
    prependStoredOrder(order)
    __setMockPosScenario(order.id, {
      kind: 'INVOICED',
      invoice: {
        vendorInvoiceId: 'POS-INV-TEST-005',
        vendorOrderId: 'POS-ORD-TEST-005',
        loadOrderRef: order.id,
        currency: 'ZAR',
        lines: [{ description: 'Wash + Fold', quantity: 1, unitAmount: 785, lineAmount: 785 }],
        totalAmountDue: 785,
        vendorStatus: 'FINAL',
        issuedAt: new Date().toISOString(),
      },
    })

    const state = await getCustomerInvoiceState(order, 'Test Customer')
    expect(state.kind).toBe('READY')
    if (state.kind === 'READY') {
      expect(state.invoice.finalTotal).toBe(785)
      expect(state.invoice.finalTotal).not.toBe(order.estimatedTotal)
    }
  })

  it('does not require online payment for STORE_COLLECTION once invoiced', async () => {
    const order = baseOrder({ id: 'LD-TEST-006', fulfilmentType: 'STORE_COLLECTION' })
    prependStoredOrder(order)
    __setMockPosScenario(order.id, {
      kind: 'INVOICED',
      invoice: {
        vendorInvoiceId: 'POS-INV-TEST-006',
        vendorOrderId: 'POS-ORD-TEST-006',
        loadOrderRef: order.id,
        currency: 'ZAR',
        lines: [{ description: 'Wash + Fold', quantity: 1, unitAmount: 250, lineAmount: 250 }],
        totalAmountDue: 250,
        vendorStatus: 'FINAL',
        issuedAt: new Date().toISOString(),
      },
    })

    const state = await getCustomerInvoiceState(order, 'Test Customer')
    expect(state.kind).toBe('READY')
    if (state.kind === 'READY') {
      expect(state.order.paymentStatus).toBe('NOT_REQUIRED')
      expect(state.order.deliveryAddress).toBeUndefined()
    }
  })
})
