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
  id: string
  customerName: string
  suburb: string
  status: string
  stageLabel: string
  qualityCheckPending: boolean
}
