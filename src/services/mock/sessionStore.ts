import type { Address, CustomerProfile } from '@/domain/models'
import type { ProfileDetailsUpdate } from '@/app/providers/AuthContext'

export const AUTH_STORAGE_KEY = 'load.customer.session.v1'

let memorySession: CustomerProfile | null = null

const canUseStorage = () => typeof window !== 'undefined' && 'localStorage' in window

export const readStoredCustomerSession = () => {
  if (!canUseStorage()) {
    return memorySession
  }

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

export const writeStoredCustomerSession = (user: CustomerProfile | null) => {
  memorySession = user

  if (!canUseStorage()) {
    return
  }

  if (!user) {
    window.localStorage.removeItem(AUTH_STORAGE_KEY)
    return
  }

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user))
}

export const saveCustomerAddress = (address: Omit<Address, 'id'>, currentUser: CustomerProfile) => {
  const nextAddress: Address = {
    ...address,
    id: `addr-${crypto.randomUUID().slice(0, 8)}`,
    isDefault: address.isDefault ?? currentUser.addresses.length === 0,
  }

  const nextAddresses = nextAddress.isDefault
    ? [
        nextAddress,
        ...currentUser.addresses.map((item) => ({
          ...item,
          isDefault: false,
        })),
      ]
    : [...currentUser.addresses, nextAddress]

  const updatedUser: CustomerProfile = {
    ...currentUser,
    addresses: nextAddresses,
    defaultAddressId: nextAddress.isDefault ? nextAddress.id : currentUser.defaultAddressId || nextAddress.id,
  }

  writeStoredCustomerSession(updatedUser)

  return {
    user: updatedUser,
    address: nextAddress,
  }
}

export const updateStoredCustomerProfile = (details: ProfileDetailsUpdate, currentUser: CustomerProfile) => {
  const updatedUser: CustomerProfile = {
    ...currentUser,
    ...details,
  }

  writeStoredCustomerSession(updatedUser)
  return updatedUser
}
