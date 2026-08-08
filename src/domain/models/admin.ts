import type { OrderStatus } from '@/domain/models/order'

export interface DashboardMetric {
  id: string
  label: string
  value: string
  changeLabel: string
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
