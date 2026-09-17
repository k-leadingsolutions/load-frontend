import { beforeEach, describe, expect, it } from 'vitest'
import { mockOperationsService } from '@/services/mock'
import { updateStoredDriverAssignment } from '@/services/mock/driverStore'
import { updateStoredOrder } from '@/services/mock/orderStore'
import { updateStoredProductionOrder } from '@/services/mock/operationsStore'

describe('mockOperationsService', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  describe('store intake and invalid-transition guard', () => {
    it('rejects advancing production before store intake is confirmed', async () => {
      const response = await mockOperationsService.advanceProductionStage('LD10231')

      expect(response.status).toBe('error')
      expect(response.error?.code).toBe('NOT_RECEIVED')
    })

    it('records store intake as operational-only data without touching pricing', async () => {
      const confirmResponse = await mockOperationsService.confirmLaundryReceived('LD10231')
      expect(confirmResponse.status).toBe('success')

      const intakeResponse = await mockOperationsService.recordStoreIntake('LD10231', {
        weightKg: 4.2,
        notes: 'One item lightly stained.',
      })

      expect(intakeResponse.status).toBe('success')
      expect(intakeResponse.data?.weightKg).toBe(4.2)
      expect(intakeResponse.data?.intakeNotes?.[0]).toBe('One item lightly stained.')

      // Advancing is now allowed since intake/receipt has been confirmed.
      const advanceResponse = await mockOperationsService.advanceProductionStage('LD10231')
      expect(advanceResponse.status).toBe('success')
    })

    it('does not double-count intake notes or reset receivedAtStore on repeated calls', async () => {
      await mockOperationsService.confirmLaundryReceived('LD10231')
      await mockOperationsService.recordStoreIntake('LD10231', { notes: 'First note.' })
      const second = await mockOperationsService.recordStoreIntake('LD10231', { notes: 'Second note.' })

      expect(second.data?.intakeNotes).toEqual(['Second note.', 'First note.'])
      expect(second.data?.receivedAtStore).toBe(true)
    })
  })

  describe('dispatch eligibility', () => {
    it('blocks dispatch for a DELIVERY order that is unpaid', async () => {
      const response = await mockOperationsService.dispatchForDelivery('LD10243')

      expect(response.status).toBe('error')
      expect(response.error?.code).toBe('NOT_DISPATCH_ELIGIBLE')
    })

    it('allows dispatch for a DELIVERY order that is paid, invoice-ready, and operationally ready', async () => {
      const response = await mockOperationsService.dispatchForDelivery('LD10241')

      expect(response.status).toBe('success')
      expect(response.data?.status).toBe('OUT_FOR_DELIVERY')
    })

    it('rejects dispatching an order that is not yet READY_FOR_DISPATCH', async () => {
      updateStoredProductionOrder('LD10241', (current) => ({ ...current, status: 'WASHING' }))

      const response = await mockOperationsService.dispatchForDelivery('LD10241')

      expect(response.status).toBe('error')
      expect(response.error?.code).toBe('INVALID_TRANSITION')
    })

    it('rejects Driver-delivery dispatch for a STORE_COLLECTION order', async () => {
      const response = await mockOperationsService.dispatchForDelivery('LD10242')

      expect(response.status).toBe('error')
      expect(response.error?.code).toBe('INVALID_FULFILMENT')
    })

    it('does not allow Operations to bypass eligibility by mutating LOAD state twice (duplicate dispatch protection)', async () => {
      const first = await mockOperationsService.dispatchForDelivery('LD10241')
      expect(first.status).toBe('success')

      const second = await mockOperationsService.dispatchForDelivery('LD10241')
      expect(second.status).toBe('error')
      expect(second.error?.code).toBe('INVALID_TRANSITION')
    })
  })

  describe('store collection', () => {
    it('completes a STORE_COLLECTION order without requiring Driver delivery or online payment', async () => {
      const response = await mockOperationsService.completeStoreCollection('LD10242')

      expect(response.status).toBe('success')
      expect(response.data?.status).toBe('COMPLETED')
    })

    it('rejects store collection completion for a DELIVERY order', async () => {
      const response = await mockOperationsService.completeStoreCollection('LD10241')

      expect(response.status).toBe('error')
      expect(response.error?.code).toBe('INVALID_FULFILMENT')
    })
  })

  describe('reschedule request review', () => {
    it('lets Operations approve a pending reschedule request and returns the stop to a valid state', async () => {
      updateStoredDriverAssignment('run-01', (current) => ({ ...current, stopStatus: 'RESCHEDULE_REQUESTED', rescheduleReason: 'CUSTOMER_UNAVAILABLE' }))

      const response = await mockOperationsService.reviewRescheduleRequest('run-01', 'APPROVED', 'Rebooked for tomorrow.')

      expect(response.status).toBe('success')
      expect(response.data?.stopStatus).toBe('ASSIGNED')
      expect(response.data?.operationsDecision).toBe('APPROVED')
    })

    it('lets Operations reject a reschedule request while still returning a valid Driver state', async () => {
      updateStoredDriverAssignment('run-01', (current) => ({ ...current, stopStatus: 'RESCHEDULE_REQUESTED' }))

      const response = await mockOperationsService.reviewRescheduleRequest('run-01', 'REJECTED')

      expect(response.status).toBe('success')
      expect(response.data?.stopStatus).toBe('ASSIGNED')
      expect(response.data?.operationsDecision).toBe('REJECTED')
    })

    it('rejects reviewing a stop with no pending reschedule request', async () => {
      const response = await mockOperationsService.reviewRescheduleRequest('run-01', 'APPROVED')

      expect(response.status).toBe('error')
      expect(response.error?.code).toBe('INVALID_TRANSITION')
    })
  })

  describe('failed-attempt handling', () => {
    it('retries a failed attempt through a valid ASSIGNED re-entry, not a bypass', async () => {
      updateStoredDriverAssignment('run-01', (current) => ({ ...current, stopStatus: 'FAILED', failureReason: 'CUSTOMER_UNAVAILABLE' }))

      const response = await mockOperationsService.retryFailedAttempt('run-01')

      expect(response.status).toBe('success')
      expect(response.data?.stopStatus).toBe('ASSIGNED')
      expect(response.data?.verificationStatus).toBe('AWAITING')
    })

    it('rejects retrying a stop that has not failed', async () => {
      const response = await mockOperationsService.retryFailedAttempt('run-01')

      expect(response.status).toBe('error')
      expect(response.error?.code).toBe('INVALID_TRANSITION')
    })
  })

  describe('POS resilience', () => {
    it('does not expose any POS mutation methods on the Operations service', () => {
      const forbiddenNames = ['createInvoice', 'updateInvoice', 'writeOrder', 'syncOrder', 'confirmPos', 'deletePos']
      const operationsMethodNames = Object.keys(mockOperationsService)

      forbiddenNames.forEach((name) => {
        expect(operationsMethodNames).not.toContain(name)
      })
    })

    it('keeps operational data intact when the linked LOAD order record is missing', async () => {
      // LD10233 has no matching mockOrders LaundryOrder entry.
      updateStoredOrder('LD10233', () => {
        throw new Error('should not be reachable when the order does not exist')
      })

      const response = await mockOperationsService.dispatchForDelivery('LD10233')

      expect(response.status).toBe('error')
      expect(response.error?.code).toBe('INVALID_TRANSITION')
    })
  })
})
