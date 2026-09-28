import type { PricingQuote } from '@/domain/models/pricing'
import { formatCurrency } from '@/utils/format'

/**
 * Single source of truth for how a `PricingQuote` is presented to the
 * Customer as a headline estimate — on New Order, Review, and the
 * post-booking confirmation screen alike.
 *
 * - `EMPTY` — nothing selected yet (or no quote available).
 * - `EXACT` — every selected item has a fully known, final price. The
 *   headline is a plain total ("R X").
 * - `FROM` — at least one selected item is only known as a "from" starting
 *   price (ASSESSMENT_REQUIRED with a real base price), but nothing is
 *   priced by weight or fully unknown. The headline is prefixed ("from R X")
 *   to signal the total is a floor, not a final figure.
 * - `UNRESOLVED` — at least one selected item is priced per-kg (weight not
 *   yet known) and/or is a true QUOTE_REQUIRED item (price entirely
 *   unknown). The headline never fabricates a laundry total out of these —
 *   it shows the sum of everything that genuinely IS calculable (known/from
 *   items + delivery/express, exactly like `FROM`) suffixed with a plain
 *   statement that further pricing is still outstanding.
 */
export type CustomerEstimateKind = 'EMPTY' | 'EXACT' | 'FROM' | 'UNRESOLVED'

export interface CustomerEstimatePresentation {
  kind: CustomerEstimateKind
  /**
   * The customer-facing headline string. Never fabricates a per-kg total
   * without an actual weight, and never presents a partial known subtotal
   * (e.g. the delivery fee alone) as if it were the complete estimate.
   */
  headline: string
  /** The numeric total backing `headline`, when one exists (undefined for `EMPTY`). */
  calculableTotal?: number
  hasWeightBasedItems: boolean
  hasQuoteOnlyItems: boolean
  hasFromItems: boolean
  /** True only when every selected item has a fully known, final price. */
  isFullyKnown: boolean
}

const EMPTY_HEADLINE = 'Select services to see your estimate'

const emptyPresentation = (
  hasWeightBasedItems: boolean,
  hasQuoteOnlyItems: boolean,
  hasFromItems: boolean,
): CustomerEstimatePresentation => ({
  kind: 'EMPTY',
  headline: EMPTY_HEADLINE,
  hasWeightBasedItems,
  hasQuoteOnlyItems,
  hasFromItems,
  isFullyKnown: false,
})

/**
 * Derives the single customer-facing estimate presentation from a
 * `PricingQuote`. This is the ONLY place that should decide how the
 * headline estimate reads — every renderer (New Order summary, Review, and
 * confirmation) must go through this function rather than reading
 * `quote.estimatedTotal` directly, so the semantics stay centrally
 * consistent.
 *
 * This never touches `finalInvoiceTotal`/`Invoice.finalTotal` — those remain
 * the entirely separate, authoritative post-processing totals.
 */
export const buildCustomerEstimatePresentation = (
  quote: PricingQuote | null | undefined,
): CustomerEstimatePresentation => {
  if (!quote) {
    return emptyPresentation(false, false, false)
  }

  const weightBasedItems = quote.weightBasedItems ?? []
  const assessmentItems = quote.assessmentItems ?? []
  const hasWeightBasedItems = weightBasedItems.length > 0
  const hasQuoteOnlyItems = assessmentItems.some((item) => item.isQuoteOnly)
  const hasFromItems = assessmentItems.some((item) => !item.isQuoteOnly)
  const hasExactItems = (quote.knownEstimatedSubtotal ?? quote.subtotal) > 0

  if (!hasExactItems && !hasFromItems && !hasWeightBasedItems && !hasQuoteOnlyItems) {
    return emptyPresentation(hasWeightBasedItems, hasQuoteOnlyItems, hasFromItems)
  }

  // Includes exactly the components that are genuinely calculable right now:
  // fully-known items, "from" starting prices, and delivery/express fees
  // (which are always calculable from the known subtotal). Per-kg and
  // quote-only items are deliberately excluded — their price is not yet known.
  const calculableTotal = quote.estimatedTotal

  if (hasWeightBasedItems || hasQuoteOnlyItems) {
    const reasons: string[] = []
    if (hasWeightBasedItems) reasons.push('weight-based services')
    if (hasQuoteOnlyItems) reasons.push('custom quote pricing')

    return {
      kind: 'UNRESOLVED',
      headline: `from ${formatCurrency(calculableTotal)} + ${reasons.join(' and ')}`,
      calculableTotal,
      hasWeightBasedItems,
      hasQuoteOnlyItems,
      hasFromItems,
      isFullyKnown: false,
    }
  }

  if (hasFromItems) {
    return {
      kind: 'FROM',
      headline: `from ${formatCurrency(calculableTotal)}`,
      calculableTotal,
      hasWeightBasedItems,
      hasQuoteOnlyItems,
      hasFromItems,
      isFullyKnown: false,
    }
  }

  return {
    kind: 'EXACT',
    headline: formatCurrency(calculableTotal),
    calculableTotal,
    hasWeightBasedItems,
    hasQuoteOnlyItems,
    hasFromItems,
    isFullyKnown: true,
  }
}
