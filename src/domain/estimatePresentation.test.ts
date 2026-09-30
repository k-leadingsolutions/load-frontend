import type { EstimateLine, PricingQuote } from '@/domain/models/pricing'
import type { DeliveryPricingState } from '@/domain/deliveryPricing'
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
  deliveryPricing: { status: 'NOT_APPLICABLE' },
  lineItems: [],
  serviceLines: [],
  ...overrides,
})

/** Convenience builder for a resolved ("PRICED") delivery-pricing state, for tests that only care about the effective fee. */
const pricedDelivery = (effectiveDeliveryFee: number, extra: Partial<Extract<DeliveryPricingState, { status: 'PRICED' }>> = {}): DeliveryPricingState => ({
  status: 'PRICED',
  distanceKm: 4,
  tier: 'NEAR_1_TO_5KM',
  standardDeliveryFee: effectiveDeliveryFee,
  qualifyingBasketValue: 0,
  freeDeliveryUnlocked: false,
  effectiveDeliveryFee,
  ...extra,
})

// ── EstimateLine builders, one per catalogue pricing model ──────────────────

const perItem = (id: string, label: string, unitPrice: number, quantity = 1): EstimateLine => ({
  id,
  label,
  pricingModel: 'PER_ITEM',
  unitLabel: 'item',
  quantity,
  unitPrice,
  lineTotal: unitPrice * quantity,
})

const fixedService = (id: string, label: string, unitPrice: number, quantity = 1): EstimateLine => ({
  id,
  label,
  pricingModel: 'FIXED_SERVICE',
  unitLabel: 'service',
  quantity,
  unitPrice,
  lineTotal: unitPrice * quantity,
})

const perBasket = (id: string, label: string, unitPrice: number, quantity = 1): EstimateLine => ({
  id,
  label,
  pricingModel: 'PER_BASKET',
  unitLabel: 'basket',
  quantity,
  unitPrice,
  lineTotal: unitPrice * quantity,
})

const perKg = (id: string, label: string, ratePerKg: number, minimumCharge?: number): EstimateLine => ({
  id,
  label,
  pricingModel: 'PER_KILOGRAM',
  unitLabel: 'kg',
  quantity: 1,
  ratePerKg,
  ...(minimumCharge !== undefined ? { minimumCharge } : {}),
})

const fromAssessment = (id: string, label: string, startingPrice: number): EstimateLine => ({
  id,
  label,
  pricingModel: 'ASSESSMENT_REQUIRED',
  unitLabel: 'assessment',
  quantity: 1,
  startingPrice,
  unitPrice: startingPrice,
  isQuoteOnly: false,
})

const quoteRequired = (id: string, label: string): EstimateLine => ({
  id,
  label,
  pricingModel: 'QUOTE_REQUIRED',
  unitLabel: 'quote',
  quantity: 1,
  isQuoteOnly: true,
})

const addOn = (id: string, label: string, unitPrice: number, quantity = 1): EstimateLine => ({
  id,
  label,
  pricingModel: 'ADD_ON',
  unitLabel: 'item',
  quantity,
  unitPrice,
  lineTotal: unitPrice * quantity,
})

/** Every serviceLine must appear exactly once (by id) among the non-delivery breakdown rows. */
const expectEveryServiceAppearsExactlyOnce = (quote: PricingQuote) => {
  const presentation = buildCustomerEstimatePresentation(quote)
  const nonDeliveryRows = presentation.breakdown.filter((line) => line.pricingModel !== 'DELIVERY')
  expect(nonDeliveryRows).toHaveLength(quote.serviceLines.length)
  const rowIds = nonDeliveryRows.map((line) => line.id)
  expect(new Set(rowIds).size).toBe(rowIds.length)
  for (const line of quote.serviceLines) {
    expect(rowIds).toContain(line.id)
  }
}

describe('buildCustomerEstimatePresentation', () => {
  it('returns the empty prompt when there is no quote at all', () => {
    expect(buildCustomerEstimatePresentation(null)).toMatchObject({
      kind: 'EMPTY',
      headline: 'Select services to see your estimate',
      breakdown: [],
    })
    expect(buildCustomerEstimatePresentation(null).calculableTotal).toBeUndefined()
    expect(buildCustomerEstimatePresentation(undefined)).toMatchObject({ kind: 'EMPTY' })
  })

  it('returns the empty prompt for a quote with nothing selected', () => {
    const quote = buildQuoteFixture({ subtotal: 0, estimatedTotal: 0, serviceLines: [] })
    const presentation = buildCustomerEstimatePresentation(quote)
    expect(presentation).toMatchObject({ kind: 'EMPTY', headline: 'Select services to see your estimate', breakdown: [] })
  })

  // ── Test matrix ────────────────────────────────────────────────────────────

  it('per-item only: PER_ITEM service -> exact "R unit × qty = R total" line and a plain "R X" headline', () => {
    const quote = buildQuoteFixture({
      subtotal: 90,
      deliveryFee: 45,
      deliveryPricing: pricedDelivery(45),
      estimatedTotal: 135,
      serviceLines: [perItem('shirt', 'Shirt Press', 45, 2)],
    })
    const presentation = buildCustomerEstimatePresentation(quote)

    expect(presentation.kind).toBe('EXACT')
    expect(presentation.isFullyKnown).toBe(true)
    expect(presentation.totalLabel).toBe('Estimated total')
    expect(presentation.calculableTotal).toBe(135)
    expect(presentation.headline).toBe(formatCurrency(135))

    const line = presentation.breakdown.find((item) => item.id === 'shirt')
    expect(line).toMatchObject({
      label: 'Shirt Press',
      pricingModel: 'PER_ITEM',
      valueText: `${formatCurrency(45)} × 2 = ${formatCurrency(90)}`,
      isPending: false,
    })
    expectEveryServiceAppearsExactlyOnce(quote)
  })

  it('fixed only: FIXED_SERVICE -> "R fixed price" line and a plain "R X" headline', () => {
    const quote = buildQuoteFixture({
      subtotal: 100,
      deliveryFee: 45,
      deliveryPricing: pricedDelivery(45),
      estimatedTotal: 145,
      serviceLines: [fixedService('dry-clean-suit', '2-Piece Suit Dry Clean', 100)],
    })
    const presentation = buildCustomerEstimatePresentation(quote)

    expect(presentation.kind).toBe('EXACT')
    expect(presentation.headline).toBe(formatCurrency(145))
    expect(presentation.breakdown.find((item) => item.id === 'dry-clean-suit')).toMatchObject({
      label: '2-Piece Suit Dry Clean',
      pricingModel: 'FIXED_SERVICE',
      valueText: formatCurrency(100),
      isPending: false,
    })
    expectEveryServiceAppearsExactlyOnce(quote)
  })

  it('per-basket only: PER_BASKET -> "R basket price" line and a plain "R X" headline', () => {
    const quote = buildQuoteFixture({
      subtotal: 250,
      deliveryFee: 45,
      deliveryPricing: pricedDelivery(45),
      estimatedTotal: 295,
      serviceLines: [perBasket('basket-large', 'Large Basket', 250)],
    })
    const presentation = buildCustomerEstimatePresentation(quote)

    expect(presentation.kind).toBe('EXACT')
    expect(presentation.headline).toBe(formatCurrency(295))
    expect(presentation.breakdown.find((item) => item.id === 'basket-large')).toMatchObject({
      label: 'Large Basket',
      pricingModel: 'PER_BASKET',
      valueText: formatCurrency(250),
      isPending: false,
    })
    expectEveryServiceAppearsExactlyOnce(quote)
  })

  it('per-kg only: PER_KILOGRAM -> "R rate/kg" line (no fabricated weight/total) and "Calculated after weighing" headline', () => {
    const quote = buildQuoteFixture({
      subtotal: 0,
      deliveryFee: 45,
      deliveryPricing: pricedDelivery(45),
      estimatedTotal: 45, // delivery only — must never be headlined as the laundry estimate
      serviceLines: [perKg('wash-dry-fold', 'Wash + Dry + Fold', 45, 120)],
    })
    const presentation = buildCustomerEstimatePresentation(quote)

    expect(presentation.kind).toBe('PENDING_WEIGHT')
    expect(presentation.isFullyKnown).toBe(false)
    expect(presentation.hasWeightBasedItems).toBe(true)
    expect(presentation.calculableTotal).toBeUndefined()
    expect(presentation.headline).toBe('Calculated after weighing')
    expect(presentation.headline).not.toBe(`from ${formatCurrency(45)} + weight-based services`)

    expect(presentation.breakdown.find((item) => item.id === 'wash-dry-fold')).toMatchObject({
      label: 'Wash + Dry + Fold',
      pricingModel: 'PER_KILOGRAM',
      valueText: `${formatCurrency(45)}/kg`,
      isPending: true,
    })
    expectEveryServiceAppearsExactlyOnce(quote)
  })

  it('assessment/from only: ASSESSMENT_REQUIRED with a real starting price -> "From R X" line and "from R X" headline', () => {
    const quote = buildQuoteFixture({
      subtotal: 0,
      deliveryFee: 45,
      deliveryPricing: pricedDelivery(45),
      estimatedTotal: 110, // 65 (from) + 45 (delivery)
      serviceLines: [fromAssessment('delicates-wash', 'Delicates Wash', 65)],
    })
    const presentation = buildCustomerEstimatePresentation(quote)

    expect(presentation.kind).toBe('FROM')
    expect(presentation.isFullyKnown).toBe(false)
    expect(presentation.calculableTotal).toBe(110)
    expect(presentation.headline).toBe(`from ${formatCurrency(110)}`)
    expect(presentation.breakdown.find((item) => item.id === 'delicates-wash')).toMatchObject({
      label: 'Delicates Wash',
      pricingModel: 'ASSESSMENT_REQUIRED',
      valueText: `From ${formatCurrency(65)}`,
      isPending: false,
    })
    expectEveryServiceAppearsExactlyOnce(quote)
  })

  it('quote-required only: no numeric floor at all -> "Price confirmed after assessment" line AND headline (never the delivery fee alone)', () => {
    const quote = buildQuoteFixture({
      subtotal: 0,
      deliveryFee: 45,
      deliveryPricing: pricedDelivery(45),
      estimatedTotal: 45, // delivery only
      serviceLines: [quoteRequired('custom-restoration', 'Custom Bag Restoration')],
    })
    const presentation = buildCustomerEstimatePresentation(quote)

    expect(presentation.kind).toBe('PENDING_ASSESSMENT')
    expect(presentation.isFullyKnown).toBe(false)
    expect(presentation.hasQuoteOnlyItems).toBe(true)
    expect(presentation.calculableTotal).toBeUndefined()
    expect(presentation.headline).toBe('Price confirmed after assessment')
    expect(presentation.headline).not.toBe(formatCurrency(45))
    expect(presentation.breakdown.find((item) => item.id === 'custom-restoration')).toMatchObject({
      label: 'Custom Bag Restoration',
      pricingModel: 'QUOTE_REQUIRED',
      valueText: 'Price confirmed after assessment',
      isPending: true,
    })
    expectEveryServiceAppearsExactlyOnce(quote)
  })

  it('fixed + per-kg: exact item plus weight-based item -> both lines shown, headline still "Calculated after weighing"', () => {
    const quote = buildQuoteFixture({
      subtotal: 100,
      deliveryFee: 45,
      deliveryPricing: pricedDelivery(45),
      estimatedTotal: 145, // 100 + 45 delivery (per-kg NOT multiplied in)
      serviceLines: [fixedService('suit', '2-Piece Suit Dry Clean', 100), perKg('wash-dry-fold', 'Wash + Dry + Fold', 45, 120)],
    })
    const presentation = buildCustomerEstimatePresentation(quote)

    expect(presentation.kind).toBe('PENDING_WEIGHT')
    expect(presentation.calculableTotal).toBeUndefined()
    expect(presentation.headline).toBe('Calculated after weighing')
    expect(presentation.breakdown.find((item) => item.id === 'suit')).toMatchObject({
      valueText: formatCurrency(100),
      isPending: false,
    })
    expect(presentation.breakdown.find((item) => item.id === 'wash-dry-fold')).toMatchObject({
      valueText: `${formatCurrency(45)}/kg`,
      isPending: true,
    })
    expectEveryServiceAppearsExactlyOnce(quote)
  })

  it('from + per-kg: reproduces the reported bug basket exactly -> both lines shown, headline still "Calculated after weighing"', () => {
    const quote = buildQuoteFixture({
      subtotal: 0,
      deliveryFee: 45,
      deliveryPricing: pricedDelivery(45),
      estimatedTotal: 110, // 65 (from) + 45 (delivery) — never fabricated
      serviceLines: [fromAssessment('delicates-wash', 'Delicates Wash', 65), perKg('wash-dry-fold', 'Wash + Dry + Fold', 45, 120)],
    })
    const presentation = buildCustomerEstimatePresentation(quote)

    expect(presentation.kind).toBe('PENDING_WEIGHT')
    expect(presentation.calculableTotal).toBeUndefined()
    expect(presentation.headline).toBe('Calculated after weighing')
    expect(presentation.headline).not.toContain(formatCurrency(45))
    expect(presentation.breakdown.find((item) => item.id === 'delicates-wash')).toMatchObject({
      valueText: `From ${formatCurrency(65)}`,
    })
    expectEveryServiceAppearsExactlyOnce(quote)
  })

  it('per-kg + delivery: EXACT REGRESSION — must render the per-kg rate and delivery fee separately, never a fabricated "from" total', () => {
    const quote = buildQuoteFixture({
      subtotal: 0,
      deliveryFee: 45,
      deliveryPricing: pricedDelivery(45),
      estimatedTotal: 45, // delivery fee only
      serviceLines: [perKg('wash-dry-fold', 'Wash + Dry + Fold', 45, 120)],
    })
    const presentation = buildCustomerEstimatePresentation(quote)

    // Selected-service line presentation
    expect(presentation.breakdown).toEqual([
      expect.objectContaining({ id: 'wash-dry-fold', label: 'Wash + Dry + Fold', pricingModel: 'PER_KILOGRAM', valueText: `${formatCurrency(45)}/kg` }),
      expect.objectContaining({ id: 'delivery', label: 'Delivery fee', pricingModel: 'DELIVERY', valueText: formatCurrency(45) }),
    ])

    // Total presentation semantics
    expect(presentation.kind).toBe('PENDING_WEIGHT')
    expect(presentation.headline).toBe('Calculated after weighing')
    expect(presentation.headline).not.toBe(`from ${formatCurrency(45)} + weight-based services`)
    expectEveryServiceAppearsExactlyOnce(quote)
  })

  it('fixed + delivery: fully known service plus delivery -> plain "R X" headline including delivery', () => {
    const quote = buildQuoteFixture({
      subtotal: 100,
      deliveryFee: 45,
      deliveryPricing: pricedDelivery(45),
      estimatedTotal: 145,
      serviceLines: [fixedService('suit', '2-Piece Suit Dry Clean', 100)],
    })
    const presentation = buildCustomerEstimatePresentation(quote)

    expect(presentation.kind).toBe('EXACT')
    expect(presentation.headline).toBe(formatCurrency(145))
    expect(presentation.breakdown).toEqual([
      expect.objectContaining({ id: 'suit', valueText: formatCurrency(100) }),
      expect.objectContaining({ id: 'delivery', label: 'Delivery fee', valueText: formatCurrency(45) }),
    ])
    expectEveryServiceAppearsExactlyOnce(quote)
  })

  it('mixed fixed/from/per-kg/add-ons/delivery: every line renders per its own pricing model, headline stays "Calculated after weighing"', () => {
    const quote = buildQuoteFixture({
      subtotal: 130, // 100 (fixed) + 30 (add-on)
      deliveryFee: 45,
      deliveryPricing: pricedDelivery(45),
      estimatedTotal: 240, // 130 + 65 (from) + 45 (delivery) — per-kg excluded
      serviceLines: [
        fixedService('suit', '2-Piece Suit Dry Clean', 100),
        fromAssessment('delicates-wash', 'Delicates Wash', 65),
        perKg('wash-dry-fold', 'Wash + Dry + Fold', 45, 120),
        addOn('starch', 'Starch Finish', 30),
      ],
    })
    const presentation = buildCustomerEstimatePresentation(quote)

    expect(presentation.kind).toBe('PENDING_WEIGHT')
    expect(presentation.calculableTotal).toBeUndefined()
    expect(presentation.headline).toBe('Calculated after weighing')

    expect(presentation.breakdown.find((item) => item.id === 'suit')).toMatchObject({ pricingModel: 'FIXED_SERVICE', valueText: formatCurrency(100) })
    expect(presentation.breakdown.find((item) => item.id === 'delicates-wash')).toMatchObject({ pricingModel: 'ASSESSMENT_REQUIRED', valueText: `From ${formatCurrency(65)}` })
    expect(presentation.breakdown.find((item) => item.id === 'wash-dry-fold')).toMatchObject({ pricingModel: 'PER_KILOGRAM', valueText: `${formatCurrency(45)}/kg` })
    expect(presentation.breakdown.find((item) => item.id === 'starch')).toMatchObject({ pricingModel: 'ADD_ON', valueText: formatCurrency(30) })
    expect(presentation.breakdown.find((item) => item.id === 'delivery')).toMatchObject({ pricingModel: 'DELIVERY', valueText: formatCurrency(45) })

    expectEveryServiceAppearsExactlyOnce(quote)
  })

  it('free delivery: a fully known basket over the free-delivery threshold shows "FREE" on the delivery line, not R0.00 folded silently', () => {
    const quote = buildQuoteFixture({
      subtotal: 320,
      deliveryFee: 0,
      freeDeliveryGap: 0,
      deliveryPricing: pricedDelivery(0, {
        freeDeliveryUnlocked: true,
        freeDeliveryThreshold: 300,
        remainingForFreeDelivery: 0,
        progressPercentage: 100,
        qualifyingBasketValue: 320,
      }),
      estimatedTotal: 320,
      serviceLines: [fixedService('suit', '2-Piece Suit Dry Clean', 320)],
    })
    const presentation = buildCustomerEstimatePresentation(quote)

    expect(presentation.kind).toBe('EXACT')
    expect(presentation.headline).toBe(formatCurrency(320))
    expect(presentation.breakdown.find((item) => item.id === 'delivery')).toMatchObject({
      label: 'Delivery fee',
      pricingModel: 'DELIVERY',
      valueText: 'FREE',
    })
    expectEveryServiceAppearsExactlyOnce(quote)
  })

  it('PENDING_DISTANCE: unresolved distance must render a pending delivery-fee state, never "FREE"', () => {
    const quote = buildQuoteFixture({
      subtotal: 100,
      deliveryFee: 0,
      deliveryPricing: { status: 'PENDING_DISTANCE' },
      estimatedTotal: 100,
      serviceLines: [fixedService('suit', '2-Piece Suit Dry Clean', 100)],
    })
    const presentation = buildCustomerEstimatePresentation(quote)

    const deliveryLine = presentation.breakdown.find((item) => item.id === 'delivery')
    expect(deliveryLine?.valueText).not.toBe('FREE')
    expect(deliveryLine).toMatchObject({
      label: 'Delivery fee',
      pricingModel: 'DELIVERY',
      valueText: 'Delivery fee calculated from your address',
      isPending: true,
    })
    expectEveryServiceAppearsExactlyOnce(quote)
  })

  it('NOT_APPLICABLE: STORE_COLLECTION renders a distinct "Not applicable" delivery line, never "FREE"', () => {
    const quote = buildQuoteFixture({
      subtotal: 100,
      deliveryFee: 0,
      deliveryPricing: { status: 'NOT_APPLICABLE' },
      estimatedTotal: 100,
      serviceLines: [fixedService('suit', '2-Piece Suit Dry Clean', 100)],
    })
    const presentation = buildCustomerEstimatePresentation(quote)

    const deliveryLine = presentation.breakdown.find((item) => item.id === 'delivery')
    expect(deliveryLine?.valueText).not.toBe('FREE')
    expect(deliveryLine).toMatchObject({
      label: 'Delivery fee',
      pricingModel: 'DELIVERY',
      valueText: 'Not applicable',
      isPending: false,
    })
    expectEveryServiceAppearsExactlyOnce(quote)
  })

  it('preserves loyalty redemption: a discount reduces the headline total like any other known component', () => {
    const quote = buildQuoteFixture({
      subtotal: 150,
      deliveryFee: 45,
      deliveryPricing: pricedDelivery(45),
      discountTotal: 75,
      loyaltyRedemptionTotal: 75,
      estimatedTotal: 120, // 150 + 45 - 75
      serviceLines: [fixedService('suit', '2-Piece Suit Dry Clean', 150)],
    })
    const presentation = buildCustomerEstimatePresentation(quote)
    expect(presentation.kind).toBe('EXACT')
    expect(presentation.headline).toBe(formatCurrency(120))
  })

  it('never treats finalInvoiceTotal-style figures as part of the estimate presentation (structurally separate)', () => {
    // PricingQuote has no finalInvoiceTotal/finalTotal field at all — the
    // presentation function only ever reads estimate-stage fields.
    const quote = buildQuoteFixture({
      subtotal: 100,
      deliveryFee: 45,
      deliveryPricing: pricedDelivery(45),
      estimatedTotal: 145,
      serviceLines: [fixedService('suit', '2-Piece Suit Dry Clean', 100)],
    })
    expect('finalInvoiceTotal' in quote).toBe(false)
    expect('finalTotal' in quote).toBe(false)
    expect(buildCustomerEstimatePresentation(quote).calculableTotal).toBe(145)
  })
})
