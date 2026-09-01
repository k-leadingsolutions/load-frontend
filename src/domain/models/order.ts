import type { Address } from '@/domain/models/customer'

// ─── Core status enum ─────────────────────────────────────────────────────────

export type OrderStatus =
  | 'BOOKING_RECEIVED'
  | 'PICKUP_SCHEDULED'
  | 'DRIVER_ASSIGNED'
  | 'DRIVER_EN_ROUTE'
  | 'DRIVER_ARRIVED'
  | 'COLLECTION_VERIFIED'
  | 'COLLECTED'
  | 'WEIGHT_CONFIRMED'
  | 'AWAITING_PAYMENT'
  | 'PAYMENT_CONFIRMED'
  | 'RECEIVED_AT_STORE'
  | 'SORTING'
  | 'WASHING'
  | 'DRYING'
  | 'IRONING'
  | 'QUALITY_CHECK'
  | 'PACKING'
  | 'READY_FOR_DISPATCH'
  | 'DELIVERY_SCHEDULED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'RESCHEDULED'
  | 'CANCELLED'

// ─── Timeline ─────────────────────────────────────────────────────────────────

export interface OrderStatusTimelineEntry {
  status: OrderStatus
  label: string
  customerLabel: string
  description: string
  stage: 'BOOKING' | 'PICKUP' | 'PRODUCTION' | 'DELIVERY' | 'CLOSED'
}

// ─── Order items ──────────────────────────────────────────────────────────────

export interface OrderServiceSelection {
  serviceId: string
  quantity: number
  unitLabel: string
}

export interface PickupDeliveryWindow {
  date: string
  windowLabel: string
}

// ─── Payment ──────────────────────────────────────────────────────────────────

export type PaymentStatus =
  | 'NOT_REQUIRED'
  | 'PENDING'
  | 'AWAITING_CUSTOMER'
  | 'CONFIRMED'
  | 'FAILED'
  | 'REFUNDED'

// ─── Main order model ─────────────────────────────────────────────────────────

export interface LaundryOrder {
  id: string
  customerId: string
  status: OrderStatus
  friendlyStatus: string
  pickupWindow: PickupDeliveryWindow
  deliveryWindow: PickupDeliveryWindow
  pickupAddress: Address
  deliveryAddress: Address
  services: OrderServiceSelection[]
  estimatedTotal: number
  confirmedTotal?: number
  confirmedWeightKg?: number
  paymentStatus: PaymentStatus
  invoiceId?: string
  loyaltyPointsEarned: number
  promotionsApplied: string[]
  internalNotes: string[]
  canRepeat: boolean
}

export interface DriverRating {
  orderId: string
  rating: 1 | 2 | 3 | 4 | 5
  comment?: string
  tipAmount: number
  submittedAt: string
}

// ─── Order status history ─────────────────────────────────────────────────────

export interface OrderStatusHistoryEntry {
  status: OrderStatus
  occurredAt: string
  note?: string
}
