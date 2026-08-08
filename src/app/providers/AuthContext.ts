import { createContext } from 'react'
import type { Address, CustomerProfile } from '@/domain/models'
import type { LoginRequest, RegisterRequest } from '@/services/contracts'

export interface AuthContextValue {
  user: CustomerProfile | null
  isAuthenticated: boolean
  isBootstrapping: boolean
  login: (request: LoginRequest) => Promise<void>
  register: (request: RegisterRequest) => Promise<void>
  logout: () => void
  saveAddress: (address: Omit<Address, 'id'>) => Address | null
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
