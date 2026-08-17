export type DomainEventType =
  | 'DRIVER_ASSIGNED'
  | 'DRIVER_EN_ROUTE'
  | 'DRIVER_ARRIVED'
  | 'COLLECTION_VERIFIED'
  | 'LAUNDRY_WEIGHT_CAPTURED'
  | 'LAUNDRY_WEIGHT_CONFIRMED'
  | 'PRICE_RECALCULATED'
  | 'PAYMENT_REQUIRED'
  | 'PAYMENT_CONFIRMED'
  | 'ORDER_COLLECTED'
  | 'RECEIVED_AT_STORE'
  | 'PRODUCTION_STARTED'
  | 'QUALITY_ISSUE_FOUND'
  | 'PRICE_ADJUSTED'
  | 'READY_FOR_DISPATCH'
  | 'DELIVERY_SCHEDULED'
  | 'DELIVERY_RESCHEDULED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERY_COMPLETED'

export interface DomainEvent {
  id: string
  type: DomainEventType
  orderId: string
  occurredAt: string
  payload?: Record<string, unknown>
  /** Roles that have seen this event */
  acknowledgedBy?: Array<'CUSTOMER' | 'DRIVER' | 'OPERATIONS'>
}
