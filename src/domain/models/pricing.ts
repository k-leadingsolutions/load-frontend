import type { PaymentStatus } from '@/domain/models/order'

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
  /** Included when service is PER_KILOGRAM – estimate only */
  estimatedWeightKg?: number
  weightDisclaimer?: string
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
