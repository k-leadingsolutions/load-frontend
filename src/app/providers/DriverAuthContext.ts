import { createContext } from 'react'
import type { DriverProfile } from '@/domain/models'
import type { LoginRequest } from '@/services/contracts'

export interface DriverAuthContextValue {
  user: DriverProfile | null
  isAuthenticated: boolean
  isBootstrapping: boolean
  login: (request: LoginRequest) => Promise<void>
  logout: () => void
  /** Adopts an already-authenticated profile (e.g. from the shared role-aware login resolver) without re-issuing a network call. */
  adoptAuthenticatedSession: (profile: DriverProfile) => void
}

export const DriverAuthContext = createContext<DriverAuthContextValue | undefined>(undefined)
