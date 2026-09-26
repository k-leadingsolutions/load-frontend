/** Fixed collection/delivery time slots offered on each bookable day. */
const BOOKING_SLOT_TIMES = ['09:00 - 11:00', '14:00 - 16:00']

/**
 * How many upcoming days are offered as bookable windows. Starts from
 * tomorrow (never today) so a slot can never appear already in the past
 * regardless of what time of day the Customer is browsing.
 */
const BOOKING_WINDOW_DAYS_AHEAD = 2

const pad2 = (value: number) => value.toString().padStart(2, '0')

/** Local-calendar YYYY-MM-DD — deliberately avoids `toISOString()`, which converts to UTC and can shift the date across a timezone boundary. */
const toLocalIsoDate = (date: Date) => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`

/**
 * Derives the Customer-facing pickup/delivery window options from the
 * current date, so they are always future-bookable — never hard-coded,
 * never in the past. Format (`YYYY-MM-DD | HH:MM - HH:MM`) matches what
 * `mockCustomerOrderService` expects to split on `|` when building a
 * `PickupDeliveryWindow`.
 */
export const generateBookingWindows = (referenceDate: Date = new Date()): string[] => {
  const windows: string[] = []
  for (let dayOffset = 1; dayOffset <= BOOKING_WINDOW_DAYS_AHEAD; dayOffset += 1) {
    const day = new Date(referenceDate)
    day.setDate(day.getDate() + dayOffset)
    const isoDate = toLocalIsoDate(day)
    for (const slot of BOOKING_SLOT_TIMES) {
      windows.push(`${isoDate} | ${slot}`)
    }
  }
  return windows
}

export const bookingWindows = generateBookingWindows()

const BOOKING_WINDOW_PATTERN = /^(\d{4})-(\d{2})-(\d{2}) \| (\d{2}):(\d{2}) - \d{2}:\d{2}$/

/**
 * Parses a `'YYYY-MM-DD | HH:MM - HH:MM'` window label into its slot START
 * timestamp (ms since epoch, local time), for chronological comparisons.
 * Returns `null` if the label is empty or doesn't match the expected format.
 */
export const parseBookingWindowStart = (windowLabel: string): number | null => {
  const match = BOOKING_WINDOW_PATTERN.exec(windowLabel.trim())
  if (!match) return null
  const [, year, month, day, hour, minute] = match
  return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute)).getTime()
}

/**
 * A delivery window is only valid when it is strictly chronologically after
 * the selected pickup window — the same slot, or an earlier slot, is never
 * valid. Returns `false` (invalid) if either label is empty/unparseable.
 */
export const isDeliveryWindowAfterPickup = (pickupWindow: string, deliveryWindow: string): boolean => {
  const pickupStart = parseBookingWindowStart(pickupWindow)
  const deliveryStart = parseBookingWindowStart(deliveryWindow)
  if (pickupStart === null || deliveryStart === null) return false
  return deliveryStart > pickupStart
}

export const premiumBookingHighlights = [
  'Express turnaround upgrade',
  'Suggested add-ons based on service choice',
  'Free-delivery threshold progress',
  'Promotion and loyalty redemption support',
]
