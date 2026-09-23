import type { DriverProfile } from '@/domain/models'
import type { DriverProfileResponse, LoginRequest } from '@/services/contracts'
import { errorResponse, successResponse } from '@/services/api/envelope'
import { apiRequest, ApiRequestError } from '@/services/api/httpClient'
import { writeToken } from '@/services/api/tokenStore'
import type { AuthResponseDto } from '@/services/api/types'
import type { DriverAuthService } from '@/services/interfaces'

/**
 * Real backend-backed Driver auth. Driver accounts are provisioned
 * out-of-band (no self-registration endpoint exists) — only login is wired.
 */
/**
 * Real backend-backed Driver auth. Driver accounts are provisioned
 * out-of-band (no self-registration endpoint exists) — only login is wired.
 *
 * @note The frozen Driver login screen only exposes a single "mobile number"
 * field (no email/mobile toggle, unlike the Customer login screen). The
 * backend only authenticates by email. Until the backend adds mobile-based
 * login (or the UI is extended, out of scope for this pass), Drivers must
 * enter their registered email address into that field.
 */
export const apiDriverAuthService: DriverAuthService = {
  login: async (request: LoginRequest): Promise<DriverProfileResponse> => {
    const email = request.email ?? (request.mobileNumber?.includes('@') ? request.mobileNumber : undefined)

    if (!email) {
      return errorResponse({
        code: 'UNSUPPORTED_LOGIN_METHOD',
        message: 'Enter your registered email address — mobile number sign-in is not yet supported by the server.',
      })
    }

    try {
      const auth = await apiRequest<AuthResponseDto>('/api/auth/login', {
        method: 'POST',
        body: { email, password: request.password },
      })

      if (auth.role !== 'DRIVER') {
        return errorResponse({ code: 'NOT_A_DRIVER_ACCOUNT', message: 'This account is not a Driver account.' })
      }

      writeToken('driver', auth.token)

      const profile: DriverProfile = {
        id: auth.email,
        driverId: auth.email,
        name: auth.email,
        mobileNumber: request.mobileNumber ?? '',
        role: 'DRIVER',
      }

      return successResponse(profile)
    } catch (error) {
      const message = error instanceof ApiRequestError ? error.message : 'Driver authentication request failed.'
      return errorResponse({ code: 'AUTH_FAILED', message })
    }
  },
}
