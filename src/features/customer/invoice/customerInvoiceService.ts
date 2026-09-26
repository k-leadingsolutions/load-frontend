import type { Invoice, LaundryOrder } from '@/domain/models'
import { apiInvoiceService } from '@/services/api/invoiceService'

/**
 * LOAD-owned boundary responsible for obtaining the Customer-facing invoice
 * state for an order, sourced entirely from the real backend Order/invoice
 * projection (already POS-derived and mapped onto `LaundryOrder` by
 * `laundryOrderFromDto`/`apiCustomerOrderService`). Customer UI components
 * must call this — never a POS boundary directly.
 *
 * The invoice is only ever fetched once the order's own `invoiceStatus` is
 * `READY` — this state is never fabricated or refreshed from the Customer
 * side; only Operations may trigger a POS invoice refresh
 * (`apiOperationsService.refreshInvoice`).
 */

export type CustomerInvoiceState =
  | { kind: 'NOT_AVAILABLE' }
  | { kind: 'READY'; invoice: Invoice; order: LaundryOrder }

export const getCustomerInvoiceState = async (order: LaundryOrder): Promise<CustomerInvoiceState> => {
  if (order.invoiceStatus !== 'READY' || !order.invoiceId) {
    return { kind: 'NOT_AVAILABLE' }
  }

  const invoice = await apiInvoiceService.getInvoice(order.invoiceId)
  return { kind: 'READY', invoice, order }
}
