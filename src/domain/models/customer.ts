export type UserRole = 'PUBLIC' | 'CUSTOMER' | 'OPERATIONS' | 'DRIVER' | 'ADMIN'

export interface Address {
  id: string
  label: string
  line1: string
  suburb: string
  city: string
  province: string
  postalCode: string
  deliveryInstructions?: string
  isDefault?: boolean
  /** ISO-8601 instant of last use (created, re-submitted as a duplicate, or explicitly selected). Drives "most recently used" ordering. Absent for addresses sourced outside the backend-persisted flow. */
  lastUsedAt?: string
  /**
   * Distance, in kilometres, between the LOAD store and this address —
   * drives distance-tiered delivery pricing (see `domain/deliveryPricing.ts`).
   * There is currently no real geocoding/routing integration anywhere in
   * this codebase; this is demo/seed data only (never inferred from
   * suburb/city/postcode) until a real distance-resolution service is
   * wired in. Absent when the distance has not been resolved.
   */
  distanceKm?: number
}

export interface LoyaltyWallet {
  tier: 'Silver' | 'Gold' | 'Platinum'
  points: number
  availableRewards: number
  loadBalance: number
}

export interface CustomerProfile {
  id: string
  firstName: string
  lastName: string
  mobileNumber: string
  email: string
  role: Extract<UserRole, 'CUSTOMER'>
  defaultAddressId: string
  addresses: Address[]
  loyalty: LoyaltyWallet
}
