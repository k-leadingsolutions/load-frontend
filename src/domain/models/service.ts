export type PricingModel =
  | 'PER_BASKET'
  | 'PER_KILOGRAM'
  | 'PER_ITEM'
  | 'FIXED_SERVICE'
  | 'QUOTE_REQUIRED'

/** @deprecated Use PricingModel. Kept for backward compat. */
export type ServicePricingMode = 'PAY_PER_BASKET' | 'PAY_PER_ITEM' | 'ADD_ON' | 'DELIVERY' | 'PROMOTION'

export interface ServiceCategory {
  id: string
  name: string
  description: string
  accent: string
  isFeatured: boolean
}

export interface CatalogService {
  id: string
  categoryId: string
  name: string
  shortDescription: string
  turnaroundLabel: string
  pricingMode: ServicePricingMode
  pricingModel?: PricingModel
  basePrice: number
  unitLabel: string
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
