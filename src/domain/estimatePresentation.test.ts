import type { PricingQuote } from '@/domain/models/pricing'
import { buildCustomerEstimatePresentation } from '@/domain/estimatePresentation'
import { formatCurrency } from '@/utils/format'

/**
 * Minimal-but-complete `PricingQuote` fixture. Only the fields the
 * presentation function actually reads are meaningfully varied per test;
 * everything else is filled with a safe, unused default.
 */
const buildQuoteFixture = (overrides: Partial<PricingQuote> = {}): PricingQuote => ({
  itemisedServices: [],
  addOns: [],
  deliveryFee: 0,
  expressFee: 0,
  promotions: [],
  subtotal: 0,
  discountTotal: 0,
  loyaltyRedemptionTotal: 0,
  estimatedTotal: 0,
  loyaltyPreviewPoints: 0,
  freeDeliveryThreshold: 300,
  freeDeliveryGap: 300,
  lineItems: [],
  ...overrides,
})

describe('buildCustomerEstimatePresentation', () => {
  it('returns the empty prompt when there is no quote at all', () => {
    expect(buildCustomerEstimatePresentation(null)).toMatchObject({
      kind: 'EMPTY',
      headline: 'Select services to see your estimate',
    })
    expect(buildCustomerEstimatePresentation(null).calculableTotal).toBeUndefined()
    expect(buildCustomerEstimatePresentation(undefined)).toMatchObject({ kind: 'EMPTY' })
  })

  it('returns the empty prompt for a quote with nothing selected', () => {
    const quote = buildQuoteFixture({ subtotal: 0, estimatedTotal: 0 })
    expect(buildCustomerEstimatePresentation(quote)).toMatchObject({
      kind: 'EMPTY',
      headline: 'Select services to see your estimate',
    })
  })

  // ── Matrix: fixed / from / per-kg, all 7 non-empty combinations ──────────

  it('fixed-only: fully known basket -> plain "R X" headline (no "from", no weight suffix)', () => {
    const quote = buildQuoteFixture({
      subtotal: 100,
      knownEstimatedSubtotal: 100,
      deliveryFee: 45,
      estimatedTotal: 145,
    })
    const presentation = buildCustomerEstimatePresentation(quote)
    expect(presentation.kind).toBe('EXACT')
    expect(presentation.isFullyKnown).toBe(true)
    expect(presentation.calculableTotal).toBe(145)
    expect(presentation.headline).toBe(formatCurrency(145))
  })

  it('from-only: assessment item with a real starting price -> "from R X" headline', () => {
    const quote = buildQuoteFixture({
      subtotal: 0,
      knownEstimatedSubtotal: 0,
      deliveryFee: 45,
      assessmentItems: [{ serviceId: 'ev-delicates-wash', label: 'Delicates Wash', startingPrice: 65, isQuoteOnly: false }],
      estimatedTotal: 110, // 65 (from) + 45 (delivery)
    })
    const presentation = buildCustomerEstimatePresentation(quote)
    expect(presentation.kind).toBe('FROM')
    expect(presentation.isFullyKnown).toBe(false)
    expect(presentation.calculableTotal).toBe(110)
    expect(presentation.headline).toBe(`from ${formatCurrency(110)}`)
  })

  it('per-kg-only: weight-based item -> never a fabricated laundry total, headline shows per-kg pricing is outstanding', () => {
    const quote = buildQuoteFixture({
      subtotal: 0,
      knownEstimatedSubtotal: 0,
      deliveryFee: 45,
      weightBasedItems: [{ serviceId: 'ev-wash-dry-fold', label: 'Wash + Dry + Fold', ratePerKg: 45, minimumCharge: 120 }],
      estimatedTotal: 45, // delivery fee only — no per-kg total is ever fabricated
    })
    const presentation = buildCustomerEstimatePresentation(quote)
    expect(presentation.kind).toBe('UNRESOLVED')
    expect(presentation.isFullyKnown).toBe(false)
    expect(presentation.hasWeightBasedItems).toBe(true)
    // The R45 delivery fee is never presented as if it were the complete estimate.
    expect(presentation.headline).toBe(`from ${formatCurrency(45)} + weight-based services`)
    expect(presentation.headline).not.toBe(formatCurrency(45))
  })

  it('fixed + from: exact item plus assessment item -> "from R X" combining both', () => {
    const quote = buildQuoteFixture({
      subtotal: 100,
      knownEstimatedSubtotal: 100,
      deliveryFee: 45,
      assessmentItems: [{ serviceId: 'ev-delicates-wash', label: 'Delicates Wash', startingPrice: 65, isQuoteOnly: false }],
      estimatedTotal: 210, // 100 + 65 + 45
    })
    const presentation = buildCustomerEstimatePresentation(quote)
    expect(presentation.kind).toBe('FROM')
    expect(presentation.headline).toBe(`from ${formatCurrency(210)}`)
  })

  it('fixed + per-kg: exact item plus weight-based item -> "from R X + weight-based services"', () => {
    const quote = buildQuoteFixture({
      subtotal: 100,
      knownEstimatedSubtotal: 100,
      deliveryFee: 45,
      weightBasedItems: [{ serviceId: 'ev-wash-dry-fold', label: 'Wash + Dry + Fold', ratePerKg: 45, minimumCharge: 120 }],
      estimatedTotal: 145, // 100 + 45 delivery (per-kg NOT multiplied in)
    })
    const presentation = buildCustomerEstimatePresentation(quote)
    expect(presentation.kind).toBe('UNRESOLVED')
    expect(presentation.headline).toBe(`from ${formatCurrency(145)} + weight-based services`)
  })

  it('from + per-kg: reproduces the reported bug basket exactly -> "From R110.00 + weight-based services"', () => {
    // Delicates Wash: from R65, Wash + Dry + Fold: R45/kg, Delivery: R45.
    const quote = buildQuoteFixture({
      subtotal: 0,
      knownEstimatedSubtotal: 0,
      deliveryFee: 45,
      assessmentItems: [{ serviceId: 'ev-delicates-wash', label: 'Delicates Wash', startingPrice: 65, isQuoteOnly: false }],
      weightBasedItems: [{ serviceId: 'ev-wash-dry-fold', label: 'Wash + Dry + Fold', ratePerKg: 45, minimumCharge: 120 }],
      estimatedTotal: 110, // 65 (from) + 45 (delivery) — never just the R45 delivery fee alone
    })
    const presentation = buildCustomerEstimatePresentation(quote)
    expect(presentation.kind).toBe('UNRESOLVED')
    expect(presentation.calculableTotal).toBe(110)
    expect(presentation.headline).toBe(`from ${formatCurrency(110)} + weight-based services`)
    expect(presentation.headline).not.toContain(formatCurrency(45))
  })

  it('fixed + from + per-kg: all three combined -> "from R X + weight-based services"', () => {
    const quote = buildQuoteFixture({
      subtotal: 50,
      knownEstimatedSubtotal: 50,
      deliveryFee: 45,
      assessmentItems: [{ serviceId: 'ev-delicates-wash', label: 'Delicates Wash', startingPrice: 65, isQuoteOnly: false }],
      weightBasedItems: [{ serviceId: 'ev-wash-dry-fold', label: 'Wash + Dry + Fold', ratePerKg: 45, minimumCharge: 120 }],
      estimatedTotal: 160, // 50 + 65 + 45
    })
    const presentation = buildCustomerEstimatePresentation(quote)
    expect(presentation.kind).toBe('UNRESOLVED')
    expect(presentation.headline).toBe(`from ${formatCurrency(160)} + weight-based services`)
  })

  // ── Additional edge cases ─────────────────────────────────────────────────

  it('true QUOTE_REQUIRED items (no starting price at all) never contribute a fabricated total either', () => {
    const quote = buildQuoteFixture({
      subtotal: 0,
      knownEstimatedSubtotal: 0,
      deliveryFee: 45,
      assessmentItems: [{ serviceId: 'bg-custom', label: 'Custom Bag Restoration', startingPrice: 0, isQuoteOnly: true }],
      estimatedTotal: 45,
    })
    const presentation = buildCustomerEstimatePresentation(quote)
    expect(presentation.kind).toBe('UNRESOLVED')
    expect(presentation.hasQuoteOnlyItems).toBe(true)
    expect(presentation.headline).toBe(`from ${formatCurrency(45)} + custom quote pricing`)
  })

  it('preserves free-delivery: a fully known basket over the threshold has no delivery fee folded in', () => {
    const quote = buildQuoteFixture({
      subtotal: 320,
      knownEstimatedSubtotal: 320,
      deliveryFee: 0,
      freeDeliveryGap: 0,
      estimatedTotal: 320,
    })
    const presentation = buildCustomerEstimatePresentation(quote)
    expect(presentation.kind).toBe('EXACT')
    expect(presentation.headline).toBe(formatCurrency(320))
  })

  it('preserves loyalty redemption: a discount reduces the headline total like any other known component', () => {
    const quote = buildQuoteFixture({
      subtotal: 150,
      knownEstimatedSubtotal: 150,
      deliveryFee: 45,
      discountTotal: 75,
      loyaltyRedemptionTotal: 75,
      estimatedTotal: 120, // 150 + 45 - 75
    })
    const presentation = buildCustomerEstimatePresentation(quote)
    expect(presentation.kind).toBe('EXACT')
    expect(presentation.headline).toBe(formatCurrency(120))
  })

  it('never treats finalInvoiceTotal-style figures as part of the estimate presentation (structurally separate)', () => {
    // PricingQuote has no finalInvoiceTotal/finalTotal field at all — the
    // presentation function only ever reads estimate-stage fields.
    const quote = buildQuoteFixture({ subtotal: 100, knownEstimatedSubtotal: 100, deliveryFee: 45, estimatedTotal: 145 })
    expect('finalInvoiceTotal' in quote).toBe(false)
    expect('finalTotal' in quote).toBe(false)
    expect(buildCustomerEstimatePresentation(quote).calculableTotal).toBe(145)
  })
})
