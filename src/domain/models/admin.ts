import type { OrderStatus } from '@/domain/models/order'

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
  area: string
  customerInstructions?: string
  customerName: string
  driverName: string
  failureReason?: string
  addressLine: string
  orderId: string
  proofOfDelivery?: string
  scheduledWindow: string
  stopStatus: 'ASSIGNED' | 'ARRIVED' | 'COLLECTED' | 'DELIVERED' | 'FAILED'
  stopType: 'PICKUP' | 'DELIVERY'
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
