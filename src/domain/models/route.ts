export type StopStatus =
  | 'PENDING'
  | 'EN_ROUTE'
  | 'ARRIVED'
  | 'VERIFIED'
  | 'COMPLETED'
  | 'FAILED'
  | 'RESCHEDULED'

export interface RouteStop {
  id: string
  stopIndex: number
  orderId: string
  customerName: string
  addressLine: string
  suburb: string
  stopType: 'PICKUP' | 'DELIVERY'
  stopStatus: StopStatus
  distanceKm: number
  etaMinutes: number
  scheduledWindow: string
  customerInstructions?: string
  customerNotes?: string
  stopLabel?: string
}

export interface Route {
  id: string
  driverId: string
  driverName: string
  date: string
  totalStops: number
  totalOrders: number
  totalDistanceKm: number
  stops: RouteStop[]
  onTimePercent: number
  rating?: number
}

export type RescheduleReason =
  | 'CUSTOMER_UNAVAILABLE'
  | 'CUSTOMER_REQUESTED_NEW_TIME'
  | 'INCORRECT_ADDRESS'
  | 'ACCESS_ISSUE'
  | 'PAYMENT_UNRESOLVED'
  | 'OPERATIONAL_DELAY'
  | 'OTHER'

export const RESCHEDULE_REASON_LABELS: Record<RescheduleReason, string> = {
  CUSTOMER_UNAVAILABLE:      'Customer unavailable',
  CUSTOMER_REQUESTED_NEW_TIME: 'Customer requested new time',
  INCORRECT_ADDRESS:         'Incorrect address',
  ACCESS_ISSUE:              'Access issue',
  PAYMENT_UNRESOLVED:        'Payment unresolved',
  OPERATIONAL_DELAY:         'Operational delay',
  OTHER:                     'Other',
}
