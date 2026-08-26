export type PaymentMethodType = 'APPLE_PAY' | 'CARD'

export type PaymentProcessingStatus =
  | 'NOT_REQUIRED'
  | 'PENDING'
  | 'PROCESSING'
  | 'AUTHORIZED'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'CANCELLED'

export type TipType = 'NONE' | 'PRESET' | 'CUSTOM'

export interface TipSelection {
  type: TipType
  amount: number
}

export interface CardPaymentDetails {
  cardholderName: string
  cardNumber: string
  expiryMonth: string
  expiryYear: string
  cvv: string
  saveCard: boolean
}

export interface PaymentSummary {
  servicesSubtotal: number
  addonsSubtotal: number
  expressFee: number
  deliveryFee: number
  promotionDiscount: number
  freeDeliveryDiscount: number
  loyaltyDiscount: number
  driverTip: number
  payableTotal: number
}

export interface PaymentResult {
  paymentId: string
  status: PaymentProcessingStatus
  amount: number
  paymentMethod: PaymentMethodType
  processedAt: string
  failureReason?: string
}

export interface CreatePaymentRequest {
  orderId: string
  amount: number
  paymentMethod: PaymentMethodType
  tip: TipSelection
}

export interface CardPaymentRequest extends CreatePaymentRequest {
  paymentMethod: 'CARD'
  cardDetails: CardPaymentDetails
}

export interface ApplePayPaymentRequest extends CreatePaymentRequest {
  paymentMethod: 'APPLE_PAY'
}
