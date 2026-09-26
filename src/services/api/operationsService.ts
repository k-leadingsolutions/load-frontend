import { productionOrderFromDto, driverAssignmentFromDto } from '@/services/api/adapters'
import { errorResponse, successResponse } from '@/services/api/envelope'
import { ApiRequestError, apiRequest } from '@/services/api/httpClient'
import type { AssignmentResponseDto, DashboardMetricResponseDto, OrderResponseDto } from '@/services/api/types'
import type {
  DriverAssignmentResponse,
  DriverAssignmentsResponse,
  DashboardMetricsResponse,
  ProductionOrderResponse,
  ProductionOrdersResponse,
} from '@/services/contracts'
import type { OperationsService, QCResult, StoreIntakeInput } from '@/services/interfaces'

const toProductionResult = (dto: OrderResponseDto): ProductionOrderResponse => successResponse(productionOrderFromDto(dto))

const toProductionError = (error: unknown): ProductionOrderResponse =>
  errorResponse({
    code: error instanceof ApiRequestError ? String(error.status) : 'UNKNOWN',
    message: error instanceof Error ? error.message : 'Operations action failed.',
  })

const toAssignmentResult = (dto: AssignmentResponseDto): DriverAssignmentResponse =>
  successResponse(driverAssignmentFromDto(dto))

const toAssignmentError = (error: unknown): DriverAssignmentResponse =>
  errorResponse({
    code: error instanceof ApiRequestError ? String(error.status) : 'UNKNOWN',
    message: error instanceof Error ? error.message : 'Operations action failed.',
  })

/** Real Operations intake/production/dispatch/QC/metrics integration — no retained mocks remain in this service. */
export const apiOperationsService: OperationsService = {
  listProductionOrders: async (): Promise<ProductionOrdersResponse> => {
    try {
      const dtos = await apiRequest<OrderResponseDto[]>('/api/operations/orders', { realm: 'operations' })
      return successResponse(dtos.map(productionOrderFromDto))
    } catch (error) {
      return errorResponse({
        code: error instanceof ApiRequestError ? String(error.status) : 'UNKNOWN',
        message: error instanceof Error ? error.message : 'Unable to load orders.',
      })
    }
  },

  getProductionOrder: async (orderId: string): Promise<ProductionOrderResponse> => {
    try {
      const dto = await apiRequest<OrderResponseDto>(`/api/operations/orders/${orderId}`, { realm: 'operations' })
      return toProductionResult(dto)
    } catch (error) {
      return toProductionError(error)
    }
  },

  confirmLaundryReceived: async (orderId: string): Promise<ProductionOrderResponse> => {
    try {
      const dto = await apiRequest<OrderResponseDto>(`/api/operations/orders/${orderId}/store-received`, {
        method: 'POST',
        realm: 'operations',
      })
      return toProductionResult(dto)
    } catch (error) {
      return toProductionError(error)
    }
  },

  recordStoreIntake: async (orderId: string, intake: StoreIntakeInput): Promise<ProductionOrderResponse> => {
    try {
      const dto = await apiRequest<OrderResponseDto>(`/api/operations/orders/${orderId}/store-intake`, {
        method: 'POST',
        realm: 'operations',
        body: { weightKg: intake.weightKg ?? null, notes: intake.notes ?? null },
      })
      return toProductionResult(dto)
    } catch (error) {
      return toProductionError(error)
    }
  },

  refreshInvoice: async (orderId: string): Promise<ProductionOrderResponse> => {
    try {
      const dto = await apiRequest<OrderResponseDto>(`/api/operations/orders/${orderId}/refresh-invoice`, {
        method: 'POST',
        realm: 'operations',
      })
      return toProductionResult(dto)
    } catch (error) {
      return toProductionError(error)
    }
  },

  updateQuantityReview: async (orderId: string, status: 'CONFIRMED' | 'ADJUSTED'): Promise<ProductionOrderResponse> => {
    try {
      const dto = await apiRequest<OrderResponseDto>(`/api/operations/orders/${orderId}/quantity-review`, {
        method: 'POST',
        realm: 'operations',
        body: { status },
      })
      return toProductionResult(dto)
    } catch (error) {
      return toProductionError(error)
    }
  },

  addInternalNote: async (orderId: string, note: string): Promise<ProductionOrderResponse> => {
    try {
      const dto = await apiRequest<OrderResponseDto>(`/api/operations/orders/${orderId}/notes`, {
        method: 'POST',
        realm: 'operations',
        body: { note },
      })
      return toProductionResult(dto)
    } catch (error) {
      return toProductionError(error)
    }
  },

  performQC: async (orderId: string, result: QCResult): Promise<ProductionOrderResponse> => {
    try {
      const dto = await apiRequest<OrderResponseDto>(`/api/operations/orders/${orderId}/quality-check`, {
        method: 'POST',
        realm: 'operations',
        body: { passed: result.passed, notes: result.notes ?? null },
      })
      return toProductionResult(dto)
    } catch (error) {
      return toProductionError(error)
    }
  },

  advanceProductionStage: async (orderId: string): Promise<ProductionOrderResponse> => {
    try {
      const dto = await apiRequest<OrderResponseDto>(`/api/operations/orders/${orderId}/advance-production`, {
        method: 'POST',
        realm: 'operations',
      })
      return toProductionResult(dto)
    } catch (error) {
      return toProductionError(error)
    }
  },

  getMetrics: async (): Promise<DashboardMetricsResponse> => {
    try {
      const dtos = await apiRequest<DashboardMetricResponseDto[]>('/api/operations/metrics', { realm: 'operations' })
      return successResponse(dtos.map((metric) => ({ ...metric })))
    } catch (error) {
      return errorResponse({
        code: error instanceof ApiRequestError ? String(error.status) : 'UNKNOWN',
        message: error instanceof Error ? error.message : 'Unable to load metrics.',
      })
    }
  },

  listDriverAssignments: async (): Promise<DriverAssignmentsResponse> => {
    try {
      const dtos = await apiRequest<AssignmentResponseDto[]>('/api/operations/assignments', { realm: 'operations' })
      return successResponse(dtos.map(driverAssignmentFromDto))
    } catch (error) {
      return errorResponse({
        code: error instanceof ApiRequestError ? String(error.status) : 'UNKNOWN',
        message: error instanceof Error ? error.message : 'Unable to load assignments.',
      })
    }
  },

  assignDriver: async (orderId: string, driverId: string): Promise<ProductionOrderResponse> => {
    try {
      await apiRequest<AssignmentResponseDto>(`/api/operations/orders/${orderId}/assign-driver`, {
        method: 'POST',
        realm: 'operations',
        body: { driverId, stopType: 'PICKUP' },
      })
      const dto = await apiRequest<OrderResponseDto>(`/api/operations/orders/${orderId}`, { realm: 'operations' })
      return toProductionResult(dto)
    } catch (error) {
      return toProductionError(error)
    }
  },

  dispatchForDelivery: async (orderId: string): Promise<ProductionOrderResponse> => {
    try {
      const dto = await apiRequest<OrderResponseDto>(`/api/operations/orders/${orderId}/dispatch`, {
        method: 'POST',
        realm: 'operations',
      })
      return toProductionResult(dto)
    } catch (error) {
      return toProductionError(error)
    }
  },

  completeStoreCollection: async (orderId: string): Promise<ProductionOrderResponse> => {
    try {
      const dto = await apiRequest<OrderResponseDto>(`/api/operations/orders/${orderId}/complete-store-collection`, {
        method: 'POST',
        realm: 'operations',
      })
      return toProductionResult(dto)
    } catch (error) {
      return toProductionError(error)
    }
  },

  reviewRescheduleRequest: async (
    assignmentId: string,
    decision: 'APPROVED' | 'REJECTED',
    note?: string,
  ): Promise<DriverAssignmentResponse> => {
    try {
      const dto = await apiRequest<AssignmentResponseDto>(`/api/operations/assignments/${assignmentId}/reschedule-decision`, {
        method: 'POST',
        realm: 'operations',
        body: { decision, note: note ?? null },
      })
      return toAssignmentResult(dto)
    } catch (error) {
      return toAssignmentError(error)
    }
  },

  retryFailedAttempt: async (assignmentId: string): Promise<DriverAssignmentResponse> => {
    try {
      const dto = await apiRequest<AssignmentResponseDto>(`/api/operations/assignments/${assignmentId}/retry`, {
        method: 'POST',
        realm: 'operations',
      })
      return toAssignmentResult(dto)
    } catch (error) {
      return toAssignmentError(error)
    }
  },
}
