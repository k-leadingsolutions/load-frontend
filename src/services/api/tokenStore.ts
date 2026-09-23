export type AuthRealm = 'customer' | 'driver' | 'operations'

const STORAGE_KEYS: Record<AuthRealm, string> = {
  customer: 'load.customer.token.v1',
  driver: 'load.driver.token.v1',
  operations: 'load.operations.token.v1',
}

const memoryTokens: Record<AuthRealm, string | null> = {
  customer: null,
  driver: null,
  operations: null,
}

const canUseStorage = () => typeof window !== 'undefined' && 'localStorage' in window

/** Reads the backend-issued JWT for a given auth realm. Never trusts any other client-side state as authorization. */
export const readToken = (realm: AuthRealm): string | null => {
  if (!canUseStorage()) {
    return memoryTokens[realm]
  }

  return window.localStorage.getItem(STORAGE_KEYS[realm])
}

export const writeToken = (realm: AuthRealm, token: string | null): void => {
  memoryTokens[realm] = token

  if (!canUseStorage()) {
    return
  }

  if (!token) {
    window.localStorage.removeItem(STORAGE_KEYS[realm])
    return
  }

  window.localStorage.setItem(STORAGE_KEYS[realm], token)
}
