/**
 * Vendor-shaped DTOs representing the (future) read-only POS integration.
 *
 * These are deliberately named/shaped differently from LOAD's own domain
 * `Invoice` model. Customer UI code must never consume these types directly —
 * they exist only on the POS side of the adapter boundary in
 * `src/services/pos/posInvoiceMapper.ts`, which converts them into LOAD's
 * domain representation. This is what lets LOAD change POS vendors later
 * without rewriting Customer screens.
 */

/** Store-side intake progress for a LOAD order, as reported by the POS. */
export type PosOrderIntakeStatus = 'NOT_RECEIVED' | 'RECEIVED' | 'PROCESSING' | 'INVOICED'

export interface PosVendorOrderRecord {
  vendorOrderId: string
  loadOrderRef: string
  intakeStatus: PosOrderIntakeStatus
}

export interface PosVendorInvoiceLine {
  description: string
  quantity: number
  unitAmount: number
  lineAmount: number
}

/** Vendor invoice lifecycle — deliberately distinct from LOAD's `InvoiceStatus`. */
export type PosVendorInvoiceState = 'DRAFT' | 'FINAL' | 'SETTLED'

export interface PosVendorInvoiceRecord {
  vendorInvoiceId: string
  vendorOrderId: string
  loadOrderRef: string
  currency: string
  lines: PosVendorInvoiceLine[]
  totalAmountDue: number
  vendorStatus: PosVendorInvoiceState
  issuedAt: string
}

export interface PosVendorRewardsSummary {
  customerRef: string
  pointsBalance: number
  tier: string
}
