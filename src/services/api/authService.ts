import type { Address, CustomerProfile } from '@/domain/models'
import type { CustomerProfileResponse, LoginRequest, RegisterRequest } from '@/services/contracts'
import { apiAddressService } from '@/services/api/addressService'
import { errorResponse, successResponse } from '@/services/api/envelope'
import { apiRequest, ApiRequestError } from '@/services/api/httpClient'
import { writeToken } from '@/services/api/tokenStore'
import type { AuthResponseDto, CustomerProfileResponseDto } from '@/services/api/types'
import type { AuthService } from '@/services/interfaces'

/**
 * Fetches the Customer's persisted backend address book so it can be
 * hydrated into their profile at login/bootstrap time. Backend-persisted
 * addresses are the source of truth — never localStorage — so this must be
 * called on every fresh login/profile fetch, not just when a new address is
 * added during the current session. A listing failure never blocks sign-in;
 * it just means the Customer starts the session with an empty address book
 * (the same degraded experience as if they hadn't added one yet).
 */
const fetchCustomerAddresses = (): Promise<Address[]> => apiAddressService.listAddresses().catch(() => [])

/** Exported for reuse by `resolveRoleAwareLogin`, which needs the identical mapping without duplicating it. */
export const toCustomerProfile = (profile: CustomerProfileResponseDto, addresses: Address[] = []): CustomerProfile => ({
  id: profile.userId,
  firstName: profile.firstName,
  lastName: profile.lastName,
  mobileNumber: profile.mobileNumber,
  email: profile.email,
  role: 'CUSTOMER',
  defaultAddressId: addresses.find((address) => address.isDefault)?.id ?? addresses[0]?.id ?? '',
  addresses,
  loyalty: { tier: 'Silver', points: 0, availableRewards: 0, loadBalance: 0 },
})

const authenticate = async (path: string, body: unknown): Promise<CustomerProfileResponse> => {
  try {
    const auth = await apiRequest<AuthResponseDto>(path, { method: 'POST', body })
    writeToken('customer', auth.token)
    const profile = await apiRequest<CustomerProfileResponseDto>('/api/customer/profile', { realm: 'customer' })
    const addresses = await fetchCustomerAddresses()
    return successResponse(toCustomerProfile(profile, addresses))
  } catch (error) {
    const message = error instanceof ApiRequestError ? error.message : 'Authentication request failed.'
    return errorResponse({ code: 'AUTH_FAILED', message })
  }
}

/**
 * Real backend-backed Customer auth. Only `login`/`register`/`getProfile` are
 * implemented — OTP/biometric/password-reset flows have no backend endpoint
 * yet and remain on `mockAuthService` in the pages that use them.
 */
export const apiAuthService: Pick<AuthService, 'login' | 'register' | 'getProfile'> = {
  login: (request: LoginRequest) => {
    if (!request.email) {
      return Promise.resolve(
        errorResponse({
          code: 'UNSUPPORTED_LOGIN_METHOD',
          message: 'Sign in with your email address — mobile number sign-in is not yet supported by the server.',
        }),
      )
    }

    return authenticate('/api/auth/login', { email: request.email, password: request.password })
  },

  register: (request: RegisterRequest) =>
    authenticate('/api/auth/register/customer', {
      firstName: request.firstName,
      lastName: request.lastName,
      mobileNumber: request.mobileNumber,
      email: request.email,
      password: request.password,
    }),

  getProfile: async () => {
    try {
      const profile = await apiRequest<CustomerProfileResponseDto>('/api/customer/profile', { realm: 'customer' })
      const addresses = await fetchCustomerAddresses()
      return successResponse(toCustomerProfile(profile, addresses))
    } catch (error) {
      const message = error instanceof ApiRequestError ? error.message : 'Unable to load your profile.'
      return errorResponse({ code: 'PROFILE_FETCH_FAILED', message })
    }
  },
}
