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
  | 'INVOICE_READY'
  | 'ORDER_COLLECTED'
  | 'RECEIVED_AT_STORE'
  | 'PRODUCTION_STARTED'
  | 'QUALITY_ISSUE_FOUND'
  | 'READY_FOR_DISPATCH'
  | 'DELIVERY_SCHEDULED'
  | 'DELIVERY_RESCHEDULED'
  | 'RESCHEDULE_REVIEWED'
  | 'DRIVER_ATTEMPT_FAILED'
  | 'FAILED_ATTEMPT_RETRIED'
  | 'STORE_INTAKE_RECORDED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERY_COMPLETED'
  | 'STORE_COLLECTION_COMPLETED'

export interface DomainEvent {
  id: string
  type: DomainEventType
  orderId: string
  occurredAt: string
  payload?: Record<string, unknown>
  /** Roles that have seen this event */
  acknowledgedBy?: Array<'CUSTOMER' | 'DRIVER' | 'OPERATIONS'>
}
