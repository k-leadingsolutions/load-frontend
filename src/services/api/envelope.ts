import type { ApiError, ApiMeta, ApiResponse } from '@/domain/api'

const createMeta = (): ApiMeta => ({
  requestId: `req_${crypto.randomUUID()}`,
  timestamp: new Date().toISOString(),
  version: 'v1',
})

/** Wraps a real backend result in the same `ApiResponse` envelope the frontend interfaces expect. */
export const successResponse = <TData>(data: TData): ApiResponse<TData> => ({
  status: 'success',
  meta: createMeta(),
  data,
})

export const errorResponse = (error: ApiError): ApiResponse<never> => ({
  status: 'error',
  meta: createMeta(),
  error,
})
