import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { appPaths, buildPath } from '@/app/router/paths'
import { useAuth } from '@/app/providers/useAuth'
import { formatCurrency } from '@/utils/format'
import { useCoffeeCart } from '@/features/customer/coffee/CoffeeCartContext'
import { placeCoffeeOrder } from '@/services/mock/coffeeOrderStore'
import type { CoffeeOrder } from '@/domain/models/coffee'

export const CoffeeCartPage = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { lines, subtotal, updateQuantity, removeItem, clear } = useCoffeeCart()
  const [confirmedOrder, setConfirmedOrder] = useState<CoffeeOrder | null>(null)

  const handlePlaceOrder = () => {
    if (!user || lines.length === 0) return
    const order = placeCoffeeOrder(user.id, lines)
    setConfirmedOrder(order)
    clear()
  }

  if (confirmedOrder) {
    return (
      <div className="space-y-6">
        <div className="rounded-panel border border-load-200 bg-load-50 p-6 text-center">
          <p className="text-2xl" aria-hidden="true">☕✓</p>
          <h1 className="mt-2 text-heading text-ink">Order confirmed</h1>
          <p className="mt-1 text-body text-muted">
            Order #{confirmedOrder.id.slice(-6)} — {formatCurrency(confirmedOrder.total)}
          </p>
          <p className="mt-1 text-caption text-muted">We&apos;ll have it ready shortly.</p>
        </div>
        <div className="flex justify-center gap-3">
          <Link
            to={buildPath.customerServiceCategory('coffee')}
            className="inline-flex h-control items-center rounded-pill border-2 border-load-600 px-6 text-sm font-semibold text-load-600 transition hover:bg-load-50"
          >
            Order more coffee
          </Link>
          <Link
            to={appPaths.customerHome}
            className="inline-flex h-control items-center rounded-pill bg-load-600 px-6 text-sm font-semibold text-white transition hover:bg-load-700"
          >
            Back to Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm">
        <Link to={buildPath.customerServiceCategory('coffee')} className="font-semibold text-load-600 hover:text-load-700">
          LOAD Coffee
        </Link>
        <span className="text-muted" aria-hidden="true">/</span>
        <span className="text-ink">Cart</span>
      </div>

      <h1 className="text-heading text-ink">Your Coffee Order</h1>

      {lines.length === 0 ? (
        <EmptyState
          title="Your coffee cart is empty"
          description="Browse the LOAD Coffee menu and add a drink or snack to get started."
        />
      ) : (
        <>
          <div className="space-y-3">
            {lines.map((line) => (
              <article
                key={line.id}
                className="flex items-start justify-between gap-3 rounded-card border border-card-border bg-white p-4 shadow-card"
                aria-label={`${line.name} — ${formatCurrency(line.unitPrice * line.quantity)}`}
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">{line.name}</p>
                  {line.size ? (
                    <Badge tone="muted" size="sm">{line.size === 'LARGE' ? 'Large' : 'Regular'}</Badge>
                  ) : null}
                  {line.modifierLabel ? (
                    <p className="mt-1 text-caption text-muted">{line.modifierLabel}</p>
                  ) : null}
                  <p className="mt-1 text-sm font-semibold text-load-700">{formatCurrency(line.unitPrice)} each</p>
                </div>

                <div className="flex flex-shrink-0 flex-col items-end gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateQuantity(line.id, line.quantity - 1)}
                      aria-label={`Decrease ${line.name} quantity`}
                      className="h-8 w-8 rounded-full border border-load-200 text-base font-semibold text-load-700 transition hover:bg-load-50"
                    >
                      −
                    </button>
                    <span className="min-w-6 text-center text-sm font-semibold text-ink">{line.quantity}</span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(line.id, line.quantity + 1)}
                      aria-label={`Increase ${line.name} quantity`}
                      className="h-8 w-8 rounded-full bg-load-600 text-base font-semibold text-white transition hover:bg-load-700"
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(line.id)}
                    className="text-xs font-semibold text-status-error hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </article>
            ))}
          </div>

          <div className="rounded-panel border border-card-border bg-white p-5 shadow-card">
            <div className="flex items-center justify-between">
              <p className="text-body font-semibold text-ink">Subtotal</p>
              <p className="text-title font-semibold text-load-700">{formatCurrency(subtotal)}</p>
            </div>
            <Button fullWidth className="mt-4" onClick={handlePlaceOrder}>
              Place order
            </Button>
            <button
              type="button"
              onClick={() => navigate(buildPath.customerServiceCategory('coffee'))}
              className="mt-3 w-full text-center text-sm font-semibold text-load-600 hover:text-load-700"
            >
              ← Continue browsing
            </button>
          </div>
        </>
      )}
    </div>
  )
}
