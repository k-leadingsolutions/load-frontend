import type { PosReadService } from '@/services/interfaces'
import { mockPosReadService, __setMockPosScenario, __resetMockPosScenarios } from '@/services/mock'

/**
 * Contract test protecting the POS read-only boundary (Pass 2, sections 3-4, 33).
 *
 * The PosReadService interface — and its mock implementation — must NEVER
 * gain a mutation method. LOAD reads the store-side POS system; it never
 * creates, updates, or deletes POS records.
 */
describe('PosReadService contract', () => {
  const FORBIDDEN_METHOD_PATTERN = /^(create|update|delete|confirm|sync|assign|schedule|post|put|patch|remove)/i

  it('exposes only read operations (no mutation methods)', () => {
    const methodNames = Object.keys(mockPosReadService)

    expect(methodNames.length).toBeGreaterThan(0)
    for (const name of methodNames) {
      expect(name).not.toMatch(FORBIDDEN_METHOD_PATTERN)
    }
  })

  it('does not expose updateInvoice/createInvoice/confirmPayment or equivalents', () => {
    const forbidden = [
      'createOrder', 'updateOrder', 'deleteOrder',
      'createCustomer', 'updateCustomer', 'deleteCustomer',
      'createInvoice', 'updateInvoice', 'deleteInvoice',
      'confirmPayment', 'assignDriver', 'scheduleCollection', 'scheduleDelivery',
      'syncOrderCharges', 'updateQuote',
    ]

    for (const method of forbidden) {
      expect(mockPosReadService as unknown as Record<string, unknown>).not.toHaveProperty(method)
    }
  })

  it('only exposes the documented read methods', () => {
    const service: PosReadService = mockPosReadService
    expect(typeof service.getOrderIntakeStatus).toBe('function')
    expect(typeof service.getInvoiceForOrder).toBe('function')
    expect(typeof service.getCustomerRewards).toBe('function')
  })

  afterEach(() => {
    __resetMockPosScenarios()
  })

  it('returns null invoice when the POS order has not yet been received', async () => {
    __setMockPosScenario('LD-CONTRACT-1', { kind: 'NOT_RECEIVED' })
    const invoice = await mockPosReadService.getInvoiceForOrder('LD-CONTRACT-1')
    expect(invoice).toBeNull()
  })

  it('rejects (never mutates) when the POS is unavailable', async () => {
    __setMockPosScenario('LD-CONTRACT-2', { kind: 'UNAVAILABLE' })
    await expect(mockPosReadService.getInvoiceForOrder('LD-CONTRACT-2')).rejects.toThrow()
  })
})
