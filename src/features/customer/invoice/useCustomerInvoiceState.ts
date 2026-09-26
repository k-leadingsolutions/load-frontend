import { useQuery } from '@tanstack/react-query'
import type { LaundryOrder } from '@/domain/models'
import { getCustomerInvoiceState } from '@/features/customer/invoice/customerInvoiceService'

/**
 * React Query wrapper around `getCustomerInvoiceState`. Customer pages should
 * use this hook rather than calling the invoice service directly. A failure
 * to retrieve the invoice never invalidates or removes the order — the
 * caller only sees `isError` and can offer a Retry (`refetch`).
 */
export const useCustomerInvoiceState = (order: LaundryOrder | undefined) => {
  return useQuery({
    queryKey: ['customer-invoice-state', order?.id, order?.invoiceStatus, order?.invoiceId],
    queryFn: () => getCustomerInvoiceState(order!),
    enabled: Boolean(order?.id),
    retry: false,
  })
}
