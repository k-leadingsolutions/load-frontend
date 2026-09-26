import { describe, expect, it } from 'vitest'
import {
  bookingWindows,
  generateBookingWindows,
  isDeliveryWindowAfterPickup,
  parseBookingWindowStart,
} from '@/features/customer/booking/bookingOptions'

const WINDOW_PATTERN = /^\d{4}-\d{2}-\d{2} \| \d{2}:\d{2} - \d{2}:\d{2}$/

describe('generateBookingWindows', () => {
  it('never offers a window on or before the reference date', () => {
    const referenceDate = new Date(2026, 7, 9) // 2026-08-09 — the old hard-coded date
    const windows = generateBookingWindows(referenceDate)
    const referenceIso = '2026-08-09'

    expect(windows.length).toBeGreaterThan(0)
    for (const window of windows) {
      const [datePart] = window.split(' | ')
      expect(datePart! > referenceIso).toBe(true)
    }
  })

  it('matches the "YYYY-MM-DD | HH:MM - HH:MM" format expected by the mock order service', () => {
    const windows = generateBookingWindows(new Date(2026, 0, 1))
    for (const window of windows) {
      expect(window).toMatch(WINDOW_PATTERN)
    }
  })

  it('is deterministic for a given reference date', () => {
    const referenceDate = new Date(2026, 5, 15)
    expect(generateBookingWindows(referenceDate)).toEqual(generateBookingWindows(referenceDate))
  })

  it('offers two time slots per bookable day, starting tomorrow', () => {
    const referenceDate = new Date(2026, 2, 10) // 2026-03-10
    const windows = generateBookingWindows(referenceDate)

    expect(windows).toEqual([
      '2026-03-11 | 09:00 - 11:00',
      '2026-03-11 | 14:00 - 16:00',
      '2026-03-12 | 09:00 - 11:00',
      '2026-03-12 | 14:00 - 16:00',
    ])
  })

  it('correctly rolls over a month/year boundary', () => {
    const referenceDate = new Date(2026, 11, 31) // 2026-12-31
    const windows = generateBookingWindows(referenceDate)

    expect(windows[0]).toBe('2027-01-01 | 09:00 - 11:00')
  })

  it('the exported bookingWindows are all strictly after today', () => {
    const today = new Date()
    const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

    expect(bookingWindows.length).toBeGreaterThan(0)
    for (const window of bookingWindows) {
      const [datePart] = window.split(' | ')
      expect(datePart! > todayIso).toBe(true)
    }
  })
})

describe('isDeliveryWindowAfterPickup', () => {
  const day1Slot1 = '2026-03-11 | 09:00 - 11:00'
  const day1Slot2 = '2026-03-11 | 14:00 - 16:00'
  const day2Slot1 = '2026-03-12 | 09:00 - 11:00'

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

describe('parseBookingWindowStart', () => {
  it('parses a valid window label into its slot start timestamp', () => {
    const timestamp = parseBookingWindowStart('2026-03-11 | 09:00 - 11:00')
    const expected = new Date(2026, 2, 11, 9, 0).getTime()
    expect(timestamp).toBe(expected)
  })

  it('returns null for an invalid label', () => {
    expect(parseBookingWindowStart('garbage')).toBeNull()
    expect(parseBookingWindowStart('')).toBeNull()
  })
})
