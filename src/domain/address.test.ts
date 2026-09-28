import { describe, expect, it } from 'vitest'
import { buildAddressComparisonKey, findDuplicateAddress, MAX_RECENT_ADDRESSES, sortAddressesByRecency } from '@/domain/address'
import type { Address } from '@/domain/models'

const address = (overrides: Partial<Address> & Pick<Address, 'id'>): Address => ({
  label: 'Home',
  line1: '10 Long Street',
  suburb: 'Gardens',
  city: 'Cape Town',
  province: 'Western Cape',
  postalCode: '8001',
  ...overrides,
})

describe('buildAddressComparisonKey', () => {
  it('is case-insensitive and ignores surrounding whitespace', () => {
    const a = address({ id: 'a', line1: '10 Long Street', suburb: 'Gardens', city: 'Cape Town', postalCode: '8001' })
    const b = address({ id: 'b', line1: '  10 LONG STREET  ', suburb: ' gardens ', city: ' CAPE TOWN ', postalCode: ' 8001 ' })

    expect(buildAddressComparisonKey(a)).toBe(buildAddressComparisonKey(b))
  })

  it('does not use the label as part of the identity', () => {
    const a = address({ id: 'a', label: 'Home' })
    const b = address({ id: 'b', label: 'Completely different label' })

    expect(buildAddressComparisonKey(a)).toBe(buildAddressComparisonKey(b))
  })

  it('treats genuinely different addresses as different keys', () => {
    const a = address({ id: 'a', postalCode: '8001' })
    const b = address({ id: 'b', postalCode: '8002' })

    expect(buildAddressComparisonKey(a)).not.toBe(buildAddressComparisonKey(b))
  })
})

describe('findDuplicateAddress', () => {
  it('finds an existing address that normalizes to the same identity', () => {
    const existing = address({ id: 'existing', label: 'Office' })
    const candidate = { line1: '  10 LONG STREET  ', suburb: ' gardens ', city: ' CAPE TOWN ', postalCode: ' 8001 ' }

    expect(findDuplicateAddress([existing], candidate)?.id).toBe('existing')
  })

  it('returns undefined when no existing address matches', () => {
    const existing = address({ id: 'existing', postalCode: '8001' })
    const candidate = { line1: '10 Long Street', suburb: 'Gardens', city: 'Cape Town', postalCode: '9999' }

    expect(findDuplicateAddress([existing], candidate)).toBeUndefined()
  })
})

describe('sortAddressesByRecency', () => {
  it('orders addresses by lastUsedAt descending (most recent first)', () => {
    const older = address({ id: 'older', lastUsedAt: '2024-01-01T00:00:00.000Z' })
    const newer = address({ id: 'newer', lastUsedAt: '2024-06-01T00:00:00.000Z' })

    expect(sortAddressesByRecency([older, newer]).map((a) => a.id)).toEqual(['newer', 'older'])
  })

  it('is a stable sort that preserves original order among addresses with no lastUsedAt', () => {
    const first = address({ id: 'first' })
    const second = address({ id: 'second' })
    const third = address({ id: 'third' })

    expect(sortAddressesByRecency([first, second, third]).map((a) => a.id)).toEqual(['first', 'second', 'third'])
  })

  it('sorts addresses with a lastUsedAt ahead of addresses without one', () => {
    const withoutRecency = address({ id: 'no-recency' })
    const withRecency = address({ id: 'has-recency', lastUsedAt: '2024-01-01T00:00:00.000Z' })

    expect(sortAddressesByRecency([withoutRecency, withRecency]).map((a) => a.id)).toEqual(['has-recency', 'no-recency'])
  })

  it('does not mutate the input array', () => {
    const original = [address({ id: 'a', lastUsedAt: '2024-01-01T00:00:00.000Z' }), address({ id: 'b', lastUsedAt: '2024-06-01T00:00:00.000Z' })]
    const originalOrder = original.map((a) => a.id)

    sortAddressesByRecency(original)

    expect(original.map((a) => a.id)).toEqual(originalOrder)
  })
})

describe('MAX_RECENT_ADDRESSES', () => {
  it('is 3, per the booking screen compact address picker requirement', () => {
    expect(MAX_RECENT_ADDRESSES).toBe(3)
  })
})
