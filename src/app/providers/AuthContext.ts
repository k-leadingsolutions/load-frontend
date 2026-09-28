import { createContext } from 'react'
import type { Address, CustomerProfile } from '@/domain/models'
import type { LoginRequest, RegisterRequest } from '@/services/contracts'

export interface ProfileDetailsUpdate {
  email: string
  firstName: string
  lastName: string
  mobileNumber: string
}

export interface AuthContextValue {
  user: CustomerProfile | null
  isAuthenticated: boolean
  isBootstrapping: boolean
  login: (request: LoginRequest) => Promise<void>
  register: (request: RegisterRequest) => Promise<void>
  logout: () => void
  saveAddress: (address: Omit<Address, 'id'>) => Promise<Address | null>
  /** Marks an address as just used (selected as pickup/delivery in booking), bumping its recency for "most recently used" ordering. */
  touchAddressRecency: (addressId: string) => Promise<void>
  updateProfile: (details: ProfileDetailsUpdate) => void
  /** Adopts an already-authenticated profile (e.g. from the shared role-aware login resolver) without re-issuing a network call. */
  adoptAuthenticatedSession: (profile: CustomerProfile) => void
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
