import type { PropsWithChildren } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { Address, CustomerProfile } from '@/domain/models'
import { AuthContext } from '@/app/providers/AuthContext'
import type { AuthContextValue } from '@/app/providers/AuthContext'
import type { ProfileDetailsUpdate } from '@/app/providers/AuthContext'
import type { LoginRequest, RegisterRequest } from '@/services/contracts'
import {
  readStoredCustomerSession,
  saveCustomerAddress,
  updateStoredCustomerProfile,
  writeStoredCustomerSession,
} from '@/services/mock/sessionStore'
import { mockAuthService } from '@/services/mock'

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
    setUser(readStoredCustomerSession())
    setIsBootstrapping(false)
  }, [])

  const login = useCallback(async (request: LoginRequest) => {
    const profile = assertSuccess(await mockAuthService.login(request))
    setUser(profile)
    writeStoredCustomerSession(profile)
    queryClient.invalidateQueries({ queryKey: ['customer-orders'] })
  }, [queryClient])

  const register = useCallback(async (request: RegisterRequest) => {
    const profile = assertSuccess(await mockAuthService.register(request))
    setUser(profile)
    writeStoredCustomerSession(profile)
    queryClient.invalidateQueries({ queryKey: ['customer-orders'] })
  }, [queryClient])

  const logout = useCallback(() => {
    setUser(null)
    writeStoredCustomerSession(null)
    queryClient.removeQueries({ queryKey: ['customer-orders'] })
  }, [queryClient])

  const saveAddress = useCallback((address: Omit<Address, 'id'>) => {
    if (!user) {
      return null
    }

    const result = saveCustomerAddress(address, user)
    setUser(result.user)
    return result.address
  }, [user])

  const updateProfile = useCallback((details: ProfileDetailsUpdate) => {
    if (!user) {
      return
    }

    setUser(updateStoredCustomerProfile(details, user))
  }, [user])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isBootstrapping,
      login,
      register,
      logout,
      saveAddress,
      updateProfile,
    }),
    [isBootstrapping, login, logout, register, saveAddress, updateProfile, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
