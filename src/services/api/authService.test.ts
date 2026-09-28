import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiAuthService, toCustomerProfile } from '@/services/api/authService'
import type { CustomerProfileResponseDto } from '@/services/api/types'

const jsonResponse = (body: unknown): Response =>
  ({
    ok: true,
    status: 200,
    json: async () => body,
    clone() {
      return this
    },
  }) as unknown as Response

const notFoundResponse = (): Response =>
  ({
    ok: false,
    status: 500,
    json: async () => ({ message: 'Address service unavailable' }),
    clone() {
      return this
    },
  }) as unknown as Response

const profileDto: CustomerProfileResponseDto = {
  userId: 'user-1',
  firstName: 'Jane',
  lastName: 'Doe',
  mobileNumber: '+27821112222',
  email: 'jane@example.com',
}

const addressDtos = [
  { id: 'addr-1', label: 'Home', line1: '1 Long St', line2: null, suburb: 'Gardens', city: 'Cape Town', postalCode: '8001' },
  { id: 'addr-2', label: 'Office', line1: '2 Main Rd', line2: null, suburb: 'Sandton', city: 'Johannesburg', postalCode: '2196' },
]

describe('toCustomerProfile — addresses hydration', () => {
  it('maps addresses and derives defaultAddressId from the isDefault entry', () => {
    const addresses = [
      { id: 'a', label: 'Home', line1: '1', suburb: 's', city: 'c', province: '', postalCode: '1', isDefault: false },
      { id: 'b', label: 'Office', line1: '2', suburb: 's', city: 'c', province: '', postalCode: '2', isDefault: true },
    ]
    const profile = toCustomerProfile(profileDto, addresses)

    expect(profile.addresses).toEqual(addresses)
    expect(profile.defaultAddressId).toBe('b')
  })

  it('falls back to the first address id when none is marked default', () => {
    const addresses = [
      { id: 'a', label: 'Home', line1: '1', suburb: 's', city: 'c', province: '', postalCode: '1', isDefault: false },
    ]
    expect(toCustomerProfile(profileDto, addresses).defaultAddressId).toBe('a')
  })

  it('defaults to an empty address book and blank defaultAddressId when no addresses are given', () => {
    const profile = toCustomerProfile(profileDto)
    expect(profile.addresses).toEqual([])
    expect(profile.defaultAddressId).toBe('')
  })
})

describe('apiAuthService.login — persisted backend addresses are the source of truth, never localStorage', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('hydrates every persisted backend address on login, not just a cached local session', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url.endsWith('/api/auth/login')) {
        return jsonResponse({ token: 'tok-1', email: 'jane@example.com', role: 'CUSTOMER' })
      }
      if (url.endsWith('/api/customer/profile')) {
        return jsonResponse(profileDto)
      }
      if (url.endsWith('/api/customer/addresses')) {
        return jsonResponse(addressDtos)
      }
      throw new Error(`Unexpected fetch: ${url}`)
    })

    const response = await apiAuthService.login({ email: 'jane@example.com', password: 'Load@1234' })

    expect(response.status).toBe('success')
    expect(response.data?.addresses).toHaveLength(2)
    expect(response.data?.addresses.map((address) => address.label)).toEqual(['Home', 'Office'])
    // First address returned by the backend is treated as the default when
    // the backend doesn't yet model an explicit isDefault flag.
    expect(response.data?.defaultAddressId).toBe('addr-1')
  })

  it('never blocks sign-in when the address listing call fails — degrades to an empty address book instead', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url.endsWith('/api/auth/login')) {
        return jsonResponse({ token: 'tok-1', email: 'jane@example.com', role: 'CUSTOMER' })
      }
      if (url.endsWith('/api/customer/profile')) {
        return jsonResponse(profileDto)
      }
      if (url.endsWith('/api/customer/addresses')) {
        return notFoundResponse()
      }
      throw new Error(`Unexpected fetch: ${url}`)
    })

    const response = await apiAuthService.login({ email: 'jane@example.com', password: 'Load@1234' })

    expect(response.status).toBe('success')
    expect(response.data?.addresses).toEqual([])
  })
})
