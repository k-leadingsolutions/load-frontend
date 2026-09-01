import type { PricingQuote } from '@/domain/models'
import { formatCurrency, formatPoints } from '@/utils/format'

interface BookingSummaryCardProps {
  canSubmit: boolean
  isSubmitting: boolean
  onSubmit: () => void
  quote: PricingQuote | null
}

export const BookingSummaryCard = ({ canSubmit, isSubmitting, onSubmit, quote }: BookingSummaryCardProps) => {
  const deliveryProgress = quote
    ? Math.min(100, (quote.subtotal / quote.freeDeliveryThreshold) * 100)
    : 0

  return (
    <aside className="space-y-4 rounded-panel border border-load-100 bg-white p-5 shadow-panel">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-load-600">Estimate</p>
        <h2 className="mt-2 text-2xl font-semibold text-ink">
          {quote ? formatCurrency(quote.estimatedTotal) : 'Select services'}
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Real-time pricing uses basket, item, add-on, promotion, delivery, and loyalty rules.
        </p>
      </div>

      {quote ? (
        <>
          <div className="space-y-3 rounded-3xl bg-load-50/60 p-4">
            {quote.lineItems
              .filter((item) => item.totalPrice !== 0)
              .map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 text-sm text-slate-600">
                  <span>
                    {item.label} × {item.quantity}
                  </span>
                  <span className="font-semibold text-ink">{formatCurrency(item.totalPrice)}</span>
                </div>
              ))}
          </div>

          <div>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-slate-500">Free delivery progress</span>
              <span className="font-semibold text-load-700">
                {quote.freeDeliveryGap > 0
                  ? `${formatCurrency(quote.freeDeliveryGap)} to go`
                  : 'Free delivery unlocked'}
              </span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-load-100">
              <div className="h-2 rounded-full bg-load-600" style={{ width: `${deliveryProgress}%` }} />
            </div>
          </div>

          <div className="rounded-3xl border border-load-100 p-4 text-sm text-slate-600">
            <p>Loyalty preview: {formatPoints(quote.loyaltyPreviewPoints)}</p>
            {quote.loyaltyRedemptionTotal > 0 ? (
              <p className="mt-1 text-load-700">Rewards applied: {formatCurrency(quote.loyaltyRedemptionTotal)}</p>
            ) : null}
            {quote.estimatedWeightKg ? (
              <p className="mt-2 rounded-card border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                {quote.weightDisclaimer}
              </p>
            ) : null}
          </div>
        </>
      ) : null}

      <button
        type="button"
        onClick={onSubmit}
        disabled={!canSubmit || isSubmitting}
        className="w-full rounded-full bg-load-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-load-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? 'Placing order...' : 'Place order'}
      </button>
    </aside>
  )
}
