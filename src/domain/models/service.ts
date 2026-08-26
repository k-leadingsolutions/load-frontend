export type PricingModel =
  | 'PER_BASKET'
  | 'PER_KILOGRAM'
  | 'PER_ITEM'
  | 'FIXED_SERVICE'
  | 'ASSESSMENT_REQUIRED'
  | 'QUOTE_REQUIRED'

/** @deprecated Use PricingModel. Kept for backward compat. */
export type ServicePricingMode = 'PAY_PER_BASKET' | 'PAY_PER_ITEM' | 'ADD_ON' | 'DELIVERY' | 'PROMOTION'

export interface ServiceCategory {
  id: string
  name: string
  description: string
  /** Short marketing tagline used on discovery cards */
  tagline: string
  /** Formatted starting price shown on the category card, e.g. "from R45/kg" */
  startingPriceLabel: string
  accent: string
  /** Emoji or icon token used on the category discovery card */
  icon: string
  isFeatured: boolean
}

export interface CatalogService {
  id: string
  categoryId: string
  /** Optional sub-grouping within a category, e.g. "Cleaning" vs "Repair & Restoration" */
  subCategoryLabel?: string
  name: string
  shortDescription: string
  turnaroundLabel: string
  /** @deprecated Use pricingModel */
  pricingMode: ServicePricingMode
  pricingModel: PricingModel
  /** Base price in ZAR cents-or-rands (stored as Rand, e.g. 45 = R45) */
  basePrice: number
  unitLabel: string
  /** When true, basePrice is a starting / from price, not a fixed charge */
  isStartingPrice: boolean
  /** Minimum service charge applied to this service, e.g. R120 for Everyday Laundry */
  minimumCharge?: number
  /** Whether this service is included in LOAD Pass allowance */
  loadPassEligible: boolean
  featured: boolean
  icon?: string
}

export interface AddOnOption {
  id: string
  name: string
  description: string
  price: number
  suggestionTag?: string
}

export interface BasketSize {
  id: string
  name: string
  capacityLabel: string
  price: number
  recommendedFor: string
}
