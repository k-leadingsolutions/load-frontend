import type { CustomerProfile, DriverProfile, OperationsProfile } from '@/domain/models'
import type { LoginRequest } from '@/services/contracts'
import { apiAddressService } from '@/services/api/addressService'
import { toCustomerProfile } from '@/services/api/authService'
import { apiRequest, ApiRequestError } from '@/services/api/httpClient'
import { writeToken } from '@/services/api/tokenStore'
import type { AuthResponseDto, CustomerProfileResponseDto } from '@/services/api/types'

export type RoleAwareLoginResult =
  | { realm: 'customer'; profile: CustomerProfile }
  | { realm: 'operations'; profile: OperationsProfile }
  | { realm: 'driver'; profile: DriverProfile }

const toAuthError = (error: unknown, fallback: string): Error =>
  new Error(error instanceof ApiRequestError ? error.message : fallback)

/**
 * Single entry point for the app's generic, role-agnostic `/login` screen.
 *
 * Root cause this fixes: the Customer-only `authenticate()` flow in
 * `authService.ts` always followed a successful `POST /api/auth/login` with
 * `GET /api/customer/profile` — regardless of the role the backend actually
 * authenticated. Since `/login` is the single, generic sign-in screen reachable
 * by any account (Customer, Driver, Operations, Admin), a valid OPERATIONS or
 * DRIVER login was immediately followed by a Customer-only profile call that
 * the backend correctly rejects with 403, which the UI then reported as a
 * failed sign-in instead of entering the Operations/Driver UI.
 *
 * This performs exactly one `POST /api/auth/login`, then branches on the
 * backend-authenticated `role`: only CUSTOMER continues on to
 * `GET /api/customer/profile` (unchanged existing behaviour). OPERATIONS,
 * ADMIN and DRIVER never call that Customer-scoped endpoint — their session
 * profile is built directly from the login response, exactly as the existing,
 * independent `apiOperationsAuthService`/`apiDriverAuthService` already do for
 * their own dedicated login screens.
 */
export const resolveRoleAwareLogin = async (request: LoginRequest): Promise<RoleAwareLoginResult> => {
  if (!request.email) {
    throw new Error('Sign in with your email address — mobile number sign-in is not yet supported by the server.')
  }

  let auth: AuthResponseDto
  try {
    auth = await apiRequest<AuthResponseDto>('/api/auth/login', {
      method: 'POST',
      body: { email: request.email, password: request.password },
    })
  } catch (error) {
    throw toAuthError(error, 'Authentication request failed.')
  }

  if (auth.role === 'OPERATIONS' || auth.role === 'ADMIN') {
    writeToken('operations', auth.token)
    return {
      realm: 'operations',
      profile: { id: auth.email, email: auth.email, role: auth.role },
    }
  }

  if (auth.role === 'DRIVER') {
    writeToken('driver', auth.token)
    return {
      realm: 'driver',
      profile: {
        id: auth.email,
        driverId: auth.email,
        name: auth.email,
        mobileNumber: request.mobileNumber ?? '',
        role: 'DRIVER',
      },
    }
  }

  writeToken('customer', auth.token)
  try {
    const profile = await apiRequest<CustomerProfileResponseDto>('/api/customer/profile', { realm: 'customer' })
    const addresses = await apiAddressService.listAddresses().catch(() => [])
    return { realm: 'customer', profile: toCustomerProfile(profile, addresses) }
  } catch (error) {
    throw toAuthError(error, 'Authentication request failed.')
  }
}
