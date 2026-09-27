import { describe, expect, it } from 'vitest'
import { driverAssignmentFromDto, laundryOrderFromDto, productionOrderFromDto } from '@/services/api/adapters'
import type { AssignmentResponseDto, OrderResponseDto } from '@/services/api/types'

const UUID = '3f2504e0-4f89-11d3-9a0c-0305e82c3301'
const ORDER_NUMBER = 'LD10482'

const baseOrderDto: OrderResponseDto = {
  id: UUID,
  orderNumber: ORDER_NUMBER,
  status: 'BOOKING_RECEIVED',
  fulfilmentType: 'DELIVERY',
  pickupAddressId: 'addr-1',
  pickupWindowDate: '2026-09-14',
  pickupWindowLabel: '09:00 - 11:00',
  deliveryAddressId: null,
  deliveryWindowDate: null,
  deliveryWindowLabel: null,
  services: [{ serviceId: 'wash-fold', quantity: 2, unitLabel: 'kg' }],
  estimatedTotal: 250,
  paymentStatus: 'PENDING',
  invoiceStatus: 'NOT_AVAILABLE',
  finalInvoiceTotal: null,
  receivedAtStore: false,
  intakeWeightKg: null,
  intakeNotes: [],
  quantityReviewStatus: 'PENDING',
  internalNotes: [],
}

const baseAssignmentDto: AssignmentResponseDto = {
  id: 'assignment-1',
  driverId: 'driver-1',
  orderId: UUID,
  orderNumber: ORDER_NUMBER,
  stopIndex: 1,
  stopType: 'PICKUP',
  stopStatus: 'ASSIGNED',
  verificationMethod: null,
  verificationStatus: null,
  failureReason: null,
  failureNote: null,
  rescheduleReason: null,
  rescheduleNote: null,
  operationsDecision: null,
}

describe('order number mapping (LD##### human-friendly identifiers)', () => {
  it('laundryOrderFromDto keeps the UUID as id and surfaces orderNumber separately', () => {
    const order = laundryOrderFromDto(baseOrderDto, 'customer-1', new Map())

    expect(order.id).toBe(UUID)
    expect(order.orderNumber).toBe(ORDER_NUMBER)
  })

  it('driverAssignmentFromDto uses the real orderNumber for its human-facing label, never the raw UUID', () => {
    const assignment = driverAssignmentFromDto(baseAssignmentDto)

    expect(assignment.orderId).toBe(UUID)
    expect(assignment.orderNumber).toBe(ORDER_NUMBER)
    expect(assignment.customerName).toBe(ORDER_NUMBER)
    expect(assignment.customerName).not.toContain(UUID.slice(0, 8))
  })

  it('driverAssignmentFromDto falls back to an honest UUID-derived placeholder when the backend has not resolved an orderNumber', () => {
    const assignment = driverAssignmentFromDto({ ...baseAssignmentDto, orderNumber: null })

    expect(assignment.orderNumber).toBeUndefined()
    expect(assignment.customerName).toBe(`Order ${UUID.slice(0, 8)}`)
  })

  it('productionOrderFromDto keeps the UUID as id and surfaces orderNumber for Operations display', () => {
    const productionOrder = productionOrderFromDto(baseOrderDto)

    expect(productionOrder.id).toBe(UUID)
    expect(productionOrder.orderNumber).toBe(ORDER_NUMBER)
    expect(productionOrder.customerName).not.toContain(UUID.slice(0, 8))
  })

  it('productionOrderFromDto never reuses orderNumber as customerName, to avoid duplicating the same LD##### label on screen', () => {
    const productionOrder = productionOrderFromDto(baseOrderDto)

    expect(productionOrder.customerName).not.toBe(ORDER_NUMBER)
    expect(productionOrder.customerName).not.toContain(ORDER_NUMBER)
  })

  it('productionOrderFromDto carries the pickup/delivery window dates alongside their time-range labels', () => {
    const productionOrder = productionOrderFromDto(baseOrderDto)

    expect(productionOrder.pickupWindowDate).toBe(baseOrderDto.pickupWindowDate)
    expect(productionOrder.pickupWindowLabel).toBe(baseOrderDto.pickupWindowLabel)
    expect(productionOrder.deliveryWindowDate).toBeUndefined()
  })
})
