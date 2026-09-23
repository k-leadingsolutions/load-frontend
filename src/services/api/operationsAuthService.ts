import type { OperationsProfile } from '@/domain/models'
import type { LoginRequest } from '@/services/contracts'
import { apiRequest, ApiRequestError } from '@/services/api/httpClient'
import { writeToken } from '@/services/api/tokenStore'
import type { AuthResponseDto } from '@/services/api/types'

/**
 * Real backend-backed Operations/Admin auth. There is no mock equivalent —
 * the frozen frontend previously had no Operations login entry point at all
 * (RequireRole(['OPERATIONS']) was permanently unreachable). This mirrors the
 * existing Driver auth isolation pattern (separate context/provider/guard)
 * rather than touching the Customer auth stack.
 */
export const apiOperationsAuthService = {
  login: async (request: LoginRequest): Promise<OperationsProfile> => {
    if (!request.email) {
      throw new Error('Sign in with your email address.')
    }

    try {
      const auth = await apiRequest<AuthResponseDto>('/api/auth/login', {
        method: 'POST',
        body: { email: request.email, password: request.password },
      })

      if (auth.role !== 'OPERATIONS' && auth.role !== 'ADMIN') {
        throw new Error('This account does not have Operations access.')
      }

      writeToken('operations', auth.token)

      return { id: auth.email, email: auth.email, role: auth.role }
    } catch (error) {
      throw new Error(error instanceof ApiRequestError ? error.message : 'Operations authentication request failed.')
    }
  },
}
