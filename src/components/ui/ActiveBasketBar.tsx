import { Link } from 'react-router-dom'
import { formatCurrency } from '@/utils/format'

export interface ActiveBasketBarProps {
  /** Number of items currently in the basket. Renders nothing when <= 0. */
  itemCount: number
  /** Basket subtotal, formatted with the app's existing currency formatter. */
  subtotal: number
  /** Destination the whole CTA navigates to (e.g. the Coffee cart route). */
  to: string
  /** Singular noun for the item count (defaults to "item"). */
  itemNoun?: string
}

/**
 * Generic, presentational "active basket" CTA shared by any customer flow
 * with a persistent basket (Coffee today; Laundry can reuse it later). It
 * never computes pricing or basket state itself — callers must supply an
 * already-derived `itemCount`/`subtotal` from their own basket's single
 * source of truth (e.g. `CoffeeCartContext`). Positioning above the bottom
 * navigation is handled centrally by `RoleLayout`'s `basketBar` slot, not by
 * this component.
 */
export const ActiveBasketBar = ({ itemCount, subtotal, to, itemNoun = 'item' }: ActiveBasketBarProps) => {
  if (itemCount <= 0) {
    return null
  }

  const itemLabel = `${itemCount} ${itemCount === 1 ? itemNoun : `${itemNoun}s`}`
  const totalLabel = formatCurrency(subtotal)

  return (
    <Link
      to={to}
      aria-label={`View cart: ${itemLabel}, ${totalLabel}`}
      className="flex w-full items-center justify-between gap-3 rounded-pill bg-load-700 px-5 py-3 text-white shadow-panel transition hover:bg-load-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
    >
      <span className="flex items-center gap-2 text-sm font-semibold">
        <span aria-hidden="true">🛒</span>
        <span>
          {itemLabel} · {totalLabel}
        </span>
      </span>
      <span className="text-sm font-semibold">View cart →</span>
    </Link>
  )
}
