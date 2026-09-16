import type { Invoice, LaundryOrder } from '@/domain/models'
import { mockDomainEventService, mockInvoiceService, upsertLoadInvoice, mockPosReadService } from '@/services/mock'
import { getStoredOrder, updateStoredOrder } from '@/services/mock/orderStore'
import { mapPosInvoiceToLoadInvoice } from '@/services/pos/posInvoiceMapper'

/**
 * LOAD-owned boundary responsible for obtaining the Customer-facing invoice
 * state for an order. Customer UI components must call this — never the
 * PosReadService directly — so raw POS vendor DTOs never spread through
 * Customer components:
 *
 *   Customer UI → getCustomerInvoiceState() → PosReadService → mapper → LOAD Invoice
 *
 * A POS retrieval failure never mutates or removes the LOAD booking; it is
 * surfaced to the caller as a rejected promise so the UI can show a
 * recoverable error state.
 */

export type CustomerInvoiceState =
  | { kind: 'NOT_AVAILABLE' }
  | { kind: 'READY'; invoice: Invoice; order: LaundryOrder }

const buildServiceLabel = (order: LaundryOrder): string =>
  order.services.length > 0
    ? order.services.map((service) => service.unitLabel).slice(0, 1).join(', ') || 'Laundry service'
    : 'Laundry service'

export const getCustomerInvoiceState = async (
  order: LaundryOrder,
  customerName: string,
): Promise<CustomerInvoiceState> => {
  // Already retrieved and cached by LOAD — read LOAD's own invoice record.
  if (order.invoiceStatus === 'READY' && order.invoiceId) {
    const invoice = await mockInvoiceService.getInvoice(order.invoiceId)
    return { kind: 'READY', invoice, order }
  }

  // Not yet retrieved — ask the read-only POS boundary. This may throw
  // (e.g. POS temporarily unavailable); callers should let that propagate.
  const vendorInvoice = await mockPosReadService.getInvoiceForOrder(order.id)

  if (!vendorInvoice) {
    return { kind: 'NOT_AVAILABLE' }
  }

  const invoice = mapPosInvoiceToLoadInvoice(vendorInvoice, {
    orderId: order.id,
    customerId: order.customerId,
    customerName,
    serviceLabel: buildServiceLabel(order),
  })

  upsertLoadInvoice(invoice)

  const paymentStatus = order.fulfilmentType === 'STORE_COLLECTION'
    ? 'NOT_REQUIRED'
    : invoice.paymentStatus === 'CONFIRMED' ? 'CONFIRMED' : 'PENDING'

  const updatedOrder = updateStoredOrder(order.id, (current) => ({
    ...current,
    invoiceStatus: 'READY',
    invoiceId: invoice.id,
    externalInvoiceId: invoice.invoiceNumber,
    finalInvoiceTotal: invoice.finalTotal,
    paymentStatus,
  })) ?? getStoredOrder(order.id) ?? order

  await mockDomainEventService.emit('INVOICE_READY', order.id, {
    invoiceId: invoice.id,
    finalTotal: invoice.finalTotal,
  })

  return { kind: 'READY', invoice, order: updatedOrder }
}
