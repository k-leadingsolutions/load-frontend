import type { DriverProfile } from '@/domain/models'

export const DRIVER_AUTH_STORAGE_KEY = 'load.driver.session.v1'

let memorySession: DriverProfile | null = null

const canUseStorage = () => typeof window !== 'undefined' && 'localStorage' in window

export const readStoredDriverSession = () => {
  if (!canUseStorage()) {
    return memorySession
  }

  const rawSession = window.localStorage.getItem(DRIVER_AUTH_STORAGE_KEY)

  if (!rawSession) {
    return null
  }

  try {
    return JSON.parse(rawSession) as DriverProfile
  } catch {
    window.localStorage.removeItem(DRIVER_AUTH_STORAGE_KEY)
    return null
  }
}

export const writeStoredDriverSession = (user: DriverProfile | null) => {
  memorySession = user

  if (!canUseStorage()) {
    return
  }

  if (!user) {
    window.localStorage.removeItem(DRIVER_AUTH_STORAGE_KEY)
    return
  }

  window.localStorage.setItem(DRIVER_AUTH_STORAGE_KEY, JSON.stringify(user))
}
