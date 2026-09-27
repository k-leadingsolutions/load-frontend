import { formatWindowDateAndTime } from '@/utils/format'

describe('formatWindowDateAndTime', () => {
  it('combines an ISO date with its time-range label into a single actual-date-and-time string', () => {
    expect(formatWindowDateAndTime('2026-08-08', '09:00 - 11:00')).toBe('Sat, 08 Aug 2026 · 09:00 - 11:00')
  })

  it('falls back to just the formatted date when no label is given', () => {
    expect(formatWindowDateAndTime('2026-08-08', undefined)).toBe('Sat, 08 Aug 2026')
  })

  it('falls back to just the label when no date is given', () => {
    expect(formatWindowDateAndTime(undefined, '09:00 - 11:00')).toBe('09:00 - 11:00')
  })

  it('returns undefined when neither date nor label is available', () => {
    expect(formatWindowDateAndTime(undefined, undefined)).toBeUndefined()
  })
})
