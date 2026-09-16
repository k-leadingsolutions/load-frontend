import type { Invoice, InvoiceStatus, PaymentStatus } from '@/domain/models'
import type { PosVendorInvoiceRecord, PosVendorInvoiceState } from '@/services/pos/posContracts'

/**
 * Adapter boundary: converts a raw POS vendor invoice DTO into LOAD's own
 * domain `Invoice` representation. Customer UI and LOAD services must never
 * read `PosVendorInvoiceRecord` fields directly — everything flows through
 * here first.
 */

const VENDOR_STATUS_TO_INVOICE_STATUS: Record<PosVendorInvoiceState, InvoiceStatus> = {
  DRAFT: 'DRAFT',
  FINAL: 'ISSUED',
  SETTLED: 'PAID',
}

const VENDOR_STATUS_TO_PAYMENT_STATUS: Record<PosVendorInvoiceState, PaymentStatus> = {
  DRAFT: 'NOT_REQUIRED',
  FINAL: 'PENDING',
  SETTLED: 'CONFIRMED',
}

export interface MapPosInvoiceContext {
  orderId: string
  customerId: string
  customerName: string
  serviceLabel: string
}

export const mapPosInvoiceToLoadInvoice = (
  record: PosVendorInvoiceRecord,
  context: MapPosInvoiceContext,
): Invoice => ({
  id: `inv-${context.orderId}`,
  invoiceNumber: record.vendorInvoiceId,
  orderId: context.orderId,
  customerId: context.customerId,
  customerName: context.customerName,
  serviceLabel: context.serviceLabel,
  lines: record.lines.map((line, index) => ({
    id: `${record.vendorInvoiceId}-line-${index}`,
    description: line.description,
    quantity: line.quantity,
    unitPrice: line.unitAmount,
    total: line.lineAmount,
    lineType: 'SERVICE' as const,
  })),
  pickupFee: 0,
  deliveryFee: 0,
  subtotal: record.totalAmountDue,
  adjustmentTotal: 0,
  discountTotal: 0,
  loyaltyRedemptionTotal: 0,
  taxTotal: 0,
  finalTotal: record.totalAmountDue,
  status: VENDOR_STATUS_TO_INVOICE_STATUS[record.vendorStatus],
  paymentStatus: VENDOR_STATUS_TO_PAYMENT_STATUS[record.vendorStatus],
  posSyncStatus: 'SYNCED',
  createdAt: record.issuedAt,
  updatedAt: record.issuedAt,
})
