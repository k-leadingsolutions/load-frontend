import type { ApiError, ApiMeta, ApiResponse } from '@/domain/api'

const wait = (duration = 400) => new Promise((resolve) => window.setTimeout(resolve, duration))

const createMeta = (): ApiMeta => ({
  requestId: `req_${crypto.randomUUID()}`,
  timestamp: new Date().toISOString(),
  version: 'v1',
})

export const successResponse = async <TData>(data: TData, duration?: number): Promise<ApiResponse<TData>> => {
  await wait(duration)

  return {
    status: 'success',
    meta: createMeta(),
    data,
  }
}

export const errorResponse = async (error: ApiError, duration?: number): Promise<ApiResponse<never>> => {
  await wait(duration)

  return {
    status: 'error',
    meta: createMeta(),
    error,
  }
}
