import type { UserRole } from '@/domain/models/customer'

/**
 * Operations/Admin session identity. Deliberately separate from
 * `CustomerProfile`/`DriverProfile` — mirrors the existing Driver auth
 * isolation pattern so Operations authentication can be wired to the real
 * backend without touching the frozen Customer/Driver authentication code.
 */
export interface OperationsProfile {
  id: string
  email: string
  role: Extract<UserRole, 'OPERATIONS' | 'ADMIN'>
}
