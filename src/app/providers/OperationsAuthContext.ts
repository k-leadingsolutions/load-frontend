import { createContext } from 'react'
import type { OperationsProfile } from '@/domain/models'
import type { LoginRequest } from '@/services/contracts'

export interface OperationsAuthContextValue {
  user: OperationsProfile | null
  isAuthenticated: boolean
  isBootstrapping: boolean
  login: (request: LoginRequest) => Promise<void>
  logout: () => void
}

export const OperationsAuthContext = createContext<OperationsAuthContextValue | undefined>(undefined)
