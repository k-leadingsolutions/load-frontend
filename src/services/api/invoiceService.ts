import type { Invoice, InvoiceStatus, PaymentStatus } from '@/domain/models'
import { apiRequest } from '@/services/api/httpClient'
import type { OrderResponseDto } from '@/services/api/types'

const invoiceStatusToPaymentStatus = (status: OrderResponseDto['paymentStatus']): PaymentStatus =>
  status as PaymentStatus

/**
 * The backend only tracks `NOT_AVAILABLE` / `READY` for `invoiceStatus` — it
 * has no separate `DRAFT`/`ISSUED`/`PAID`/`ADJUSTED`/`VOID` concept. `READY`
 * projects to `PAID` once payment is confirmed, otherwise `ISSUED`. This
 * function is only ever called once `invoiceStatus === 'READY'` has already
 * been checked by the caller.
 */
const projectInvoiceStatus = (paymentStatus: PaymentStatus): InvoiceStatus =>
  paymentStatus === 'CONFIRMED' ? 'PAID' : 'ISSUED'

/**
 * Projects a backend `OrderResponse` into the frontend's rich `Invoice`
 * read model. The backend `Invoice` entity is 1:1 with `Order`, so
 * `invoiceId` and `orderId` are the same value; there is no separate
 * invoice-lookup-by-id endpoint. The final total is NEVER derived from
 * `estimatedTotal` — it only ever reflects the backend's own POS-sourced
 * `finalInvoiceTotal`, and only once `invoiceStatus === 'READY'`.
 */
const invoiceFromOrderDto = (dto: OrderResponseDto): Invoice => {
  if (dto.invoiceStatus !== 'READY' || dto.finalInvoiceTotal === null) {
    throw new Error(`Invoice for order ${dto.id} is not yet available.`)
  }

  const finalTotal = dto.finalInvoiceTotal

  return {
    id: dto.id,
    invoiceNumber: dto.id.slice(0, 8).toUpperCase(),
    orderId: dto.id,
    // Not exposed by the order endpoint — the caller (order/profile lookup)
    // is the source of truth for identity; left blank rather than fabricated.
    customerId: '',
    customerName: '',
    serviceLabel: dto.services.map((service) => service.serviceId).join(', '),
    lines: dto.services.map((service, index) => ({
      id: `line-${dto.id}-${index}`,
      description: `${service.quantity} x ${service.serviceId} (${service.unitLabel})`,
      quantity: service.quantity,
      unitPrice: 0,
      total: 0,
      lineType: 'SERVICE' as const,
    })),
    ...(dto.intakeWeightKg !== null ? { confirmedWeightKg: dto.intakeWeightKg } : {}),
    pickupFee: 0,
    deliveryFee: 0,
    subtotal: finalTotal,
    adjustmentTotal: 0,
    discountTotal: 0,
    loyaltyRedemptionTotal: 0,
    taxTotal: 0,
    finalTotal,
    status: projectInvoiceStatus(invoiceStatusToPaymentStatus(dto.paymentStatus)),
    paymentStatus: invoiceStatusToPaymentStatus(dto.paymentStatus),
    posSyncStatus: 'SYNCED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

/**
 * Real, POS-read-only invoice projection. `invoiceId` is always treated as
 * the backend order id (see 1:1 mapping above). `applyAdjustment` is
 * intentionally unsupported: LOAD must never write to POS or override the
 * commercial invoice total (see `operations pos boundary` convention).
 */
export const apiInvoiceService = {
  getInvoice: async (invoiceId: string): Promise<Invoice> => {
    const dto = await apiRequest<OrderResponseDto>(`/api/customer/orders/${invoiceId}`, { realm: 'customer' })
    return invoiceFromOrderDto(dto)
  },

  listInvoicesForOrder: async (orderId: string): Promise<Invoice[]> => {
    try {
      const invoice = await apiInvoiceService.getInvoice(orderId)
      return [invoice]
    } catch {
      return []
    }
  },

  applyAdjustment: async (): Promise<Invoice> => {
    throw new Error('LOAD never writes to POS or overrides the commercial invoice total.')
  },

  /**
   * The backend confirms payment (and the invoice's payment status) as part
   * of `POST /api/customer/orders/{orderId}/payments`. This simply re-reads
   * the now-updated projection rather than performing any local mutation.
   */
  markPaid: async (invoiceId: string): Promise<Invoice> => apiInvoiceService.getInvoice(invoiceId),
}
