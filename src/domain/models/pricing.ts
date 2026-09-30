import type { PaymentStatus } from '@/domain/models/order'
import type { DeliveryPricingState } from '@/domain/deliveryPricing'

// ─── Pricing model enum ───────────────────────────────────────────────────────

export type PricingModel =
  | 'PER_BASKET'
  | 'PER_KILOGRAM'
  | 'PER_ITEM'
  | 'FIXED_SERVICE'
  | 'ASSESSMENT_REQUIRED'
  | 'QUOTE_REQUIRED'

/** @deprecated Use PricingModel instead */
export type ServicePricingMode = 'PAY_PER_BASKET' | 'PAY_PER_ITEM' | 'ADD_ON' | 'DELIVERY' | 'PROMOTION'

export interface Promotion {
  code: string
  name: string
  description: string
  discountType: 'PERCENTAGE' | 'FIXED' | 'FREE_DELIVERY'
  value: number
  minimumOrderAmount?: number
  firstOrderOnly?: boolean
}

export interface LoyaltyRule {
  id: string
  description: string
  earnRate: number
  redemptionValue: number
}

export interface PricingQuoteItem {
  id: string
  label: string
  pricingType: 'SERVICE' | 'ADD_ON' | 'DELIVERY' | 'DISCOUNT'
  quantity: number
  unitPrice: number
  totalPrice: number
}

/**
 * Discriminates how a single selected catalogue line's price is known (or
 * not yet known). Mirrors `PricingModel` from the catalogue, plus `ADD_ON`
 * for selected add-ons (which always carry a single fixed unit price).
 */
export type EstimateLinePricingModel =
  | 'PER_ITEM'
  | 'FIXED_SERVICE'
  | 'PER_BASKET'
  | 'PER_KILOGRAM'
  | 'ASSESSMENT_REQUIRED'
  | 'QUOTE_REQUIRED'
  | 'ADD_ON'

/**
 * One selected catalogue service or add-on, tagged with its real catalogue
 * pricing model so the estimate presentation layer can render it honestly
 * without ever fabricating a weight or a total that isn't yet knowable.
 *
 * Exactly one `EstimateLine` exists per selected service/add-on (in original
 * selection order) — never zero, never duplicated.
 */
export interface EstimateLine {
  id: string
  label: string
  pricingModel: EstimateLinePricingModel
  unitLabel: string
  quantity: number
  /** Known unit price. Present for every model except a true QUOTE_REQUIRED item with no starting price. */
  unitPrice?: number
  /** Calculable line total (unitPrice × quantity) — only for PER_ITEM / FIXED_SERVICE / PER_BASKET / ADD_ON. */
  lineTotal?: number
  /** PER_KILOGRAM only — known rate; weight is not yet known so there is deliberately no `lineTotal`. */
  ratePerKg?: number
  minimumCharge?: number
  /** ASSESSMENT_REQUIRED with a real starting price — a "from" floor, not a final price. */
  startingPrice?: number
  /** True for QUOTE_REQUIRED / assessment items with no numeric floor at all. */
  isQuoteOnly?: boolean
}

export interface PricingQuote {
  basketPlan?: {
    basketSizeId: string
    quantity: number
  }
  itemisedServices: Array<{
    serviceId: string
    quantity: number
  }>
  addOns: Array<{
    addOnId: string
    quantity: number
  }>
  deliveryFee: number
  expressFee: number
  promotions: Promotion[]
  subtotal: number
  discountTotal: number
  loyaltyRedemptionTotal: number
  estimatedTotal: number
  loyaltyPreviewPoints: number
  /**
   * @deprecated Read `deliveryPricing` instead (a `PRICED` state's
   * `freeDeliveryThreshold`) — this flat field cannot express the >10km
   * tier (no threshold at all) or the PENDING_DISTANCE state (delivery
   * pricing not yet known, which is NOT the same as "no threshold").
   * Kept only so any not-yet-migrated reader still compiles.
   */
  freeDeliveryThreshold?: number
  /** @deprecated Read `deliveryPricing` instead (a `PRICED` state's `remainingForFreeDelivery`). */
  freeDeliveryGap?: number
  /**
   * Distance-tiered delivery fee and free-delivery progress — the single
   * shared, authoritative calculation result (see `domain/deliveryPricing.ts`).
   * A discriminated union so "delivery pricing is not yet known" can never
   * be mistaken for "delivery is free":
   *
   *  - `{ status: 'NOT_APPLICABLE' }` — STORE_COLLECTION: no delivery leg,
   *    genuinely fee-free (distinct from free delivery having been earned).
   *  - `{ status: 'PENDING_DISTANCE' }` — DELIVERY fulfilment but the
   *    address's distance is not yet resolved. The fee is UNKNOWN — never
   *    render a numeric amount, "FREE", or free-delivery progress.
   *  - `{ status: 'PRICED', ... }` — DELIVERY fulfilment with a resolved
   *    distance; carries the full `DeliveryPricingResult`.
   *
   * `deliveryFee` above is `PRICED` → `effectiveDeliveryFee`, else `0` —
   * kept for legacy numeric consumers, but `0` there must NEVER be read as
   * "free"; always branch on `deliveryPricing.status` for that decision.
   */
  deliveryPricing: DeliveryPricingState
  lineItems: PricingQuoteItem[]
  /** Included when service is PER_KILOGRAM – estimate only */
  estimatedWeightKg?: number
  /**
   * Every selected catalogue service and add-on, tagged with its true
   * pricing model, in original selection order. This is the single source
   * the Customer-facing estimate presentation layer (`buildCustomerEstimatePresentation`)
   * reads from — it must never fabricate a weight or a total for
   * PER_KILOGRAM/QUOTE_REQUIRED lines, and every selected line appears here
   * exactly once.
   */
  serviceLines: EstimateLine[]
}

// ─── Invoice ──────────────────────────────────────────────────────────────────

export interface InvoiceLine {
  id: string
  description: string
  quantity: number
  unitPrice: number
  total: number
  lineType: 'SERVICE' | 'ADD_ON' | 'PICKUP_FEE' | 'DELIVERY_FEE' | 'ADJUSTMENT' | 'DISCOUNT' | 'LOYALTY' | 'TAX'
}

export type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'AWAITING_PAYMENT' | 'PAID' | 'ADJUSTED' | 'VOID'
export type PosSyncStatus = 'NOT_SYNCED' | 'SYNCING' | 'SYNCED' | 'SYNC_FAILED'

export interface Invoice {
  id: string
  invoiceNumber: string
  orderId: string
  customerId: string
  customerName: string
  serviceLabel: string
  lines: InvoiceLine[]
  confirmedWeightKg?: number
  unitPricePerKg?: number
  pickupFee: number
  deliveryFee: number
  subtotal: number
  adjustmentTotal: number
  discountTotal: number
  loyaltyRedemptionTotal: number
  taxTotal: number
  finalTotal: number
  status: InvoiceStatus
  paymentStatus: PaymentStatus
  posSyncStatus: PosSyncStatus
  createdAt: string
  updatedAt: string
}
