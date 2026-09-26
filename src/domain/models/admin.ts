import type { FulfilmentType } from '@/domain/models/booking'
import type { InvoiceLifecycleStatus, OrderStatus, PaymentStatus } from '@/domain/models/order'
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
  /**
   * Operations retains final scheduling authority over a Driver's
   * RESCHEDULE_REQUESTED stop. Set once Operations has reviewed the request;
   * the stop itself returns to `ASSIGNED` either way so the Driver always has
   * a valid next action instead of being stuck in a request-only state.
   */
  operationsDecision?: 'APPROVED' | 'REJECTED'
  operationsDecisionNote?: string
  operationsDecisionAt?: string
}

export interface ManagedUser {
  detail: string
  id: string
  name: string
  role: 'ADMIN' | 'CUSTOMER' | 'DRIVER' | 'EMPLOYEE'
  status: 'ACTIVE' | 'INVITED' | 'OFF_SHIFT'
}

export interface ProductionOrder {
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
  /** How the completed order returns to the Customer. Mirrors `LaundryOrder.fulfilmentType`. */
  fulfilmentType?: FulfilmentType
  /** Driver-scoped ID. Kept optional/nullable so multi-driver assignment stays additive for later launches. */
  assignedDriverId?: string
  assignedDriverName?: string
  /**
   * Physically measured weight recorded during store intake, for operational
   * visibility only (e.g. sorting/production planning). This is NEVER used to
   * calculate or finalise the commercial invoice — final pricing remains
   * POS-owned and is only ever read back through the read-only POS boundary.
   */
  weightKg?: number
  /** Free-text intake/inspection notes captured at physical receipt, most recent first. */
  intakeNotes?: string[]
  /** Collection/delivery window labels, mirrored from the same backend order aggregate. */
  pickupWindowLabel?: string
  deliveryWindowLabel?: string
  /**
   * Read-only invoice/payment visibility sourced from the same backend order
   * aggregate Operations already reads (`GET /api/operations/orders/{id}`).
   * Never independently calculated by Operations — mirrors the Customer-side
   * projection exactly, so Operations never needs the Customer-ownership-scoped
   * `/api/customer/orders/{id}` endpoint to see this data.
   */
  invoiceStatus?: InvoiceLifecycleStatus
  paymentStatus?: PaymentStatus
  finalInvoiceTotal?: number
}
