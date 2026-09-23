import type { PropsWithChildren } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { DriverProfile } from '@/domain/models'
import { DriverAuthContext } from '@/app/providers/DriverAuthContext'
import type { DriverAuthContextValue } from '@/app/providers/DriverAuthContext'
import type { LoginRequest } from '@/services/contracts'
import { readStoredDriverSession, writeStoredDriverSession } from '@/services/mock/driverSessionStore'
import { apiDriverAuthService } from '@/services/api/driverAuthService'

const assertSuccess = <TData,>(response: { data?: TData; error?: { message?: string }; status: 'success' | 'error' }) => {
  if (response.status === 'error' || !response.data) {
    throw new Error(response.error?.message ?? 'Driver authentication request failed.')
  }

  return response.data
}

/**
 * Independent, additive Driver session provider. Kept fully separate from
 * the Customer AuthProvider/AuthContext (different storage key, different
 * profile shape) so Driver auth can be hardened without touching the frozen
 * Customer authentication surface.
 */
export const DriverAuthProvider = ({ children }: PropsWithChildren) => {
  const queryClient = useQueryClient()
  const [user, setUser] = useState<DriverProfile | null>(null)
  const [isBootstrapping, setIsBootstrapping] = useState(true)

  useEffect(() => {
    setUser(readStoredDriverSession())
    setIsBootstrapping(false)
  }, [])

  const login = useCallback(async (request: LoginRequest) => {
    const profile = assertSuccess(await apiDriverAuthService.login(request))
    setUser(profile)
    writeStoredDriverSession(profile)
    queryClient.invalidateQueries({ queryKey: ['driver-assignments'] })
  }, [queryClient])

  const logout = useCallback(() => {
    setUser(null)
    writeStoredDriverSession(null)
    queryClient.removeQueries({ queryKey: ['driver-assignments'] })
  }, [queryClient])

  const value = useMemo<DriverAuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isBootstrapping,
      login,
      logout,
    }),
    [isBootstrapping, login, logout, user],
  )

  return <DriverAuthContext.Provider value={value}>{children}</DriverAuthContext.Provider>
}
