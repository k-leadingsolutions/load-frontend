/**
 * Backend DTO shapes — mirror `com.load.backend.*.dto.*` records exactly.
 * Kept separate from the frontend's own domain types (`src/domain/models`);
 * adapters translate between the two at the smallest possible boundary.
 */

export type BackendRole = 'CUSTOMER' | 'DRIVER' | 'OPERATIONS' | 'ADMIN'

export interface AuthResponseDto {
  token: string
  email: string
  role: BackendRole
}

export interface CustomerProfileResponseDto {
  userId: string
  firstName: string
  lastName: string
  mobileNumber: string
  email: string
}

export interface AddressResponseDto {
  id: string
  label: string
  line1: string
  line2: string | null
  suburb: string
  city: string
  postalCode: string
}

export type BackendOrderStatus =
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

export type BackendFulfilmentType = 'DELIVERY' | 'STORE_COLLECTION'
export type BackendPaymentStatus = 'NOT_REQUIRED' | 'PENDING' | 'CONFIRMED' | 'FAILED' | 'REFUNDED'
export type BackendInvoiceStatus = 'NOT_AVAILABLE' | 'READY'

export interface ServiceSelectionDto {
  serviceId: string
  quantity: number
  unitLabel: string
}

export interface OrderResponseDto {
  id: string
  status: BackendOrderStatus
  fulfilmentType: BackendFulfilmentType
  pickupAddressId: string
  pickupWindowDate: string
  pickupWindowLabel: string
  deliveryAddressId: string | null
  deliveryWindowDate: string | null
  deliveryWindowLabel: string | null
  services: ServiceSelectionDto[]
  estimatedTotal: number
  paymentStatus: BackendPaymentStatus
  invoiceStatus: BackendInvoiceStatus
  finalInvoiceTotal: number | null
  receivedAtStore: boolean
  intakeWeightKg: number | null
  intakeNotes: string[]
  quantityReviewStatus: 'PENDING' | 'CONFIRMED' | 'ADJUSTED'
  internalNotes: string[]
}

export interface CreateOrderRequestDto {
  fulfilmentType: BackendFulfilmentType
  pickupAddressId: string
  pickupWindowDate: string
  pickupWindowLabel: string
  deliveryAddressId?: string
  deliveryWindowDate?: string
  deliveryWindowLabel?: string
  services: ServiceSelectionDto[]
  estimatedTotal: number
}

export type BackendStopType = 'PICKUP' | 'DELIVERY'
export type BackendStopStatus =
  | 'ASSIGNED'
  | 'EN_ROUTE'
  | 'ARRIVED'
  | 'VERIFIED'
  | 'COLLECTED'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'FAILED'
  | 'RESCHEDULE_REQUESTED'
export type BackendVerificationMethod = 'OTP' | 'QR'
export type BackendVerificationStatus = 'AWAITING' | 'VERIFIED' | 'INVALID'
export type BackendRescheduleReason =
  | 'CUSTOMER_UNAVAILABLE'
  | 'CUSTOMER_REQUESTED_NEW_TIME'
  | 'INCORRECT_ADDRESS'
  | 'ACCESS_ISSUE'
  | 'PAYMENT_UNRESOLVED'
  | 'OPERATIONAL_DELAY'
  | 'OTHER'

export interface AssignmentResponseDto {
  id: string
  driverId: string
  orderId: string
  stopIndex: number
  stopType: BackendStopType
  stopStatus: BackendStopStatus
  verificationMethod: BackendVerificationMethod | null
  verificationStatus: BackendVerificationStatus | null
  failureReason: BackendRescheduleReason | null
  failureNote: string | null
  rescheduleReason: BackendRescheduleReason | null
  rescheduleNote: string | null
  operationsDecision: 'APPROVED' | 'REJECTED' | null
}

export interface PaymentResponseDto {
  id: string
  orderId: string
  amount: number
  status: 'CONFIRMED' | 'FAILED' | 'REFUNDED'
}

export interface DashboardMetricResponseDto {
  id: string
  label: string
  value: string
  changeLabel: string
}
