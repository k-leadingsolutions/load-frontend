import type { Address } from '@/domain/models/customer'
import type { FulfilmentType } from '@/domain/models/booking'

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

/**
 * Payment status is deliberately independent from `OrderStatus` (operational)
 * and `InvoiceLifecycleStatus` (invoice). Semantics used across this pass:
 *  - NOT_REQUIRED   → "not required yet": no final invoice exists, or the
 *                     Customer chose STORE_COLLECTION (paid at the store,
 *                     never collected online by LOAD).
 *  - PENDING        → invoice is READY and unpaid (DELIVERY only).
 *  - AWAITING_CUSTOMER → payment flow in progress / awaiting confirmation.
 *  - CONFIRMED      → paid.
 *  - FAILED         → last payment attempt failed.
 *  - REFUNDED       → refunded after payment.
 */
export type PaymentStatus =
  | 'NOT_REQUIRED'
  | 'PENDING'
  | 'AWAITING_CUSTOMER'
  | 'CONFIRMED'
  | 'FAILED'
  | 'REFUNDED'

/**
 * Invoice lifecycle for a LOAD order. Separate from `OrderStatus` (operational)
 * and `PaymentStatus` (financial). A LOAD booking is always valid with
 * `invoiceStatus: 'NOT_AVAILABLE'` — the invoice becomes 'READY' only once the
 * store-side POS commercial transaction has been finalised and LOAD has
 * retrieved it (read-only) via the POS integration boundary.
 */
export type InvoiceLifecycleStatus = 'NOT_AVAILABLE' | 'READY'

// ─── Main order model ─────────────────────────────────────────────────────────

export interface LaundryOrder {
  id: string
  customerId: string
  status: OrderStatus
  friendlyStatus: string
  pickupWindow: PickupDeliveryWindow
  /** Present only when `fulfilmentType === 'DELIVERY'`. STORE_COLLECTION orders have no delivery leg. */
  deliveryWindow?: PickupDeliveryWindow
  pickupAddress: Address
  /** Present only when `fulfilmentType === 'DELIVERY'`. STORE_COLLECTION orders have no delivery leg. */
  deliveryAddress?: Address
  services: OrderServiceSelection[]
  estimatedTotal: number
  confirmedWeightKg?: number
  paymentStatus: PaymentStatus
  /** LOAD-facing invoice reference, once available. */
  invoiceId?: string
  /**
   * Read-only reference to the store-side POS order. Never written by the
   * Customer app — LOAD never creates or mutates POS records. A newly
   * confirmed booking is valid with this left undefined.
   */
  externalPosOrderId?: string
  /** Read-only reference to the vendor-side invoice, when the invoice originated from POS. */
  externalInvoiceId?: string
  /** See `InvoiceLifecycleStatus`. A new booking always starts as 'NOT_AVAILABLE'. */
  invoiceStatus: InvoiceLifecycleStatus
  /**
   * Read-only display projection of `Invoice.finalTotal`. This is NEVER an
   * independently calculated amount — it only ever mirrors the authoritative
   * Invoice record once `invoiceStatus === 'READY'`. Payment must always use
   * the Invoice itself (or this projection), never `estimatedTotal`.
   */
  finalInvoiceTotal?: number
  loyaltyPointsEarned: number
  promotionsApplied: string[]
  internalNotes: string[]
  canRepeat: boolean
  /** How the completed order returns to the Customer. Defaults to DELIVERY when absent (legacy orders). */
  fulfilmentType?: FulfilmentType
}

// ─── Dispatch eligibility (domain-level preparation only — not enforced in UI) ─

/**
 * Derived signal for whether an order is eligible to move to dispatch.
 *
 * DELIVERY orders require a READY invoice AND confirmed payment before
 * dispatch. STORE_COLLECTION orders never require online payment for
 * dispatch/collection readiness — the Customer pays at the store.
 *
 * This is a domain-level preparation for the future Operations/dispatch
 * workflow; it is not wired into any Operations UI in this pass.
 */
export function isEligibleForDispatch(order: Pick<LaundryOrder, 'invoiceStatus' | 'paymentStatus' | 'fulfilmentType'>): boolean {
  if (order.invoiceStatus !== 'READY') {
    return false
  }

  if (order.fulfilmentType === 'STORE_COLLECTION') {
    return true
  }

  return order.paymentStatus === 'CONFIRMED'
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
