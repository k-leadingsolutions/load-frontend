import { describe, expect, it } from 'vitest'
import {
  BOOKING_WINDOW_SLOTS,
  evaluateDeliverySchedule,
  getWindowSlotsForDate,
  isDeliveryWindowAfterPickup,
  isWithinOperatingHours,
  minBookablePickupDate,
  parseBookingWindowEnd,
  parseBookingWindowStart,
} from '@/features/customer/booking/bookingOptions'

describe('minBookablePickupDate', () => {
  it('is always at least tomorrow (SAST), never today', () => {
    // 2026-03-10 10:00 SAST == 2026-03-10 08:00 UTC
    const referenceEpoch = Date.UTC(2026, 2, 10, 8, 0)
    expect(minBookablePickupDate(referenceEpoch)).toBe('2026-03-11')
  })

  it('is unaffected by the time of day (even late SAST evening still rolls to tomorrow)', () => {
    // 2026-03-10 23:30 SAST == 2026-03-10 21:30 UTC
    const referenceEpoch = Date.UTC(2026, 2, 10, 21, 30)
    expect(minBookablePickupDate(referenceEpoch)).toBe('2026-03-11')
  })

  it('correctly rolls over a month/year boundary', () => {
    const referenceEpoch = Date.UTC(2026, 11, 31, 8, 0)
    expect(minBookablePickupDate(referenceEpoch)).toBe('2027-01-01')
  })

  it('is unaffected by the host/browser timezone — only SAST wall-clock matters', () => {
    // A UTC instant that is late evening in SAST but still "today" in UTC.
    // 2026-06-15 23:00 SAST == 2026-06-15 21:00 UTC.
    const referenceEpoch = Date.UTC(2026, 5, 15, 21, 0)
    expect(minBookablePickupDate(referenceEpoch)).toBe('2026-06-16')
  })
})

describe('getWindowSlotsForDate', () => {
  it('offers exactly the two fixed slots for a given date', () => {
    expect(getWindowSlotsForDate('2026-03-11')).toEqual([
      '2026-03-11 | 08:00 - 12:00',
      '2026-03-11 | 13:00 - 17:00',
    ])
  })

  it('matches the exported BOOKING_WINDOW_SLOTS', () => {
    for (const slot of BOOKING_WINDOW_SLOTS) {
      expect(getWindowSlotsForDate('2026-01-01')).toContain(`2026-01-01 | ${slot}`)
    }
  })
})

describe('parseBookingWindowStart / parseBookingWindowEnd (SAST timezone correctness)', () => {
  it('parses a window label as SAST wall-clock time, independent of host timezone', () => {
    // '2026-03-11 | 08:00 - 12:00' in SAST (UTC+2) == 2026-03-11 06:00 UTC.
    const start = parseBookingWindowStart('2026-03-11 | 08:00 - 12:00')
    expect(start).toBe(Date.UTC(2026, 2, 11, 6, 0))
  })

  it('parses the end of a window label as SAST wall-clock time', () => {
    // '2026-03-11 | 08:00 - 12:00' end (12:00 SAST) == 2026-03-11 10:00 UTC.
    const end = parseBookingWindowEnd('2026-03-11 | 08:00 - 12:00')
    expect(end).toBe(Date.UTC(2026, 2, 11, 10, 0))
  })

  it('returns null for an invalid label', () => {
    expect(parseBookingWindowStart('garbage')).toBeNull()
    expect(parseBookingWindowStart('')).toBeNull()
    expect(parseBookingWindowEnd('garbage')).toBeNull()
  })
})

describe('isWithinOperatingHours', () => {
  it('accepts both fixed booking slots (within 07:30–17:00 SAST)', () => {
    expect(isWithinOperatingHours('2026-03-11 | 08:00 - 12:00')).toBe(true)
    expect(isWithinOperatingHours('2026-03-11 | 13:00 - 17:00')).toBe(true)
  })

  it('rejects a window outside LOAD operating hours', () => {
    expect(isWithinOperatingHours('2026-03-11 | 06:00 - 07:00')).toBe(false)
    expect(isWithinOperatingHours('2026-03-11 | 17:00 - 19:00')).toBe(false)
  })

  it('rejects an unparseable label', () => {
    expect(isWithinOperatingHours('garbage')).toBe(false)
  })
})

describe('isDeliveryWindowAfterPickup', () => {
  const day1Slot1 = '2026-03-11 | 08:00 - 12:00'
  const day1Slot2 = '2026-03-11 | 13:00 - 17:00'
  const day2Slot1 = '2026-03-12 | 08:00 - 12:00'

  it('rejects the same slot for pickup and delivery', () => {
    expect(isDeliveryWindowAfterPickup(day1Slot1, day1Slot1)).toBe(false)
  })

  it('rejects a delivery window before the pickup window', () => {
    expect(isDeliveryWindowAfterPickup(day1Slot2, day1Slot1)).toBe(false)
  })

  it('accepts a delivery window strictly after the pickup window, same day', () => {
    expect(isDeliveryWindowAfterPickup(day1Slot1, day1Slot2)).toBe(true)
  })

  it('accepts a delivery window on a later day', () => {
    expect(isDeliveryWindowAfterPickup(day1Slot1, day2Slot1)).toBe(true)
    expect(isDeliveryWindowAfterPickup(day1Slot2, day2Slot1)).toBe(true)
  })

  it('rejects when either window is empty or unparseable', () => {
    expect(isDeliveryWindowAfterPickup('', day1Slot2)).toBe(false)
    expect(isDeliveryWindowAfterPickup(day1Slot1, '')).toBe(false)
    expect(isDeliveryWindowAfterPickup('not-a-window', day1Slot2)).toBe(false)
  })
})

describe('evaluateDeliverySchedule (24h production gap)', () => {
  it('rejects a same-day delivery slot immediately after a morning pickup (< 24h gap)', () => {
    // pickup 08:00-12:00 ends 12:00; +24h => next day 12:00. Same-day
    // afternoon slot (13:00) is only ~1h later, nowhere near 24h.
    const result = evaluateDeliverySchedule('2026-03-11 | 08:00 - 12:00', '2026-03-11 | 13:00 - 17:00')
    expect(result.feasible).toBe(false)
  })

  it('rejects the very next day morning slot when it falls short of the 24h gap', () => {
    // pickup ends day1 12:00; +24h => day2 12:00. Day2 morning slot starts
    // 08:00, which is before the day2 12:00 threshold => infeasible.
    const result = evaluateDeliverySchedule('2026-03-11 | 08:00 - 12:00', '2026-03-12 | 08:00 - 12:00')
    expect(result.feasible).toBe(false)
  })

  it('accepts the next day afternoon slot once it clears the 24h gap', () => {
    // pickup ends day1 12:00; +24h => day2 12:00. Day2 afternoon slot starts
    // 13:00, which is after the day2 12:00 threshold => feasible.
    const result = evaluateDeliverySchedule('2026-03-11 | 08:00 - 12:00', '2026-03-12 | 13:00 - 17:00')
    expect(result.feasible).toBe(true)
  })

  it('rejects an afternoon pickup followed by the very next available day slot when short of 24h', () => {
    // pickup ends day1 17:00; +24h => day2 17:00. Day2 afternoon slot starts
    // 13:00, still before the day2 17:00 threshold => infeasible.
    const result = evaluateDeliverySchedule('2026-03-11 | 13:00 - 17:00', '2026-03-12 | 13:00 - 17:00')
    expect(result.feasible).toBe(false)
  })

  it('accepts the following day morning slot once it clears an afternoon pickup 24h gap', () => {
    // pickup ends day1 17:00; +24h => day2 17:00. Day3 morning slot starts
    // day3 08:00, which is after day2 17:00 => feasible.
    const result = evaluateDeliverySchedule('2026-03-11 | 13:00 - 17:00', '2026-03-13 | 08:00 - 12:00')
    expect(result.feasible).toBe(true)
  })

  it('rejects when either window is missing', () => {
    expect(evaluateDeliverySchedule('', '2026-03-12 | 13:00 - 17:00').feasible).toBe(false)
    expect(evaluateDeliverySchedule('2026-03-11 | 08:00 - 12:00', '').feasible).toBe(false)
  })
})
