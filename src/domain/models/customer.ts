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
