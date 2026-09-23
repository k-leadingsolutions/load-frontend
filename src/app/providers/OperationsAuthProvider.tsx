import type { PropsWithChildren } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { OperationsProfile } from '@/domain/models'
import { OperationsAuthContext } from '@/app/providers/OperationsAuthContext'
import type { OperationsAuthContextValue } from '@/app/providers/OperationsAuthContext'
import type { LoginRequest } from '@/services/contracts'
import { apiOperationsAuthService } from '@/services/api/operationsAuthService'
import { readStoredOperationsSession, writeStoredOperationsSession } from '@/services/api/operationsSessionStore'
import { writeToken } from '@/services/api/tokenStore'

/**
 * Independent, additive Operations/Admin session provider. Mirrors
 * `DriverAuthProvider`'s isolation from the Customer auth stack — kept fully
 * separate so Operations authentication can be wired to the real backend
 * without touching frozen Customer/Driver authentication code.
 */
export const OperationsAuthProvider = ({ children }: PropsWithChildren) => {
  const queryClient = useQueryClient()
  const [user, setUser] = useState<OperationsProfile | null>(null)
  const [isBootstrapping, setIsBootstrapping] = useState(true)

  useEffect(() => {
    setUser(readStoredOperationsSession())
    setIsBootstrapping(false)
  }, [])

  const login = useCallback(async (request: LoginRequest) => {
    const profile = await apiOperationsAuthService.login(request)
    setUser(profile)
    writeStoredOperationsSession(profile)
    queryClient.invalidateQueries({ queryKey: ['operations-orders'] })
    queryClient.invalidateQueries({ queryKey: ['operations-assignments'] })
  }, [queryClient])

  const logout = useCallback(() => {
    setUser(null)
    writeStoredOperationsSession(null)
    writeToken('operations', null)
    queryClient.removeQueries({ queryKey: ['operations-orders'] })
    queryClient.removeQueries({ queryKey: ['operations-assignments'] })
  }, [queryClient])

  const value = useMemo<OperationsAuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isBootstrapping,
      login,
      logout,
    }),
    [isBootstrapping, login, logout, user],
  )

  return <OperationsAuthContext.Provider value={value}>{children}</OperationsAuthContext.Provider>
}
