export type ApiStatus = 'success' | 'error'

export interface ApiMeta {
  requestId: string
  timestamp: string
  version: 'v1'
  pagination?: {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
  }
}

export interface ApiError {
  code: string
  message: string
  details?: Record<string, string>
}

export interface ApiResponse<TData> {
  status: ApiStatus
  meta: ApiMeta
  data?: TData
  error?: ApiError
}

export interface AsyncState<TData> {
  data: TData | null
  isLoading: boolean
  isError: boolean
  message?: string
}
