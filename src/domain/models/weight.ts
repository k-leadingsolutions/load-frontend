export type WeightMeasurementStatus =
  | 'PENDING'
  | 'CAPTURED'
  | 'CONFIRMED'
  | 'ADJUSTED'

export interface WeightMeasurement {
  id: string
  orderId: string
  measuredKg: number
  measuredBy: string
  measuredAt: string
  status: WeightMeasurementStatus
  notes?: string
}
