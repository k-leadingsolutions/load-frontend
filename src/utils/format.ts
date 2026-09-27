const zarFormatter = new Intl.NumberFormat('en-ZA', {
  style: 'currency',
  currency: 'ZAR',
  minimumFractionDigits: 2,
})

export const formatCurrency = (amount: number) =>
  zarFormatter.format(amount).replace('ZAR', 'R')

export const formatPoints = (points: number) => `${points.toLocaleString('en-ZA')} pts`

/**
 * Combines a stored booking window's ISO `date` (`YYYY-MM-DD`) with its
 * time-range `label` (e.g. "09:00 - 11:00") into a single actual-date-and-time
 * string (e.g. "Sat, 08 Aug 2026 · 09:00 - 11:00"). Falls back gracefully
 * when only one part is available, and never fabricates a date it wasn't
 * given.
 */
export const formatWindowDateAndTime = (date?: string, label?: string): string | undefined => {
  if (!date) return label
  const parsed = new Date(`${date}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return label ?? date
  const formattedDate = parsed.toLocaleDateString('en-ZA', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
  return label ? `${formattedDate} · ${label}` : formattedDate
}

