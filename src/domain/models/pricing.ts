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
  freeDeliveryThreshold: number
  freeDeliveryGap: number
  lineItems: PricingQuoteItem[]
}
