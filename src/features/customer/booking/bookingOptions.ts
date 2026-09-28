/**
 * Customer pickup/delivery scheduling rules.
 *
 * All business-hours/production-gap semantics are evaluated in
 * Africa/Johannesburg (SAST, UTC+2, no DST) wall-clock time, regardless of
 * the browser/OS timezone the Customer happens to be using. SAST has a
 * fixed offset year-round, so this can be computed with plain `Date` epoch
 * arithmetic rather than pulling in a timezone library.
 */
const SAST_OFFSET_MINUTES = 120
const SAST_OFFSET_MS = SAST_OFFSET_MINUTES * 60 * 1000

/** The only two collection/delivery windows LOAD offers on any bookable day. */
export const BOOKING_WINDOW_SLOTS = ['08:00 - 12:00', '13:00 - 17:00'] as const

/** LOAD's store/operating hours, in SAST wall-clock time. */
export const LOAD_OPERATING_HOURS = { openHour: 7, openMinute: 30, closeHour: 17, closeMinute: 0 }

/** Minimum production time required between pickup completion and delivery start. */
export const MIN_PRODUCTION_HOURS = 24

const pad2 = (value: number) => value.toString().padStart(2, '0')

interface SastWallClock {
  year: number
  month: number // 1-12 (calendar month, 1 = January)
  day: number
  hour: number
  minute: number
}

/** Reads the SAST wall-clock components of a real (UTC) instant. */
const epochToSastWallClock = (epochMs: number): SastWallClock => {
  const shifted = new Date(epochMs + SAST_OFFSET_MS)
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
  }
}

/** Converts a SAST wall-clock instant back into a real epoch timestamp (ms). */
const sastWallClockToEpoch = (year: number, month: number, day: number, hour: number, minute: number): number =>
  Date.UTC(year, month - 1, day, hour, minute) - SAST_OFFSET_MS

/** `YYYY-MM-DD` for a SAST wall-clock date. */
const toIsoDate = ({ year, month, day }: SastWallClock) => `${year}-${pad2(month)}-${pad2(day)}`

/**
 * Earliest bookable pickup date (`YYYY-MM-DD`, SAST) — always at least
 * tomorrow, never today, regardless of what time of day the Customer is
 * browsing or what timezone their device is set to.
 */
export const minBookablePickupDate = (referenceEpoch: number = Date.now()): string => {
  const now = epochToSastWallClock(referenceEpoch)
  const tomorrowEpoch = sastWallClockToEpoch(now.year, now.month, now.day, 0, 0) + 24 * 60 * 60 * 1000
  return toIsoDate(epochToSastWallClock(tomorrowEpoch))
}

/** Builds the fixed `'YYYY-MM-DD | HH:MM - HH:MM'` window labels offered for a given bookable date. */
export const getWindowSlotsForDate = (isoDate: string): string[] =>
  BOOKING_WINDOW_SLOTS.map((slot) => `${isoDate} | ${slot}`)

const BOOKING_WINDOW_PATTERN = /^(\d{4})-(\d{2})-(\d{2}) \| (\d{2}):(\d{2}) - (\d{2}):(\d{2})$/

/**
 * Parses a `'YYYY-MM-DD | HH:MM - HH:MM'` window label into its slot START
 * timestamp (real ms-since-epoch, evaluated as SAST wall-clock time), for
 * chronological comparisons. Returns `null` if the label is empty or
 * doesn't match the expected format.
 */
export const parseBookingWindowStart = (windowLabel: string): number | null => {
  const match = BOOKING_WINDOW_PATTERN.exec(windowLabel.trim())
  if (!match) return null
  const [, year, month, day, hour, minute] = match
  return sastWallClockToEpoch(Number(year), Number(month), Number(day), Number(hour), Number(minute))
}

/** Parses a window label into its slot END timestamp (real ms-since-epoch, SAST wall-clock). */
export const parseBookingWindowEnd = (windowLabel: string): number | null => {
  const match = BOOKING_WINDOW_PATTERN.exec(windowLabel.trim())
  if (!match) return null
  const [, year, month, day, , , endHour, endMinute] = match
  return sastWallClockToEpoch(Number(year), Number(month), Number(day), Number(endHour), Number(endMinute))
}

/**
 * A delivery window is only valid when it is strictly chronologically after
 * the selected pickup window — the same slot, or an earlier slot, is never
 * valid. Returns `false` (invalid) if either label is empty/unparseable.
 *
 * This is a pure chronology check only — it does NOT enforce the minimum
 * production gap or operating hours. Use `evaluateDeliverySchedule` for full
 * feasibility.
 */
export const isDeliveryWindowAfterPickup = (pickupWindow: string, deliveryWindow: string): boolean => {
  const pickupStart = parseBookingWindowStart(pickupWindow)
  const deliveryStart = parseBookingWindowStart(deliveryWindow)
  if (pickupStart === null || deliveryStart === null) return false
  return deliveryStart > pickupStart
}

/** A window's start and end both fall within LOAD's SAST operating hours (07:30–17:00). */
export const isWithinOperatingHours = (windowLabel: string): boolean => {
  const match = BOOKING_WINDOW_PATTERN.exec(windowLabel.trim())
  if (!match) return false
  const [, , , , startHour, startMinute, endHour, endMinute] = match
  const openMinutes = LOAD_OPERATING_HOURS.openHour * 60 + LOAD_OPERATING_HOURS.openMinute
  const closeMinutes = LOAD_OPERATING_HOURS.closeHour * 60 + LOAD_OPERATING_HOURS.closeMinute
  const startMinutes = Number(startHour) * 60 + Number(startMinute)
  const endMinutes = Number(endHour) * 60 + Number(endMinute)
  return startMinutes >= openMinutes && endMinutes <= closeMinutes
}

/**
 * Extension point for a future address-to-address distance/travel-time
 * service. No such capability exists in LOAD today (only Driver-side
 * per-stop route telemetry, which is unrelated to Customer-booking
 * feasibility) — this intentionally always returns `0` rather than
 * fabricating a travel estimate. Once a real distance/travel-time service is
 * available, wire it in here; every caller of `evaluateDeliverySchedule`
 * will automatically account for it.
 */
export const estimateTravelBufferMinutes = (
  _pickupAddressId?: string,
  _deliveryAddressId?: string,
): number => 0

export interface DeliveryScheduleEvaluation {
  feasible: boolean
  reason?: string
}

/**
 * Full delivery-window feasibility check: chronology, LOAD's SAST operating
 * hours, and the minimum production gap (>= 24h between pickup completion
 * and delivery start, plus any future travel buffer).
 */
export const evaluateDeliverySchedule = (
  pickupWindow: string,
  deliveryWindow: string,
  addresses: { pickupAddressId?: string; deliveryAddressId?: string } = {},
): DeliveryScheduleEvaluation => {
  const pickupEnd = parseBookingWindowEnd(pickupWindow)
  const deliveryStart = parseBookingWindowStart(deliveryWindow)

  if (pickupEnd === null || deliveryStart === null) {
    return { feasible: false, reason: 'Select both a pickup and delivery window.' }
  }
  if (!isWithinOperatingHours(pickupWindow) || !isWithinOperatingHours(deliveryWindow)) {
    return { feasible: false, reason: 'LOAD operates 07:30–17:00 SAST.' }
  }
  if (!isDeliveryWindowAfterPickup(pickupWindow, deliveryWindow)) {
    return { feasible: false, reason: 'Delivery window must be after the pickup window.' }
  }

  const travelBufferMs = estimateTravelBufferMinutes(addresses.pickupAddressId, addresses.deliveryAddressId) * 60 * 1000
  const minimumDeliveryStart = pickupEnd + MIN_PRODUCTION_HOURS * 60 * 60 * 1000 + travelBufferMs

  if (deliveryStart < minimumDeliveryStart) {
    return { feasible: false, reason: `LOAD needs at least ${MIN_PRODUCTION_HOURS}h to process your order before delivery.` }
  }

  return { feasible: true }
}

export const premiumBookingHighlights = [
  'Express turnaround upgrade',
  'Suggested add-ons based on service choice',
  'Free-delivery threshold progress',
  'Promotion and loyalty redemption support',
]
