import { API_BASE_URL } from '@/services/api/config'
import type { AuthRealm } from '@/services/api/tokenStore'
import { readToken } from '@/services/api/tokenStore'

/**
 * Thrown for any non-2xx backend response. Callers must surface this to the
 * user rather than silently falling back to mock data.
 */
export class ApiRequestError extends Error {
  readonly status: number
  readonly code: string | undefined

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
    this.code = code
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  /** Auth realm whose bearer token should be attached. Omit for unauthenticated endpoints (e.g. login). */
  realm?: AuthRealm
}

const parseErrorMessage = async (response: Response): Promise<{ message: string; code: string | undefined }> => {
  try {
    const payload = (await response.clone().json()) as { message?: string; error?: string; code?: string }
    return {
      message: payload.message ?? payload.error ?? `Request failed with status ${response.status}.`,
      code: payload.code,
    }
  } catch {
    return { message: `Request failed with status ${response.status}.`, code: undefined }
  }
}

/**
 * Minimal typed fetch wrapper for the Spring Boot backend. Always throws
 * `ApiRequestError` on failure — callers must handle/report the error rather
 * than silently substituting mock data.
 */
export const apiRequest = async <TResponse>(path: string, options: RequestOptions = {}): Promise<TResponse> => {
  const headers: Record<string, string> = {}

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  if (options.realm) {
    const token = readToken(options.realm)
    if (token) {
      headers.Authorization = ['Bearer', token].join(' ')
    }
  }

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? 'GET',
      headers,
      ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
    })
  } catch {
    throw new ApiRequestError('Unable to reach the LOAD server. Check your connection and try again.', 0)
  }

  if (!response.ok) {
    const { message, code } = await parseErrorMessage(response)
    throw new ApiRequestError(message, response.status, code)
  }

  if (response.status === 204) {
    return undefined as TResponse
  }

  return (await response.json()) as TResponse
}
