import { createContext } from 'react'
import type { OperationsProfile } from '@/domain/models'
import type { LoginRequest } from '@/services/contracts'

export interface OperationsAuthContextValue {
  user: OperationsProfile | null
  isAuthenticated: boolean
  isBootstrapping: boolean
  login: (request: LoginRequest) => Promise<void>
  logout: () => void
  /** Adopts an already-authenticated profile (e.g. from the shared role-aware login resolver) without re-issuing a network call. */
  adoptAuthenticatedSession: (profile: OperationsProfile) => void
}

export const OperationsAuthContext = createContext<OperationsAuthContextValue | undefined>(undefined)
