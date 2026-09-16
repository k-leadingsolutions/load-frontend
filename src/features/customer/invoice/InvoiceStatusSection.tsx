import { Link } from 'react-router-dom'
import { buildPath } from '@/app/router/paths'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import type { LaundryOrder } from '@/domain/models'
import { useCustomerInvoiceState } from '@/features/customer/invoice/useCustomerInvoiceState'
import { formatCurrency } from '@/utils/format'

/**
 * Progressive invoice/payment section for Customer order surfaces
 * (Order tracking card, order history cards, Customer Home).
 *
 * Renders exactly one of:
 *  A. Invoice pending          — no invoice yet, no Pay Now
 *  B. Invoice ready            — final total + View invoice
 *  C. DELIVERY / unpaid        — Pay now
 *  D. DELIVERY / paid          — Paid
 *  E. STORE_COLLECTION         — Pay at store (no Pay Now, ever)
 *
 * A POS/invoice retrieval failure never hides or breaks the rest of the
 * order surface — only this section degrades to a recoverable error state.
 */
export const InvoiceStatusSection = ({ order }: { order: LaundryOrder }) => {
  const invoiceQuery = useCustomerInvoiceState(order)

  if (invoiceQuery.isLoading) {
    return <p className="text-caption text-muted">Checking invoice status…</p>
  }

  if (invoiceQuery.isError) {
    return (
      <div className="space-y-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-caption text-amber-800">
        <p>We're unable to retrieve your invoice right now.</p>
        <p>Your LOAD booking is unaffected.</p>
        <Button variant="outline" size="sm" onClick={() => invoiceQuery.refetch()}>
          Retry
        </Button>
      </div>
    )
  }

  const state = invoiceQuery.data

  if (!state || state.kind === 'NOT_AVAILABLE') {
    return (
      <div className="space-y-1">
        <p className="text-body font-semibold text-ink">Invoice pending</p>
        <p className="text-caption text-muted">
          Your final invoice will be available after your items have been received and processed by LOAD.
        </p>
      </div>
    )
  }

  const { invoice, order: refreshedOrder } = state
  const isStoreCollection = refreshedOrder.fulfilmentType === 'STORE_COLLECTION'
  const isPaid = refreshedOrder.paymentStatus === 'CONFIRMED'

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-body font-semibold text-ink">Invoice ready</p>
          <p className="text-caption text-muted">{invoice.invoiceNumber}</p>
        </div>
        <p className="text-lg font-semibold text-ink">{formatCurrency(invoice.finalTotal)}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Link to={buildPath.customerInvoice(invoice.id)}>
          <Button variant="outline" size="sm">View Invoice</Button>
        </Link>

        {isStoreCollection ? (
          <p className="text-caption text-muted">
            You've chosen to collect your order from LOAD. Payment can be made at the store when you collect.
          </p>
        ) : isPaid ? (
          <Badge tone="success">Paid</Badge>
        ) : (
          <Link to={buildPath.customerInvoicePay(invoice.id)}>
            <Button size="sm">Pay Now</Button>
          </Link>
        )}
      </div>
    </div>
  )
}
