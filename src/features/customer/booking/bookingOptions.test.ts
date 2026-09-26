import { describe, expect, it } from 'vitest'
import { bookingWindows, generateBookingWindows } from '@/features/customer/booking/bookingOptions'

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
