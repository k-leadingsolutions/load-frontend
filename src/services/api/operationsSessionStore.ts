import type { OperationsProfile } from '@/domain/models'

export const OPERATIONS_AUTH_STORAGE_KEY = 'load.operations.session.v1'

let memorySession: OperationsProfile | null = null

const canUseStorage = () => typeof window !== 'undefined' && 'localStorage' in window

export const readStoredOperationsSession = (): OperationsProfile | null => {
  if (!canUseStorage()) {
    return memorySession
  }

  const rawSession = window.localStorage.getItem(OPERATIONS_AUTH_STORAGE_KEY)

  if (!rawSession) {
    return null
  }

  try {
    return JSON.parse(rawSession) as OperationsProfile
  } catch {
    window.localStorage.removeItem(OPERATIONS_AUTH_STORAGE_KEY)
    return null
  }
}

export const writeStoredOperationsSession = (user: OperationsProfile | null): void => {
  memorySession = user

  if (!canUseStorage()) {
    return
  }

  if (!user) {
    window.localStorage.removeItem(OPERATIONS_AUTH_STORAGE_KEY)
    return
  }

  window.localStorage.setItem(OPERATIONS_AUTH_STORAGE_KEY, JSON.stringify(user))
}
