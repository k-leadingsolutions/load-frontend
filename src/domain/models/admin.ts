import type { OrderStatus } from '@/domain/models/order'
import type { RescheduleReason, StopStatus } from '@/domain/models/route'
import type { VerificationMethod, VerificationStatus } from '@/domain/models/verification'

export interface DashboardMetric {
  id: string
  label: string
  value: string
  changeLabel: string
}

export interface DeliveryZone {
  id: string
  active: boolean
  fee: number
  freeDeliveryThreshold: number
  name: string
}

export interface DriverAssignment {
  id: string
  /** 1-based sequence within the driver's ordered stop list for the day. */
  stopIndex: number
  /** Driver-scoped ID. Kept distinct from a future driver session ID to support multiple drivers later. */
  driverId: string
  area: string
  customerInstructions?: string
  customerName: string
  driverName: string
  /** Reuses the existing RescheduleReason taxonomy rather than inventing a new failure taxonomy. */
  failureReason?: RescheduleReason
  failureNote?: string
  addressLine: string
  suburb?: string
  distanceKm?: number
  etaMinutes?: number
  orderId: string
  proofOfDelivery?: string
  scheduledWindow: string
  stopStatus: StopStatus
  stopType: 'PICKUP' | 'DELIVERY'
  verificationMethod?: VerificationMethod
  verificationStatus?: VerificationStatus
  rescheduleReason?: RescheduleReason
  rescheduleNote?: string
}

export interface ManagedUser {
  detail: string
  id: string
  name: string
  role: 'ADMIN' | 'CUSTOMER' | 'DRIVER' | 'EMPLOYEE'
  status: 'ACTIVE' | 'INVITED' | 'OFF_SHIFT'
}

export interface ProductionOrder {
  authorisedAdjustmentAllowed: boolean
  id: string
  internalNotes: string[]
  itemsSummary: string[]
  quantityReviewStatus: 'PENDING' | 'CONFIRMED' | 'ADJUSTED'
  receivedAtStore: boolean
  customerName: string
  suburb: string
  status: OrderStatus
  stageLabel: string
  qualityCheckPending: boolean
}
