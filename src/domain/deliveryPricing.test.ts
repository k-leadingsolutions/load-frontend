import { describe, expect, it } from 'vitest'

import type { EstimateLine } from '@/domain/models/pricing'
import type { Address } from '@/domain/models/customer'

import {
  calculateDeliveryPricing,
  calculateQualifyingBasketValue,
  resolveDeliveryDistanceKm,
} from '@/domain/deliveryPricing'

describe('calculateDeliveryPricing — distance tiers', () => {
  it('1km and 5km both resolve to the R49 near tier', () => {
    expect(
      calculateDeliveryPricing({ distanceKm: 1, qualifyingBasketValue: 0 }).standardDeliveryFee,
    ).toBe(49)
    const at5 = calculateDeliveryPricing({ distanceKm: 5, qualifyingBasketValue: 0 })
    expect(at5.tier).toBe('NEAR_1_TO_5KM')
    expect(at5.standardDeliveryFee).toBe(49)
  })

  it('5.01km and 10km both resolve to the R79 mid tier', () => {
    const at501 = calculateDeliveryPricing({ distanceKm: 5.01, qualifyingBasketValue: 0 })
    expect(at501.tier).toBe('MID_OVER_5_TO_10KM')
    expect(at501.standardDeliveryFee).toBe(79)

    const at10 = calculateDeliveryPricing({ distanceKm: 10, qualifyingBasketValue: 0 })
    expect(at10.tier).toBe('MID_OVER_5_TO_10KM')
    expect(at10.standardDeliveryFee).toBe(79)
  })

  it('10.01km and beyond resolve to the R99 far tier', () => {
    const at1001 = calculateDeliveryPricing({ distanceKm: 10.01, qualifyingBasketValue: 0 })
    expect(at1001.tier).toBe('FAR_OVER_10KM')
    expect(at1001.standardDeliveryFee).toBe(99)

    const at20 = calculateDeliveryPricing({ distanceKm: 20, qualifyingBasketValue: 999 })
    expect(at20.tier).toBe('FAR_OVER_10KM')
    expect(at20.standardDeliveryFee).toBe(99)
  })
})

describe('calculateDeliveryPricing — within 5km / R300 threshold', () => {
  it('R0 basket → R300 to go / 0% progress', () => {
    const result = calculateDeliveryPricing({ distanceKm: 4, qualifyingBasketValue: 0 })
    expect(result.freeDeliveryThreshold).toBe(300)
    expect(result.remainingForFreeDelivery).toBe(300)
    expect(result.progressPercentage).toBe(0)
    expect(result.freeDeliveryUnlocked).toBe(false)
    expect(result.effectiveDeliveryFee).toBe(49)
  })

  it('R60 basket → R240 to go / 20% progress', () => {
    const result = calculateDeliveryPricing({ distanceKm: 4, qualifyingBasketValue: 60 })
    expect(result.standardDeliveryFee).toBe(49)
    expect(result.freeDeliveryThreshold).toBe(300)
    expect(result.remainingForFreeDelivery).toBe(240)
    expect(result.progressPercentage).toBe(20)
    expect(result.freeDeliveryUnlocked).toBe(false)
    expect(result.effectiveDeliveryFee).toBe(49)
  })

  it('R150 basket → R150 to go / 50% progress', () => {
    const result = calculateDeliveryPricing({ distanceKm: 4, qualifyingBasketValue: 150 })
    expect(result.remainingForFreeDelivery).toBe(150)
    expect(result.progressPercentage).toBe(50)
  })

  it('R240 basket → R60 to go / 80% progress', () => {
    const result = calculateDeliveryPricing({ distanceKm: 4, qualifyingBasketValue: 240 })
    expect(result.remainingForFreeDelivery).toBe(60)
    expect(result.progressPercentage).toBe(80)
  })

  it('R300+ basket → unlocked / 100% progress / R0 effective fee', () => {
    const atThreshold = calculateDeliveryPricing({ distanceKm: 4, qualifyingBasketValue: 300 })
    expect(atThreshold.freeDeliveryUnlocked).toBe(true)
    expect(atThreshold.progressPercentage).toBe(100)
    expect(atThreshold.remainingForFreeDelivery).toBe(0)
    expect(atThreshold.effectiveDeliveryFee).toBe(0)

    const overThreshold = calculateDeliveryPricing({ distanceKm: 4, qualifyingBasketValue: 500 })
    expect(overThreshold.freeDeliveryUnlocked).toBe(true)
    expect(overThreshold.progressPercentage).toBe(100)
    expect(overThreshold.remainingForFreeDelivery).toBe(0)
    expect(overThreshold.effectiveDeliveryFee).toBe(0)
  })
})

describe('calculateDeliveryPricing — 6-10km / R600 threshold', () => {
  it('R300 basket → R300 to go / 50% progress', () => {
    const result = calculateDeliveryPricing({ distanceKm: 8, qualifyingBasketValue: 300 })
    expect(result.standardDeliveryFee).toBe(79)
    expect(result.freeDeliveryThreshold).toBe(600)
    expect(result.remainingForFreeDelivery).toBe(300)
    expect(result.progressPercentage).toBe(50)
    expect(result.freeDeliveryUnlocked).toBe(false)
  })

  it('R599 basket → R1 to go', () => {
    const result = calculateDeliveryPricing({ distanceKm: 8, qualifyingBasketValue: 599 })
    expect(result.remainingForFreeDelivery).toBe(1)
    expect(result.freeDeliveryUnlocked).toBe(false)
  })

  it('R600+ basket → unlocked / 100% / R0 effective fee', () => {
    const result = calculateDeliveryPricing({ distanceKm: 8, qualifyingBasketValue: 600 })
    expect(result.freeDeliveryUnlocked).toBe(true)
    expect(result.progressPercentage).toBe(100)
    expect(result.remainingForFreeDelivery).toBe(0)
    expect(result.effectiveDeliveryFee).toBe(0)
  })
})

describe('calculateDeliveryPricing — beyond 10km has no threshold', () => {
  it('does not invent a threshold/progress at any basket value', () => {
    const result = calculateDeliveryPricing({ distanceKm: 12, qualifyingBasketValue: 5000 })
    expect(result.standardDeliveryFee).toBe(99)
    expect(result.freeDeliveryThreshold).toBeUndefined()
    expect(result.remainingForFreeDelivery).toBeUndefined()
    expect(result.progressPercentage).toBeUndefined()
    expect(result.freeDeliveryUnlocked).toBe(false)
    expect(result.effectiveDeliveryFee).toBe(99)
  })
})

const line = (overrides: Partial<EstimateLine>): EstimateLine => ({
  id: 'line-1',
  label: 'Test line',
  pricingModel: 'PER_ITEM',
  unitLabel: 'item',
  quantity: 1,
  ...overrides,
})

describe('calculateQualifyingBasketValue', () => {
  it('sums FIXED_SERVICE / PER_ITEM / PER_BASKET / ADD_ON by real lineTotal', () => {
    const total = calculateQualifyingBasketValue([
      line({ id: '1', pricingModel: 'FIXED_SERVICE', lineTotal: 120 }),
      line({ id: '2', pricingModel: 'PER_ITEM', lineTotal: 80, quantity: 2 }),
      line({ id: '3', pricingModel: 'PER_BASKET', lineTotal: 60 }),
      line({ id: '4', pricingModel: 'ADD_ON', lineTotal: 20 }),
    ])
    expect(total).toBe(120 + 80 + 60 + 20)
  })

  it('uses the provisional catalogue rate for PER_KILOGRAM, without fabricating weight', () => {
    const total = calculateQualifyingBasketValue([
      line({ id: '1', pricingModel: 'PER_KILOGRAM', ratePerKg: 60, unitLabel: 'kg' }),
    ])
    expect(total).toBe(60)
  })

  it('uses a genuine numeric startingPrice for ASSESSMENT_REQUIRED provisionally', () => {
    const total = calculateQualifyingBasketValue([
      line({ id: '1', pricingModel: 'ASSESSMENT_REQUIRED', startingPrice: 150 }),
    ])
    expect(total).toBe(150)
  })

  it('contributes 0 for a true quote-only line with no numeric catalogue value', () => {
    const total = calculateQualifyingBasketValue([
      line({ id: '1', pricingModel: 'QUOTE_REQUIRED', isQuoteOnly: true }),
    ])
    expect(total).toBe(0)
  })

  it('contributes 0 for any line explicitly flagged isQuoteOnly, regardless of pricing model', () => {
    const total = calculateQualifyingBasketValue([
      line({ id: '1', pricingModel: 'ASSESSMENT_REQUIRED', isQuoteOnly: true, startingPrice: 150 }),
    ])
    expect(total).toBe(0)
  })

  it('sums a mixed basket of categories correctly', () => {
    const total = calculateQualifyingBasketValue([
      line({ id: '1', pricingModel: 'FIXED_SERVICE', lineTotal: 100 }),
      line({ id: '2', pricingModel: 'PER_KILOGRAM', ratePerKg: 45 }),
      line({ id: '3', pricingModel: 'ASSESSMENT_REQUIRED', startingPrice: 90 }),
      line({ id: '4', pricingModel: 'QUOTE_REQUIRED', isQuoteOnly: true }),
    ])
    expect(total).toBe(100 + 45 + 90 + 0)
  })

  it('never includes a delivery fee, because delivery is never represented as a service line', () => {
    // Delivery fee is computed separately by calculateDeliveryPricing and is
    // never part of the serviceLines array passed here.
    const total = calculateQualifyingBasketValue([line({ id: '1', pricingModel: 'FIXED_SERVICE', lineTotal: 100 })])
    expect(total).toBe(100)
  })
})

describe('resolveDeliveryDistanceKm', () => {
  it('reads the distanceKm carried on the address record', () => {
    const address: Address = {
      id: 'addr-1',
      label: 'Home',
      line1: '1 Test Street',
      suburb: 'Sandton',
      city: 'Johannesburg',
      postalCode: '2196',
      distanceKm: 4.2,
    } as Address
    expect(resolveDeliveryDistanceKm(address)).toBe(4.2)
  })

  it('returns undefined (not a fabricated 0km) when no distance is known', () => {
    expect(resolveDeliveryDistanceKm(undefined)).toBeUndefined()
    expect(resolveDeliveryDistanceKm(null)).toBeUndefined()
    expect(
      resolveDeliveryDistanceKm({
        id: 'addr-2',
        label: 'Office',
        line1: '2 Test Street',
        suburb: 'Rosebank',
        city: 'Johannesburg',
        postalCode: '2196',
      } as Address),
    ).toBeUndefined()
  })
})

describe('calculateDeliveryPricing — integration example from the business rules', () => {
  it('matches: calculateDeliveryPricing({ distanceKm: 4, qualifyingBasketValue: 60 })', () => {
    const result = calculateDeliveryPricing({ distanceKm: 4, qualifyingBasketValue: 60 })
    expect(result.standardDeliveryFee).toBe(49)
    expect(result.freeDeliveryThreshold).toBe(300)
    expect(result.remainingForFreeDelivery).toBe(240)
    expect(result.progressPercentage).toBe(20)
  })
})
