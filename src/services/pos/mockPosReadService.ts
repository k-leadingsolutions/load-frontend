import type { PosReadService } from '@/services/interfaces'
import type {
  PosVendorInvoiceRecord,
  PosVendorOrderRecord,
  PosVendorRewardsSummary,
} from '@/services/pos/posContracts'

/**
 * Deterministic mock implementation of the read-only POS boundary.
 *
 * Supports the scenarios required for Customer UI development:
 *   A. LOAD booking exists, POS order not yet available     → NOT_RECEIVED / null invoice
 *   B. POS order exists, invoice not yet available          → RECEIVED / null invoice
 *   C. invoice ready                                        → INVOICED / FINAL invoice
 *   D. invoice ready with final total                       → INVOICED / FINAL invoice with lines
 *   E. invoice already marked paid in source data           → INVOICED / SETTLED invoice
 *   F. POS temporarily unavailable                          → rejects
 *   G. customer/rewards data available                      → getCustomerRewards()
 *
 * All delays are short and deterministic so Vitest never needs real timers.
 */

type MockPosScenario =
  | { kind: 'NOT_RECEIVED' }
  | { kind: 'RECEIVED' }
  | { kind: 'INVOICED'; invoice: PosVendorInvoiceRecord }
  | { kind: 'UNAVAILABLE' }

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const scenarioByOrderId = new Map<string, MockPosScenario>()

const defaultInvoiceFor = (loadOrderId: string): PosVendorInvoiceRecord => ({
  vendorInvoiceId: `POS-INV-${loadOrderId}`,
  vendorOrderId: `POS-ORD-${loadOrderId}`,
  loadOrderRef: loadOrderId,
  currency: 'ZAR',
  lines: [
    { description: 'Wash + Dry + Fold (confirmed weight)', quantity: 1, unitAmount: 214, lineAmount: 214 },
  ],
  totalAmountDue: 214,
  vendorStatus: 'FINAL',
  issuedAt: new Date().toISOString(),
})

/** Test/dev helper: seed a deterministic POS scenario for a given LOAD order. */
export const __setMockPosScenario = (loadOrderId: string, scenario: MockPosScenario) => {
  scenarioByOrderId.set(loadOrderId, scenario)
}

/** Test/dev helper: clear all seeded scenarios (defaults everything back to NOT_RECEIVED). */
export const __resetMockPosScenarios = () => {
  scenarioByOrderId.clear()
}

const resolveScenario = (loadOrderId: string): MockPosScenario =>
  scenarioByOrderId.get(loadOrderId) ?? { kind: 'NOT_RECEIVED' }

export const mockPosReadService: PosReadService = {
  async getOrderIntakeStatus(loadOrderId: string): Promise<PosVendorOrderRecord | null> {
    await sleep(120)
    const scenario = resolveScenario(loadOrderId)

    if (scenario.kind === 'UNAVAILABLE') {
      throw new Error('The POS system is temporarily unavailable. Please try again shortly.')
    }

    if (scenario.kind === 'NOT_RECEIVED') {
      return null
    }

    const intakeStatus = scenario.kind === 'INVOICED' ? 'INVOICED' : scenario.kind === 'RECEIVED' ? 'RECEIVED' : 'PROCESSING'

    return {
      vendorOrderId: `POS-ORD-${loadOrderId}`,
      loadOrderRef: loadOrderId,
      intakeStatus,
    }
  },

  async getInvoiceForOrder(loadOrderId: string): Promise<PosVendorInvoiceRecord | null> {
    await sleep(180)
    const scenario = resolveScenario(loadOrderId)

    if (scenario.kind === 'UNAVAILABLE') {
      throw new Error('We\u2019re unable to retrieve your invoice right now.')
    }

    if (scenario.kind !== 'INVOICED') {
      return null
    }

    return scenario.invoice
  },

  async getCustomerRewards(customerId: string): Promise<PosVendorRewardsSummary | null> {
    await sleep(120)
    return {
      customerRef: customerId,
      pointsBalance: 0,
      tier: 'STANDARD',
    }
  },
}

export const __mockPosDefaults = { defaultInvoiceFor }
