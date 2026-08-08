import type { PropsWithChildren } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { CustomerProfile } from '@/domain/models'
import { AuthContext } from '@/app/providers/AuthContext'
import type { AuthContextValue } from '@/app/providers/AuthContext'
import type { LoginRequest, RegisterRequest } from '@/services/contracts'
import { mockAuthService } from '@/services/mock'

const AUTH_STORAGE_KEY = 'load.customer.session.v1'

const readStoredUser = () => {
  const rawSession = window.localStorage.getItem(AUTH_STORAGE_KEY)

  if (!rawSession) {
    return null
  }

  try {
    return JSON.parse(rawSession) as CustomerProfile
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY)
    return null
  }
}

const storeUser = (user: CustomerProfile | null) => {
  if (!user) {
    window.localStorage.removeItem(AUTH_STORAGE_KEY)
    return
  }

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user))
}

const assertSuccess = <TData,>(response: { data?: TData; error?: { message?: string }; status: 'success' | 'error' }) => {
  if (response.status === 'error' || !response.data) {
    throw new Error(response.error?.message ?? 'Authentication request failed.')
  }

  return response.data
}

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const queryClient = useQueryClient()
  const [user, setUser] = useState<CustomerProfile | null>(null)
  const [isBootstrapping, setIsBootstrapping] = useState(true)

  useEffect(() => {
    setUser(readStoredUser())
    setIsBootstrapping(false)
  }, [])

  const login = useCallback(async (request: LoginRequest) => {
    const profile = assertSuccess(await mockAuthService.login(request))
    setUser(profile)
    storeUser(profile)
    queryClient.invalidateQueries({ queryKey: ['customer-orders'] })
  }, [queryClient])

  const register = useCallback(async (request: RegisterRequest) => {
    const profile = assertSuccess(await mockAuthService.register(request))
    setUser(profile)
    storeUser(profile)
    queryClient.invalidateQueries({ queryKey: ['customer-orders'] })
  }, [queryClient])

  const logout = useCallback(() => {
    setUser(null)
    storeUser(null)
    queryClient.removeQueries({ queryKey: ['customer-orders'] })
  }, [queryClient])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isBootstrapping,
      login,
      register,
      logout,
    }),
    [isBootstrapping, login, logout, register, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
