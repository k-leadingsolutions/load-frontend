import type { EstimateLine, EstimateLinePricingModel, PricingQuote } from '@/domain/models/pricing'
import { formatCurrency } from '@/utils/format'

/**
 * Single source of truth for how a `PricingQuote` is presented to the
 * Customer as an itemised estimate — on New Order, Review, and the
 * post-booking confirmation screen alike.
 *
 * - `EMPTY` — nothing selected yet (or no quote available).
 * - `EXACT` — every selected item has a fully known, final price. The
 *   headline is a plain total ("R X").
 * - `FROM` — at least one selected item is only known as a "from" starting
 *   price (ASSESSMENT_REQUIRED with a real base price), and nothing is
 *   priced by weight or fully quote-only. The headline is prefixed
 *   ("from R X") to signal the total is a floor, not a final figure.
 * - `PENDING_WEIGHT` — at least one selected item is PER_KILOGRAM (weight not
 *   yet known). A numeric total is NEVER shown in this case — not even a
 *   "from" floor built from delivery/known charges alone — because doing so
 *   would misrepresent a delivery fee (or other known charge) as if it were
 *   the laundry price. The headline instead states pricing is pending on
 *   the actual weight.
 * - `PENDING_ASSESSMENT` — at least one selected item is true QUOTE_REQUIRED
 *   (no numeric floor at all) and nothing is priced by weight. If there is
 *   also a genuine known/"from" service contribution, that amount is shown
 *   as a "from" floor; otherwise (only delivery/express known) no numeric
 *   total is shown — it would otherwise misrepresent the delivery fee alone
 *   as the order estimate.
 */
export type CustomerEstimateKind = 'EMPTY' | 'EXACT' | 'FROM' | 'PENDING_WEIGHT' | 'PENDING_ASSESSMENT'

export type EstimateBreakdownLineKind = EstimateLinePricingModel | 'DELIVERY'

/**
 * One ready-to-render breakdown row — every selected catalogue service/add-on
 * appears exactly once (in original selection order), plus a synthesized
 * delivery row. `valueText` is fully formatted per that line's real pricing
 * model so renderers never need to hardcode a service name, price, or
 * pricing-model-specific format themselves.
 */
export interface EstimateBreakdownLine {
  id: string
  label: string
  pricingModel: EstimateBreakdownLineKind
  valueText: string
  /** True for PER_KILOGRAM / true QUOTE_REQUIRED lines — no calculable amount yet. */
  isPending: boolean
}

export interface CustomerEstimatePresentation {
  kind: CustomerEstimateKind
  /**
   * The customer-facing headline string for the total. Never fabricates a
   * per-kg total without an actual weight, and never presents a partial
   * known subtotal (e.g. the delivery fee alone) as if it were the complete
   * order estimate.
   */
  headline: string
  /** The label to pair with `headline`, e.g. "Estimated total" or "Estimate". */
  totalLabel: string
  /** The numeric total backing `headline`, when one exists (undefined otherwise). */
  calculableTotal?: number
  /** Itemised breakdown — one line per selected service/add-on, plus delivery. */
  breakdown: EstimateBreakdownLine[]
  hasWeightBasedItems: boolean
  hasQuoteOnlyItems: boolean
  hasFromItems: boolean
  /** True only when every selected item has a fully known, final price. */
  isFullyKnown: boolean
}

const EMPTY_HEADLINE = 'Select services to see your estimate'
const PENDING_WEIGHT_HEADLINE = 'Calculated after weighing'
const PENDING_ASSESSMENT_HEADLINE = 'Price confirmed after assessment'

const exactLineValueText = (unitPrice: number, quantity: number): string =>
  quantity > 1
    ? `${formatCurrency(unitPrice)} × ${quantity} = ${formatCurrency(unitPrice * quantity)}`
    : formatCurrency(unitPrice)

/** Formats a single selected catalogue service/add-on per its real pricing model. Never fabricates a weight or a total that isn't yet known. */
const formatServiceLineValue = (line: EstimateLine): { valueText: string; isPending: boolean } => {
  switch (line.pricingModel) {
    case 'PER_ITEM':
    case 'FIXED_SERVICE':
    case 'PER_BASKET':
    case 'ADD_ON':
      return { valueText: exactLineValueText(line.unitPrice ?? 0, line.quantity), isPending: false }
    case 'PER_KILOGRAM':
      return { valueText: `${formatCurrency(line.ratePerKg ?? 0)}/kg`, isPending: true }
    case 'ASSESSMENT_REQUIRED':
    case 'QUOTE_REQUIRED':
      return line.isQuoteOnly
        ? { valueText: 'Price confirmed after assessment', isPending: true }
        : { valueText: `From ${formatCurrency(line.startingPrice ?? 0)}`, isPending: false }
    default:
      return { valueText: formatCurrency(line.unitPrice ?? 0), isPending: false }
  }
}

const deliveryBreakdownLine = (deliveryFee: number): EstimateBreakdownLine => ({
  id: 'delivery',
  label: 'Delivery fee',
  pricingModel: 'DELIVERY',
  valueText: deliveryFee > 0 ? formatCurrency(deliveryFee) : 'FREE',
  isPending: false,
})

const emptyPresentation = (): CustomerEstimatePresentation => ({
  kind: 'EMPTY',
  headline: EMPTY_HEADLINE,
  totalLabel: 'Estimated total',
  breakdown: [],
  hasWeightBasedItems: false,
  hasQuoteOnlyItems: false,
  hasFromItems: false,
  isFullyKnown: false,
})

/**
 * Derives the single customer-facing estimate presentation from a
 * `PricingQuote`. This is the ONLY place that should decide how the
 * itemised estimate and its headline total read — every renderer (New
 * Order summary, Review, and confirmation) must go through this function
 * rather than reading `quote.estimatedTotal`/`quote.lineItems` directly, so
 * the semantics stay centrally consistent and every selected service is
 * guaranteed to appear exactly once.
 *
 * This never touches `finalInvoiceTotal`/`Invoice.finalTotal` — those remain
 * the entirely separate, authoritative post-processing totals.
 */
export const buildCustomerEstimatePresentation = (
  quote: PricingQuote | null | undefined,
): CustomerEstimatePresentation => {
  if (!quote) {
    return emptyPresentation()
  }

  const serviceLines = quote.serviceLines ?? []
  const hasWeightBasedItems = serviceLines.some((line) => line.pricingModel === 'PER_KILOGRAM')
  const hasQuoteOnlyItems = serviceLines.some(
    (line) => (line.pricingModel === 'ASSESSMENT_REQUIRED' || line.pricingModel === 'QUOTE_REQUIRED') && line.isQuoteOnly,
  )
  const hasFromItems = serviceLines.some(
    (line) => (line.pricingModel === 'ASSESSMENT_REQUIRED' || line.pricingModel === 'QUOTE_REQUIRED') && !line.isQuoteOnly,
  )
  const hasExactItems = serviceLines.some(
    (line) => line.pricingModel === 'PER_ITEM' || line.pricingModel === 'FIXED_SERVICE' || line.pricingModel === 'PER_BASKET' || line.pricingModel === 'ADD_ON',
  )

  if (serviceLines.length === 0) {
    return emptyPresentation()
  }

  const breakdown: EstimateBreakdownLine[] = [
    ...serviceLines.map((line) => {
      const { valueText, isPending } = formatServiceLineValue(line)
      return {
        id: line.id,
        label: line.label,
        pricingModel: line.pricingModel,
        valueText,
        isPending,
      }
    }),
    deliveryBreakdownLine(quote.deliveryFee),
  ]

  // Includes exactly the components that are genuinely calculable right now:
  // fully-known items, "from" starting prices, and delivery/express fees
  // (which are always calculable from the known subtotal). Per-kg and
  // quote-only items are deliberately excluded from this number — their
  // price is not yet known.
  const calculableTotal = quote.estimatedTotal

  // A per-kg selection means NO numeric total may be headlined at all — not
  // even a "from" floor built purely from delivery/known charges — because
  // that would misrepresent a delivery fee as if it were the laundry price.
  if (hasWeightBasedItems) {
    return {
      kind: 'PENDING_WEIGHT',
      headline: PENDING_WEIGHT_HEADLINE,
      totalLabel: 'Estimated total',
      breakdown,
      hasWeightBasedItems,
      hasQuoteOnlyItems,
      hasFromItems,
      isFullyKnown: false,
    }
  }

  if (hasQuoteOnlyItems) {
    // Only show a numeric "from" floor when there is a genuine known/"from"
    // service contribution beyond delivery/express — otherwise the known
    // charges (e.g. delivery alone) would misleadingly stand in for the
    // entire order estimate.
    if (hasExactItems || hasFromItems) {
      return {
        kind: 'PENDING_ASSESSMENT',
        headline: `from ${formatCurrency(calculableTotal)}`,
        totalLabel: 'Estimated total',
        calculableTotal,
        breakdown,
        hasWeightBasedItems,
        hasQuoteOnlyItems,
        hasFromItems,
        isFullyKnown: false,
      }
    }

    return {
      kind: 'PENDING_ASSESSMENT',
      headline: PENDING_ASSESSMENT_HEADLINE,
      totalLabel: 'Estimated total',
      breakdown,
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
      totalLabel: 'Estimated total',
      calculableTotal,
      breakdown,
      hasWeightBasedItems,
      hasQuoteOnlyItems,
      hasFromItems,
      isFullyKnown: false,
    }
  }

  return {
    kind: 'EXACT',
    headline: formatCurrency(calculableTotal),
    totalLabel: 'Estimated total',
    calculableTotal,
    breakdown,
    hasWeightBasedItems,
    hasQuoteOnlyItems,
    hasFromItems,
    isFullyKnown: true,
  }
}
