import type { UserRole } from '@/domain/models/customer'

/**
 * Driver session identity. Deliberately separate from `CustomerProfile` —
 * Driver is logistics-only and must not carry Customer profile fields
 * (rewards, addresses, payment methods, etc).
 */
export interface DriverProfile {
  id: string
  /** Driver-scoped ID used to fetch assignments. Supports multiple drivers later. */
  driverId: string
  name: string
  mobileNumber: string
  role: Extract<UserRole, 'DRIVER'>
}
