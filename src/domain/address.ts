import type { Address } from '@/domain/models'

/**
 * Canonical duplicate-detection key for an address: trimmed, lower-cased
 * line1/suburb/city/postalCode joined with a separator. Deliberately does
 * NOT include the label — two addresses with the same physical location but
 * different labels ("Home" vs "Mom's House") are still the same address.
 * Mirrors the server-side `Address.buildNormalizedKey` in
 * `backend/src/main/java/com/load/backend/customer/Address.java`.
 */
export const buildAddressComparisonKey = (
  address: Pick<Address, 'line1' | 'suburb' | 'city' | 'postalCode'>,
): string => {
  const normalizePart = (value: string) => value.trim().toLowerCase()
  return [address.line1, address.suburb, address.city, address.postalCode].map(normalizePart).join('|')
}

/** Finds an existing address that is an obvious duplicate of the candidate (same normalized identity), if any. */
export const findDuplicateAddress = (
  addresses: Address[],
  candidate: Pick<Address, 'line1' | 'suburb' | 'city' | 'postalCode'>,
): Address | undefined => {
  const candidateKey = buildAddressComparisonKey(candidate)
  return addresses.find((address) => buildAddressComparisonKey(address) === candidateKey)
}

/** Sorts addresses by most-recently-used first. Addresses without a `lastUsedAt` sort after those with one, preserving relative order among themselves (stable sort). */
export const sortAddressesByRecency = (addresses: Address[]): Address[] =>
  [...addresses].sort((a, b) => {
    const aTime = a.lastUsedAt ? new Date(a.lastUsedAt).getTime() : 0
    const bTime = b.lastUsedAt ? new Date(b.lastUsedAt).getTime() : 0
    return bTime - aTime
  })

/** Maximum number of addresses shown by default on the booking screen before a "View all" control is required. */
export const MAX_RECENT_ADDRESSES = 3
