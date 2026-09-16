import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/app/providers/useAuth'
import type { LaundryOrder } from '@/domain/models'
import { getCustomerInvoiceState } from '@/features/customer/invoice/customerInvoiceService'

/**
 * React Query wrapper around `getCustomerInvoiceState`. Customer pages should
 * use this hook rather than calling the POS boundary directly. A failure to
 * retrieve the invoice never invalidates or removes the order — the caller
 * only sees `isError` and can offer a Retry (`refetch`).
 */
export const useCustomerInvoiceState = (order: LaundryOrder | undefined) => {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['customer-invoice-state', order?.id, order?.invoiceStatus, order?.invoiceId],
    queryFn: async () => {
      const state = await getCustomerInvoiceState(
        order!,
        user ? `${user.firstName} ${user.lastName}`.trim() : 'Customer',
      )
      if (state.kind === 'READY') {
        // The order record may have been updated (invoiceStatus/paymentStatus)
        // as a side effect of retrieval — keep dependent order queries fresh.
        queryClient.invalidateQueries({ queryKey: ['customer-orders'] })
      }
      return state
    },
    enabled: Boolean(order?.id),
    retry: false,
  })

  return query
}
