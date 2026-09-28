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
  updateStoredCustomerProfile,
  writeStoredCustomerSession,
} from '@/services/mock/sessionStore'
import { apiAuthService } from '@/services/api/authService'
import { apiAddressService } from '@/services/api/addressService'
import { findDuplicateAddress } from '@/domain/address'

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

  const applyProfile = useCallback((profile: CustomerProfile) => {
    setUser(profile)
    writeStoredCustomerSession(profile)
    queryClient.invalidateQueries({ queryKey: ['customer-orders'] })
  }, [queryClient])

  const login = useCallback(async (request: LoginRequest) => {
    const profile = assertSuccess(await apiAuthService.login(request))
    applyProfile(profile)
  }, [applyProfile])

  const register = useCallback(async (request: RegisterRequest) => {
    const profile = assertSuccess(await apiAuthService.register(request))
    applyProfile(profile)
  }, [applyProfile])

  const logout = useCallback(() => {
    setUser(null)
    writeStoredCustomerSession(null)
    queryClient.removeQueries({ queryKey: ['customer-orders'] })
  }, [queryClient])

  const saveAddress = useCallback(async (address: Omit<Address, 'id'>) => {
    if (!user) {
      return null
    }

    // Avoid submitting an obvious duplicate: reuse (and bump the recency of)
    // an existing address with the same normalized identity instead of
    // creating another row. The backend enforces this too, but checking
    // client-side first saves a round trip for the common case.
    const duplicate = findDuplicateAddress(user.addresses, address)
    if (duplicate) {
      let touched = duplicate
      try {
        touched = await apiAddressService.selectAddress(duplicate.id, duplicate.isDefault)
      } catch {
        // Recency is a UX nicety — if the touch call fails, still resolve
        // with the existing address rather than blocking address selection.
      }

      const nextAddresses = user.addresses.map((item) => (item.id === touched.id ? touched : item))
      const updatedUser: CustomerProfile = { ...user, addresses: nextAddresses }
      setUser(updatedUser)
      writeStoredCustomerSession(updatedUser)
      return touched
    }

    const isDefault = address.isDefault ?? user.addresses.length === 0
    const created = await apiAddressService.createAddress(
      {
        label: address.label,
        line1: address.line1,
        suburb: address.suburb,
        city: address.city,
        postalCode: address.postalCode,
      },
      isDefault,
    )

    const nextAddresses = isDefault
      ? [created, ...user.addresses.map((item) => ({ ...item, isDefault: false }))]
      : [...user.addresses, created]

    const updatedUser: CustomerProfile = {
      ...user,
      addresses: nextAddresses,
      defaultAddressId: isDefault ? created.id : user.defaultAddressId || created.id,
    }

    setUser(updatedUser)
    writeStoredCustomerSession(updatedUser)
    return created
  }, [user])

  const touchAddressRecency = useCallback(async (addressId: string) => {
    if (!user || !user.addresses.some((address) => address.id === addressId)) {
      return
    }

    // Optimistic local bump so "most recently used" ordering feels instant;
    // the network call is fire-and-forget best-effort persistence.
    const optimisticTimestamp = new Date().toISOString()
    setUser((current) => {
      if (!current) {
        return current
      }
      const nextAddresses = current.addresses.map((address) =>
        address.id === addressId ? { ...address, lastUsedAt: optimisticTimestamp } : address,
      )
      const next = { ...current, addresses: nextAddresses }
      writeStoredCustomerSession(next)
      return next
    })

    try {
      const isDefault = user.addresses.find((address) => address.id === addressId)?.isDefault
      const touched = await apiAddressService.selectAddress(addressId, isDefault)
      setUser((current) => {
        if (!current) {
          return current
        }
        const nextAddresses = current.addresses.map((address) => (address.id === touched.id ? touched : address))
        const next = { ...current, addresses: nextAddresses }
        writeStoredCustomerSession(next)
        return next
      })
    } catch {
      // Best-effort only — the optimistic local update above already covers the UX.
    }
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
      touchAddressRecency,
      updateProfile,
      adoptAuthenticatedSession: applyProfile,
    }),
    [applyProfile, isBootstrapping, login, logout, register, saveAddress, touchAddressRecency, updateProfile, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
