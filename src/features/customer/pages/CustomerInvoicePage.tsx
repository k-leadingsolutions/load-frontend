import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { appPaths, buildPath } from '@/app/router/paths'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { LoadingState } from '@/components/ui/LoadingState'
import { SectionCard } from '@/components/ui/SectionCard'
import { mockInvoiceService } from '@/services/mock'
import { formatCurrency } from '@/utils/format'

export const CustomerInvoicePage = () => {
  const { invoiceId } = useParams<{ invoiceId: string }>()
  const invoiceQuery = useQuery({
    queryKey: ['customer-invoice', invoiceId],
    queryFn: async () => {
      if (!invoiceId) {
        return null
      }

      return mockInvoiceService.getInvoice(invoiceId)
    },
    enabled: Boolean(invoiceId),
  })

  if (!invoiceId) {
    return <ErrorState title="Invoice unavailable" message="An invoice reference is required to load this page." />
  }

  if (invoiceQuery.isLoading) {
    return <LoadingState />
  }

  if (invoiceQuery.isError) {
    return <ErrorState title="Unable to load invoice" message={invoiceQuery.error instanceof Error ? invoiceQuery.error.message : 'Unknown error'} />
  }

  const invoice = invoiceQuery.data

  if (!invoice) {
    return <EmptyState title="Invoice not found" description="We could not find an invoice for this order." />
  }

  const paymentPending = invoice.paymentStatus !== 'CONFIRMED' && invoice.status !== 'PAID'

  return (
    <div className="space-y-6">
      <SectionCard
        title={`Invoice ${invoice.invoiceNumber}`}
        description="Confirmed weight, line items, and payment state for your LOAD order."
        action={(
          <Link to={appPaths.customerOrders} className="rounded-full border border-load-200 px-4 py-2 text-sm font-semibold text-load-700 transition hover:bg-load-50">
            Back to orders
          </Link>
        )}
      >
        <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
          <div className="space-y-3 text-sm text-slate-600">
            <p><span className="font-semibold text-ink">Order:</span> #{invoice.orderId}</p>
            <p><span className="font-semibold text-ink">Customer:</span> {invoice.customerName}</p>
            <p><span className="font-semibold text-ink">Service:</span> {invoice.serviceLabel}</p>
            <p><span className="font-semibold text-ink">Invoice status:</span> {invoice.status.replaceAll('_', ' ')}</p>
            <p><span className="font-semibold text-ink">Payment:</span> {invoice.paymentStatus.replaceAll('_', ' ')}</p>
            {invoice.confirmedWeightKg ? (
              <p><span className="font-semibold text-ink">Confirmed weight:</span> {invoice.confirmedWeightKg.toFixed(1)} kg</p>
            ) : null}
            {invoice.unitPricePerKg ? (
              <p><span className="font-semibold text-ink">Rate:</span> {formatCurrency(invoice.unitPricePerKg)} / kg</p>
            ) : null}
          </div>
          <div className="rounded-3xl bg-load-50 px-6 py-5 text-right">
            <p className="text-sm text-load-700">Final total</p>
            <p className="mt-2 text-3xl font-semibold text-ink">{formatCurrency(invoice.finalTotal)}</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Invoice line items" description="Weight-based charges, delivery fees, and adjustments are shown below.">
        <ul className="divide-y divide-load-100">
          {invoice.lines.map((line) => (
            <li key={line.id} className="flex items-start justify-between gap-4 py-4">
              <div>
                <p className="font-semibold text-ink">{line.description}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {line.quantity} × {formatCurrency(line.unitPrice)} · {line.lineType.replaceAll('_', ' ')}
                </p>
              </div>
              <p className="text-sm font-semibold text-ink">{formatCurrency(line.total)}</p>
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard title="Totals" description="A clear breakdown for collection, pricing, and invoicing.">
        <dl className="space-y-3 text-sm text-slate-600">
          <div className="flex items-center justify-between gap-3">
            <dt>Subtotal</dt>
            <dd className="font-semibold text-ink">{formatCurrency(invoice.subtotal)}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt>Adjustments</dt>
            <dd className="font-semibold text-ink">{formatCurrency(invoice.adjustmentTotal)}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt>Discounts</dt>
            <dd className="font-semibold text-ink">-{formatCurrency(invoice.discountTotal)}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt>Loyalty redemption</dt>
            <dd className="font-semibold text-ink">-{formatCurrency(invoice.loyaltyRedemptionTotal)}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt>Delivery fee</dt>
            <dd className="font-semibold text-ink">{formatCurrency(invoice.deliveryFee)}</dd>
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-load-100 pt-3">
            <dt className="font-semibold text-ink">Total due</dt>
            <dd className="text-lg font-semibold text-ink">{formatCurrency(invoice.finalTotal)}</dd>
          </div>
        </dl>

        {paymentPending ? (
          <Link
            to={buildPath.customerInvoicePay(invoice.id)}
            className="mt-6 inline-flex rounded-full bg-load-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-load-700"
          >
            Pay now →
          </Link>
        ) : (
          <p className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            Payment confirmed. Your order will continue through the LOAD workflow.
          </p>
        )}
      </SectionCard>
    </div>
  )
}
