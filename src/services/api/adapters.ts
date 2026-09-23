import type { Address, DriverAssignment, LaundryOrder, ProductionOrder, VerificationMethod, VerificationStatus } from '@/domain/models'
import { getFriendlyOrderStatus, ORDER_STATUS_MODEL } from '@/domain/orderStatus'
import type {
  AddressResponseDto,
  AssignmentResponseDto,
  OrderResponseDto,
} from '@/services/api/types'

export const addressFromDto = (dto: AddressResponseDto, isDefault: boolean): Address => ({
  id: dto.id,
  label: dto.label,
  line1: dto.line1,
  suburb: dto.suburb,
  city: dto.city,
  // Not yet modelled server-side (backend schema gap) — left blank rather than fabricated.
  province: '',
  postalCode: dto.postalCode,
  isDefault,
})

/**
 * Maps a backend `OrderResponse` into the frontend's `LaundryOrder` read model.
 * `addressLookup` resolves pickup/delivery address ids to full `Address`
 * records the caller has already fetched (e.g. via the Customer's own
 * address list) — the backend order endpoint only returns address ids.
 */
export const laundryOrderFromDto = (
  dto: OrderResponseDto,
  customerId: string,
  addressLookup: Map<string, Address>,
): LaundryOrder => {
  const pickupAddress = addressLookup.get(dto.pickupAddressId)
  const deliveryAddress = dto.deliveryAddressId ? addressLookup.get(dto.deliveryAddressId) : undefined

  return {
    id: dto.id,
    customerId,
    status: dto.status,
    friendlyStatus: getFriendlyOrderStatus(dto.status),
    pickupWindow: { date: dto.pickupWindowDate, windowLabel: dto.pickupWindowLabel },
    ...(dto.deliveryWindowDate && dto.deliveryWindowLabel
      ? { deliveryWindow: { date: dto.deliveryWindowDate, windowLabel: dto.deliveryWindowLabel } }
      : {}),
    pickupAddress: pickupAddress ?? {
      id: dto.pickupAddressId,
      label: 'Pickup address',
      line1: '',
      suburb: '',
      city: '',
      province: '',
      postalCode: '',
    },
    ...(deliveryAddress ? { deliveryAddress } : {}),
    services: dto.services.map((service) => ({
      serviceId: service.serviceId,
      quantity: service.quantity,
      unitLabel: service.unitLabel,
    })),
    estimatedTotal: dto.estimatedTotal,
    ...(dto.intakeWeightKg !== null ? { confirmedWeightKg: dto.intakeWeightKg } : {}),
    paymentStatus: dto.paymentStatus,
    invoiceStatus: dto.invoiceStatus,
    // Never fabricated: only ever mirrors the backend's own READY invoice projection.
    ...(dto.invoiceStatus === 'READY' && dto.finalInvoiceTotal !== null
      ? { finalInvoiceTotal: dto.finalInvoiceTotal }
      : {}),
    // Deterministic 1:1 mapping — the backend persists one invoice projection per order.
    ...(dto.invoiceStatus === 'READY' ? { invoiceId: dto.id } : {}),
    loyaltyPointsEarned: 0,
    promotionsApplied: [],
    internalNotes: dto.intakeNotes,
    canRepeat: dto.status === 'COMPLETED',
    fulfilmentType: dto.fulfilmentType,
  }
}

const verificationMethodFromDto = (method: AssignmentResponseDto['verificationMethod']): VerificationMethod | undefined => {
  if (method === 'QR') {
    return 'QR_CODE'
  }
  return method ?? undefined
}

const verificationStatusFromDto = (status: AssignmentResponseDto['verificationStatus']): VerificationStatus | undefined =>
  status ?? undefined

/**
 * Maps a backend `AssignmentResponse` into the frontend's `DriverAssignment`
 * card model. The backend does not yet expose customer/address enrichment to
 * the Driver role (see integration report) — those cosmetic fields fall back
 * to honest placeholders derived from the real order id, never fabricated
 * business data.
 */
export const driverAssignmentFromDto = (dto: AssignmentResponseDto, driverId: string): DriverAssignment => {
  const verificationMethod = verificationMethodFromDto(dto.verificationMethod)
  const verificationStatus = verificationStatusFromDto(dto.verificationStatus)

  return {
    id: dto.id,
    stopIndex: dto.stopIndex,
    driverId,
    area: dto.stopType === 'PICKUP' ? 'Pickup' : 'Delivery',
    customerName: `Order ${dto.orderId.slice(0, 8)}`,
    driverName: '',
    ...(dto.failureReason ? { failureReason: dto.failureReason } : {}),
    ...(dto.failureNote ? { failureNote: dto.failureNote } : {}),
    addressLine: 'Address details available in the LOAD operations system',
    orderId: dto.orderId,
    scheduledWindow: '',
    stopStatus: dto.stopStatus,
    stopType: dto.stopType,
    ...(verificationMethod ? { verificationMethod } : {}),
    ...(verificationStatus ? { verificationStatus } : {}),
    ...(dto.rescheduleReason ? { rescheduleReason: dto.rescheduleReason } : {}),
    ...(dto.rescheduleNote ? { rescheduleNote: dto.rescheduleNote } : {}),
    ...(dto.operationsDecision ? { operationsDecision: dto.operationsDecision } : {}),
  }
}

/**
 * Maps a backend `OrderResponse` into the Operations `ProductionOrder` board
 * model. The backend does not yet expose customer name/address enrichment to
 * Operations (order-scoped only) — those cosmetic fields use honest
 * placeholders derived from the real order id, never fabricated data.
 * `quantityReviewStatus` defaults to `PENDING`: the backend has no quantity
 * review concept yet (see integration report — mock retained for that action).
 */
export const productionOrderFromDto = (dto: OrderResponseDto): ProductionOrder => ({
  id: dto.id,
  internalNotes: dto.intakeNotes,
  itemsSummary: dto.services.map((service) => `${service.quantity} x ${service.serviceId} (${service.unitLabel})`),
  quantityReviewStatus: 'PENDING',
  receivedAtStore: dto.receivedAtStore,
  customerName: `Order ${dto.id.slice(0, 8)}`,
  suburb: '',
  status: dto.status,
  stageLabel: ORDER_STATUS_MODEL[dto.status].label,
  qualityCheckPending: dto.status === 'QUALITY_CHECK',
  fulfilmentType: dto.fulfilmentType,
  ...(dto.intakeWeightKg !== null ? { weightKg: dto.intakeWeightKg } : {}),
  intakeNotes: dto.intakeNotes,
})
