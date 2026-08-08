import type { OrderStatus } from '@/domain/models/order'

export interface DashboardMetric {
  id: string
  label: string
  value: string
  changeLabel: string
}

export interface DriverAssignment {
  id: string
  driverName: string
  area: string
  scheduledWindow: string
  stopType: 'PICKUP' | 'DELIVERY'
  orderId: string
  customerName: string
  addressLine: string
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
