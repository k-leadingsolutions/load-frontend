import type { PricingQuote } from '@/domain/models'
import { buildCustomerEstimatePresentation } from '@/domain/estimatePresentation'
import { formatCurrency, formatPoints } from '@/utils/format'

interface BookingSummaryCardProps {
  canSubmit: boolean
  isSubmitting: boolean
  onSubmit: () => void
  quote: PricingQuote | null
}

export const BookingSummaryCard = ({ canSubmit, isSubmitting, onSubmit, quote }: BookingSummaryCardProps) => {
  const deliveryPricing = quote?.deliveryPricing ?? null
  // Free-delivery progress only exists for tiers with a defined threshold
  // (1–5km / >5–10km). >10km has no threshold — never invent one — and
  // STORE_COLLECTION / not-yet-resolved distance have no `deliveryPricing`
  // at all, so no progress is shown either.
  const showFreeDeliveryProgress = deliveryPricing?.freeDeliveryThreshold !== undefined
  const estimate = buildCustomerEstimatePresentation(quote)

  return (
    <aside className="space-y-4 rounded-panel border border-load-100 bg-white p-5 shadow-panel">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-load-600">Estimate</p>
        <h2 className="mt-2 text-2xl font-semibold text-ink">
          {estimate.headline}
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Real-time pricing uses basket, item, add-on, promotion, delivery, and loyalty rules.
        </p>
      </div>

      {quote ? (
        <>
          <div className="space-y-3 rounded-3xl bg-load-50/60 p-4">
            {estimate.breakdown.map((line) => (
              <div key={line.id} className="flex items-center justify-between gap-3 text-sm text-slate-600">
                <span>{line.label}</span>
                <span className="font-semibold text-ink">{line.valueText}</span>
              </div>
            ))}
          </div>

          {showFreeDeliveryProgress && deliveryPricing ? (
            <div>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-slate-500">Free delivery progress</span>
                <span className="font-semibold text-load-700">
                  {deliveryPricing.freeDeliveryUnlocked
                    ? 'Free delivery unlocked'
                    : `${formatCurrency(deliveryPricing.remainingForFreeDelivery ?? 0)} to go`}
                </span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-load-100">
                <div
                  className="h-2 rounded-full bg-load-600"
                  style={{ width: `${Math.min(deliveryPricing.progressPercentage ?? 0, 100)}%` }}
                />
              </div>
            </div>
          ) : null}

          <div className="rounded-3xl border border-load-100 p-4 text-sm text-slate-600">
            <p>Loyalty preview: {formatPoints(quote.loyaltyPreviewPoints)}</p>
            {quote.loyaltyRedemptionTotal > 0 ? (
              <p className="mt-1 text-load-700">Rewards applied: {formatCurrency(quote.loyaltyRedemptionTotal)}</p>
            ) : null}
            {estimate.hasWeightBasedItems ? (
              <p className="mt-2 rounded-card border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                Final price based on actual weight after collection.
              </p>
            ) : null}
            {estimate.hasQuoteOnlyItems ? (
              <p className="mt-2 rounded-card border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                Final price confirmed after assessment.
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

