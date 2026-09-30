import type { Address } from '@/domain/models/customer'
import type { EstimateLine } from '@/domain/models/pricing'

/**
 * Single shared domain calculation for LOAD's distance-tiered delivery fee
 * and free-delivery progress. This is the ONLY place delivery-fee/threshold
 * business rules live — `buildQuote` (mock quote engine) and any UI that
 * renders "free delivery progress" must both read from here rather than
 * re-deriving their own numbers.
 *
 * Business rules (authoritative):
 *  - 1–5.00 km   → R49 standard fee, free delivery when qualifying basket ≥ R300
 *  - >5.00–10.00 km → R79 standard fee, free delivery when qualifying basket ≥ R600
 *  - >10.00 km   → R99 standard fee, NO free-delivery threshold is defined —
 *    a threshold must never be invented for this tier.
 */

export type DeliveryDistanceTier = 'NEAR_1_TO_5KM' | 'MID_OVER_5_TO_10KM' | 'FAR_OVER_10KM'

export interface DeliveryPricingInput {
  /** Resolved distance, in kilometres, between the LOAD store and the Customer's address. */
  distanceKm: number
  /**
   * Total value of qualifying laundry-service lines only (see
   * `calculateQualifyingBasketValue`). Must NEVER include the delivery fee
   * itself — the delivery fee cannot contribute toward unlocking free
   * delivery.
   */
  qualifyingBasketValue: number
}

export interface DeliveryPricingResult {
  distanceKm: number
  tier: DeliveryDistanceTier
  /** The fee that would apply if free delivery has not been unlocked. */
  standardDeliveryFee: number
  qualifyingBasketValue: number
  /** Undefined for the >10km tier — no threshold is defined there. */
  freeDeliveryThreshold?: number
  /** `max(threshold - qualifyingBasketValue, 0)`. Undefined when there is no threshold for this tier. */
  remainingForFreeDelivery?: number
  /** `min(qualifyingBasketValue / threshold, 1)` expressed as 0–100. Undefined when there is no threshold for this tier. */
  progressPercentage?: number
  freeDeliveryUnlocked: boolean
  /** `freeDeliveryUnlocked ? 0 : standardDeliveryFee`. */
  effectiveDeliveryFee: number
}

/**
 * Discriminated union representing the delivery-pricing state for a quote.
 * This is the ONLY shape that should ever reach a renderer — it exists
 * specifically so "delivery pricing is unknown" can never be mistaken for
 * "delivery is free" (a real, previously-shipped defect: a missing/unknown
 * distance silently fell back to a `0` fee that rendered as "FREE").
 *
 *  - `NOT_APPLICABLE` — STORE_COLLECTION: there is no return-delivery leg at
 *    all, so there is genuinely no delivery fee (distinct from "free").
 *  - `PENDING_DISTANCE` — DELIVERY fulfilment, but the distance to the
 *    selected address is not yet resolved (e.g. no real geocoding/routing
 *    integration exists for this address yet). The fee is UNKNOWN — never
 *    render a numeric amount, "FREE", or free-delivery progress for this
 *    state.
 *  - `PRICED` — DELIVERY fulfilment with a resolved distance: carries the
 *    full `DeliveryPricingResult` (fee, tier, free-delivery
 *    threshold/progress when applicable).
 */
export type DeliveryPricingState =
  | { status: 'NOT_APPLICABLE' }
  | { status: 'PENDING_DISTANCE' }
  | ({ status: 'PRICED' } & DeliveryPricingResult)

interface TierDefinition {
  tier: DeliveryDistanceTier
  standardDeliveryFee: number
  freeDeliveryThreshold?: number
}

const resolveTier = (distanceKm: number): TierDefinition => {
  if (distanceKm <= 5) {
    return { tier: 'NEAR_1_TO_5KM', standardDeliveryFee: 49, freeDeliveryThreshold: 300 }
  }

  if (distanceKm <= 10) {
    return { tier: 'MID_OVER_5_TO_10KM', standardDeliveryFee: 79, freeDeliveryThreshold: 600 }
  }

  // >10km — no free-delivery threshold is currently defined. Do not invent one.
  return { tier: 'FAR_OVER_10KM', standardDeliveryFee: 99 }
}

/**
 * Pure, independently-testable delivery-pricing calculation.
 *
 * @example
 * calculateDeliveryPricing({ distanceKm: 4, qualifyingBasketValue: 60 })
 * // => { standardDeliveryFee: 49, freeDeliveryThreshold: 300, remainingForFreeDelivery: 240, progressPercentage: 20, ... }
 */
export const calculateDeliveryPricing = ({
  distanceKm,
  qualifyingBasketValue,
}: DeliveryPricingInput): DeliveryPricingResult => {
  const { tier, standardDeliveryFee, freeDeliveryThreshold } = resolveTier(distanceKm)

  if (freeDeliveryThreshold === undefined) {
    return {
      distanceKm,
      tier,
      standardDeliveryFee,
      qualifyingBasketValue,
      freeDeliveryUnlocked: false,
      effectiveDeliveryFee: standardDeliveryFee,
    }
  }

  const freeDeliveryUnlocked = qualifyingBasketValue >= freeDeliveryThreshold
  const remainingForFreeDelivery = Math.max(freeDeliveryThreshold - qualifyingBasketValue, 0)
  const progressPercentage = Math.min((qualifyingBasketValue / freeDeliveryThreshold) * 100, 100)

  return {
    distanceKm,
    tier,
    standardDeliveryFee,
    qualifyingBasketValue,
    freeDeliveryThreshold,
    remainingForFreeDelivery,
    progressPercentage,
    freeDeliveryUnlocked,
    effectiveDeliveryFee: freeDeliveryUnlocked ? 0 : standardDeliveryFee,
  }
}

/**
 * Sums the qualifying laundry-basket value used to evaluate free-delivery
 * thresholds, from the same `EstimateLine[]` the Customer-facing estimate
 * presentation reads (`buildCustomerEstimatePresentation`). Uses pricing
 * model/domain metadata only — never service names or categories — and
 * never fabricates a weight or a final price:
 *
 *  - PER_ITEM / FIXED_SERVICE / PER_BASKET / ADD_ON — real `lineTotal`.
 *  - PER_KILOGRAM — the displayed catalogue rate (`ratePerKg`) as a
 *    provisional contribution, NOT multiplied by an unknown weight.
 *  - ASSESSMENT_REQUIRED with a genuine numeric `startingPrice` — that
 *    starting price, provisionally (not treated as the confirmed final price).
 *  - QUOTE_REQUIRED / true quote-only lines (`isQuoteOnly`) — contribute 0.
 *
 * The delivery fee itself is never part of `serviceLines`, so it can never
 * contribute here.
 */
export const calculateQualifyingBasketValue = (serviceLines: EstimateLine[]): number =>
  serviceLines.reduce((sum, line) => {
    if (line.isQuoteOnly) {
      return sum
    }

    if (line.pricingModel === 'PER_KILOGRAM') {
      return sum + (line.ratePerKg ?? 0)
    }

    if (line.pricingModel === 'ASSESSMENT_REQUIRED' || line.pricingModel === 'QUOTE_REQUIRED') {
      return sum + (line.startingPrice ?? 0)
    }

    // PER_ITEM / FIXED_SERVICE / PER_BASKET / ADD_ON
    return sum + (line.lineTotal ?? 0)
  }, 0)

/**
 * Single authoritative decision for which `DeliveryPricingState` a quote is
 * in. Callers (currently only the mock quote engine) must go through this
 * rather than re-deriving the NOT_APPLICABLE / PENDING_DISTANCE / PRICED
 * decision themselves, so there is exactly one place that can ever decide
 * "delivery is free" versus "delivery pricing is not yet known".
 */
export const resolveDeliveryPricingState = ({
  fulfilmentType,
  distanceKm,
  qualifyingBasketValue,
}: {
  fulfilmentType: 'DELIVERY' | 'STORE_COLLECTION' | undefined
  distanceKm: number | undefined
  qualifyingBasketValue: number
}): DeliveryPricingState => {
  if (fulfilmentType === 'STORE_COLLECTION') {
    return { status: 'NOT_APPLICABLE' }
  }

  if (distanceKm === undefined) {
    return { status: 'PENDING_DISTANCE' }
  }

  return { status: 'PRICED', ...calculateDeliveryPricing({ distanceKm, qualifyingBasketValue }) }
}

/**
 * Distance-resolution integration boundary.
 *
 * IMPORTANT — there is currently no real geocoding/routing capability
 * anywhere in this codebase (frontend or backend): `Address` carries no
 * lat/lng, the backend `Address` entity has no distance/geocoding field,
 * and no routing/mapping integration exists. This function is the seam a
 * real distance/routing service must be wired into.
 *
 * Until that exists, it reads an explicit `distanceKm` carried on the
 * Address record itself (demo/seed data only in `services/mock/data.ts`) —
 * it deliberately does NOT infer a distance from suburb/city/postcode text,
 * does NOT assume 0km/"everyone is nearby", and does NOT invent a
 * third-party integration. Returns `undefined` when no distance is known,
 * in which case callers must treat delivery pricing as not yet resolvable
 * rather than fabricating a tier.
 */
export const resolveDeliveryDistanceKm = (address: Address | undefined | null): number | undefined =>
  address?.distanceKm

/**
 * Single shared rendering decision for the Customer-facing delivery-fee
 * line/progress, derived only from `DeliveryPricingState`. Components must
 * render this rather than independently branching on `deliveryFee === 0` or
 * `!deliveryPricing` — those checks cannot distinguish "free" from "unknown"
 * and are exactly how the previous defect (an unresolved distance silently
 * rendering as "FREE") was introduced.
 */
export interface DeliveryFeePresentation {
  /** Customer-facing text for the delivery-fee line itself. */
  feeText: string
  /** True when the fee text represents a not-yet-known amount (never a numeric value or "FREE"). */
  isPending: boolean
  /** Free-delivery progress to render, or `null` when no threshold applies (NOT_APPLICABLE / PENDING_DISTANCE / >10km). */
  freeDeliveryProgress: {
    remainingText: string
    progressPercentage: number
    unlocked: boolean
  } | null
}

export const presentDeliveryPricing = (
  state: DeliveryPricingState,
  formatCurrency: (amount: number) => string,
): DeliveryFeePresentation => {
  if (state.status === 'NOT_APPLICABLE') {
    return { feeText: 'Not applicable', isPending: false, freeDeliveryProgress: null }
  }

  if (state.status === 'PENDING_DISTANCE') {
    return {
      feeText: 'Delivery fee calculated from your address',
      isPending: true,
      freeDeliveryProgress: null,
    }
  }

  const feeText = state.effectiveDeliveryFee > 0 ? formatCurrency(state.effectiveDeliveryFee) : 'FREE'
  const freeDeliveryProgress = state.freeDeliveryThreshold === undefined
    ? null
    : {
        remainingText: state.freeDeliveryUnlocked
          ? 'Free delivery unlocked'
          : `${formatCurrency(state.remainingForFreeDelivery ?? 0)} to go`,
        progressPercentage: Math.min(state.progressPercentage ?? 0, 100),
        unlocked: state.freeDeliveryUnlocked,
      }

  return { feeText, isPending: false, freeDeliveryProgress }
}
