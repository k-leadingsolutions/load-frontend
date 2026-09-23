import type { RescheduleReason, VerificationAttempt, VerificationMethod } from '@/domain/models'
import { driverAssignmentFromDto } from '@/services/api/adapters'
import { errorResponse, successResponse } from '@/services/api/envelope'
import { ApiRequestError, apiRequest } from '@/services/api/httpClient'
import { readStoredDriverSession } from '@/services/mock/driverSessionStore'
import type { ArrivalResponseDto, AssignmentResponseDto } from '@/services/api/types'
import type { DriverAssignmentResponse, DriverAssignmentsResponse } from '@/services/contracts'

const driverIdFromSession = (): string => readStoredDriverSession()?.driverId ?? ''

const toResult = (dto: AssignmentResponseDto): DriverAssignmentResponse =>
  successResponse(driverAssignmentFromDto(dto, driverIdFromSession()))

const toErrorResult = (error: unknown): DriverAssignmentResponse =>
  errorResponse({
    code: error instanceof ApiRequestError ? String(error.status) : 'UNKNOWN',
    message: error instanceof Error ? error.message : 'Driver action failed.',
  })

/**
 * Real Driver assignment lifecycle. All ownership/transition validation is
 * enforced server-side (`DriverController` only ever acts on the caller's
 * own assignments); this layer only adapts requests/responses.
 */
export const apiDriverService = {
  listAssignments: async (): Promise<DriverAssignmentsResponse> => {
    try {
      const dtos = await apiRequest<AssignmentResponseDto[]>('/api/driver/assignments', { realm: 'driver' })
      const driverId = driverIdFromSession()
      return successResponse(dtos.map((dto) => driverAssignmentFromDto(dto, driverId)))
    } catch (error) {
      return errorResponse({
        code: error instanceof ApiRequestError ? String(error.status) : 'UNKNOWN',
        message: error instanceof Error ? error.message : 'Unable to load assignments.',
      })
    }
  },

  confirmEnRoute: async (assignmentId: string): Promise<DriverAssignmentResponse> => {
    try {
      const dto = await apiRequest<AssignmentResponseDto>(`/api/driver/assignments/${assignmentId}/en-route`, {
        method: 'POST',
        realm: 'driver',
      })
      return toResult(dto)
    } catch (error) {
      return toErrorResult(error)
    }
  },

  confirmArrival: async (assignmentId: string): Promise<DriverAssignmentResponse> => {
    try {
      const dto = await apiRequest<ArrivalResponseDto>(`/api/driver/assignments/${assignmentId}/arrive`, {
        method: 'POST',
        realm: 'driver',
      })
      return toResult(dto.assignment)
    } catch (error) {
      return toErrorResult(error)
    }
  },

  confirmCollection: async (assignmentId: string): Promise<DriverAssignmentResponse> => {
    try {
      const dto = await apiRequest<AssignmentResponseDto>(`/api/driver/assignments/${assignmentId}/collect`, {
        method: 'POST',
        realm: 'driver',
      })
      return toResult(dto)
    } catch (error) {
      return toErrorResult(error)
    }
  },

  /**
   * The backend deliver endpoint takes no request body — it does not yet
   * persist proof-of-delivery (see integration report gap). `proofOfDelivery`
   * is accepted for interface compatibility but intentionally not sent.
   */
  confirmDelivery: async (assignmentId: string, _proofOfDelivery: string): Promise<DriverAssignmentResponse> => {
    try {
      const dto = await apiRequest<AssignmentResponseDto>(`/api/driver/assignments/${assignmentId}/deliver`, {
        method: 'POST',
        realm: 'driver',
      })
      return toResult(dto)
    } catch (error) {
      return toErrorResult(error)
    }
  },

  recordFailure: async (assignmentId: string, reason: RescheduleReason, note?: string): Promise<DriverAssignmentResponse> => {
    try {
      const dto = await apiRequest<AssignmentResponseDto>(`/api/driver/assignments/${assignmentId}/fail`, {
        method: 'POST',
        realm: 'driver',
        body: { reason, note: note ?? null },
      })
      return toResult(dto)
    } catch (error) {
      return toErrorResult(error)
    }
  },

  requestReschedule: async (stopId: string, reason: RescheduleReason, note?: string): Promise<DriverAssignmentResponse> => {
    try {
      const dto = await apiRequest<AssignmentResponseDto>(`/api/driver/assignments/${stopId}/reschedule-request`, {
        method: 'POST',
        realm: 'driver',
        body: { reason, note: note ?? null },
      })
      return toResult(dto)
    } catch (error) {
      return toErrorResult(error)
    }
  },

  verifyStop: async (stopId: string, method: VerificationMethod, code?: string): Promise<VerificationAttempt> => {
    const dto = await apiRequest<AssignmentResponseDto>(`/api/driver/assignments/${stopId}/verify`, {
      method: 'POST',
      realm: 'driver',
      body: { code: code ?? '' },
    })

    return {
      id: dto.id,
      orderId: dto.orderId,
      method,
      status: dto.verificationStatus ?? 'AWAITING',
      attemptedAt: new Date().toISOString(),
      ...(dto.verificationStatus === 'VERIFIED' ? { verifiedAt: new Date().toISOString() } : {}),
    }
  },
}
