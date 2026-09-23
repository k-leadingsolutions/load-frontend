import type { CustomerProfile } from '@/domain/models'
import type { CustomerProfileResponse, LoginRequest, RegisterRequest } from '@/services/contracts'
import { errorResponse, successResponse } from '@/services/api/envelope'
import { apiRequest, ApiRequestError } from '@/services/api/httpClient'
import { writeToken } from '@/services/api/tokenStore'
import type { AuthResponseDto, CustomerProfileResponseDto } from '@/services/api/types'
import type { AuthService } from '@/services/interfaces'

const toCustomerProfile = (profile: CustomerProfileResponseDto): CustomerProfile => ({
  id: profile.userId,
  firstName: profile.firstName,
  lastName: profile.lastName,
  mobileNumber: profile.mobileNumber,
  email: profile.email,
  role: 'CUSTOMER',
  defaultAddressId: '',
  addresses: [],
  loyalty: { tier: 'Silver', points: 0, availableRewards: 0, loadBalance: 0 },
})

const authenticate = async (path: string, body: unknown): Promise<CustomerProfileResponse> => {
  try {
    const auth = await apiRequest<AuthResponseDto>(path, { method: 'POST', body })
    writeToken('customer', auth.token)
    const profile = await apiRequest<CustomerProfileResponseDto>('/api/customer/profile', { realm: 'customer' })
    return successResponse(toCustomerProfile(profile))
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
      return successResponse(toCustomerProfile(profile))
    } catch (error) {
      const message = error instanceof ApiRequestError ? error.message : 'Unable to load your profile.'
      return errorResponse({ code: 'PROFILE_FETCH_FAILED', message })
    }
  },
}
