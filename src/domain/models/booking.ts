// ─── Customer laundry order-draft models ──────────────────────────────────────
//
// These types describe the in-progress Customer laundry order before it is
// placed. They are intentionally separate from `LaundryOrder` (the persisted,
// backend-facing order) and from the LOAD Coffee cart (`CoffeeCartLine`),
// which has its own product/modifier shape.

/**
 * How the completed order returns to the Customer. LOAD always collects the
 * first leg from the Customer — this only describes the second leg.
 */
export type FulfilmentType = 'DELIVERY' | 'STORE_COLLECTION'

/** A single selected catalogue service inside the draft, with its quantity semantics. */
export interface DraftServiceSelection {
  serviceId: string
  /**
   * For PER_ITEM / FIXED_SERVICE this is a real repeat-unit count.
   * For PER_KILOGRAM / ASSESSMENT_REQUIRED / QUOTE_REQUIRED this is always 1
   * and means "the Customer requested this service" — it is NEVER a declared
   * weight or an authoritative price.
   */
  quantity: number
}

export interface DraftAddOnSelection {
  addOnId: string
  quantity: number
}

/** Known-vs-unknown breakdown of the booking estimate — see PricingQuote for the source fields. */
export interface BookingEstimateSummary {
  /** Sum of contributions that are precisely known (PER_ITEM / FIXED_SERVICE / add-ons). */
  knownEstimatedSubtotal: number
  /** Selected services priced per kilogram — rate is known, final weight is not. */
  weightBasedItems: Array<{
    serviceId: string
    label: string
    ratePerKg: number
    minimumCharge?: number
  }>
  /** Selected services requiring physical assessment or a custom quote. */
  assessmentItems: Array<{
    serviceId: string
    label: string
    startingPrice: number
    isQuoteOnly: boolean
  }>
}

/**
 * Client-side Customer laundry order draft. Lives in `CustomerOrderDraftContext`
 * and persists in-memory across navigation between the category catalogue and
 * the booking stepper, but is not intended to survive a full page reload.
 */
export interface CustomerOrderDraft {
  serviceSelections: DraftServiceSelection[]
  addOnSelections: DraftAddOnSelection[]
  fulfilmentType: FulfilmentType
  pickupAddressId: string
  deliveryAddressId: string
  pickupWindow: string
  deliveryWindow: string
  customerInstructions: string
  expressRequested: boolean
}
