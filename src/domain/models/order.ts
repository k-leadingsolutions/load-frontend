import type { Address } from '@/domain/models/customer'

export type OrderStatus =
  | 'BOOKING_RECEIVED'
  | 'PICKUP_SCHEDULED'
  | 'DRIVER_ASSIGNED'
  | 'DRIVER_EN_ROUTE'
  | 'COLLECTED'
  | 'RECEIVED_AT_STORE'
  | 'SORTING'
  | 'WASHING'
  | 'DRYING'
  | 'IRONING'
  | 'QUALITY_CHECK'
  | 'PACKING'
  | 'READY_FOR_DISPATCH'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED'

export interface OrderStatusTimelineEntry {
  status: OrderStatus
  label: string
  customerLabel: string
  description: string
  stage: 'BOOKING' | 'PICKUP' | 'PRODUCTION' | 'DELIVERY' | 'CLOSED'
}

export interface OrderServiceSelection {
  serviceId: string
  quantity: number
  unitLabel: string
}

export interface PickupDeliveryWindow {
  date: string
  windowLabel: string
}

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
  loyaltyPointsEarned: number
  promotionsApplied: string[]
  internalNotes: string[]
  canRepeat: boolean
}
