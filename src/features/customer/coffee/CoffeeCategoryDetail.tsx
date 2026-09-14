import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Toast } from '@/components/ui/Toast'
import { appPaths } from '@/app/router/paths'
import { formatCurrency } from '@/utils/format'
import {
  coffeeModifiers,
  coffeeProducts,
  coffeeSubcategories,
  foodProducts,
  loadCoffeeCategory,
} from '@/services/mock/approvedCoffeeCatalogue'
import type { CoffeeProduct, CoffeeSize, FoodProduct, Modifier } from '@/domain/models/coffee'

// ─── Coffee/tea drink card — size + modifier selection ────────────────────────

const CoffeeProductCard = ({
  product,
  onAdd,
}: {
  product: CoffeeProduct
  onAdd: (label: string, price: number) => void
}) => {
  const [size, setSize] = useState<CoffeeSize>('REGULAR')
  const [selectedModifierIds, setSelectedModifierIds] = useState<string[]>([])

  const hasLargeSize = product.largePrice !== undefined
  const availableModifiers = useMemo(
    () => coffeeModifiers.filter((m: Modifier) => product.modifierIds?.includes(m.id) && m.available),
    [product.modifierIds],
  )

  const basePrice = size === 'LARGE' && product.largePrice !== undefined ? product.largePrice : product.regularPrice
  const modifierTotal = selectedModifierIds.reduce((sum, id) => {
    const modifier = coffeeModifiers.find((m) => m.id === id)
    return sum + (modifier?.priceAdjustment ?? 0)
  }, 0)
  const totalPrice = basePrice + modifierTotal

  const toggleModifier = (id: string) => {
    setSelectedModifierIds((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id],
    )
  }

  return (
    <article
      className="flex flex-col rounded-card border border-card-border bg-white p-4 shadow-card"
      aria-label={`${product.name} — ${formatCurrency(totalPrice)}`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-title text-ink">{product.name}</p>
        {product.favourite ? (
          <Badge tone="warning" size="sm">
            LOAD Favourite
          </Badge>
        ) : null}
      </div>

      {hasLargeSize ? (
        <div className="mt-3 flex items-center gap-2" role="group" aria-label={`${product.name} size`}>
          {(['REGULAR', 'LARGE'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSize(s)}
              aria-pressed={size === s}
              className={`rounded-pill border px-3 py-1.5 text-xs font-semibold transition ${
                size === s
                  ? 'border-load-500 bg-load-500 text-white'
                  : 'border-card-border bg-white text-muted hover:border-load-300 hover:text-ink'
              }`}
            >
              {s === 'REGULAR' ? 'Regular' : 'Large'}
            </button>
          ))}
        </div>
      ) : null}

      {availableModifiers.length > 0 ? (
        <div className="mt-3 space-y-1.5" role="group" aria-label={`${product.name} customisations`}>
          {availableModifiers.map((modifier) => (
            <label
              key={modifier.id}
              className="flex items-center justify-between gap-2 text-sm text-ink"
            >
              <span className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedModifierIds.includes(modifier.id)}
                  onChange={() => toggleModifier(modifier.id)}
                  className="h-4 w-4 rounded border-card-border text-load-600 focus:ring-load-400"
                />
                {modifier.name}
              </span>
              <span className="text-caption text-muted">
                {modifier.priceAdjustment > 0 ? `+${formatCurrency(modifier.priceAdjustment)}` : 'Free'}
              </span>
            </label>
          ))}
        </div>
      ) : null}

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-load-700">{formatCurrency(totalPrice)}</p>
        <Button size="sm" onClick={() => onAdd(product.name, totalPrice)}>
          Add
        </Button>
      </div>
    </article>
  )
}

// ─── Pastry / donut card — fixed price, no size/modifiers ─────────────────────

const FoodProductCard = ({
  product,
  onAdd,
}: {
  product: FoodProduct
  onAdd: (label: string, price: number) => void
}) => (
  <article
    className="flex flex-col rounded-card border border-card-border bg-white p-4 shadow-card"
    aria-label={`${product.name} — ${formatCurrency(product.fixedPrice)}`}
  >
    <p className="text-title text-ink">{product.name}</p>
    {product.note ? <p className="mt-1 text-caption text-muted">{product.note}</p> : null}
    <div className="mt-4 flex items-center justify-between gap-3">
      <p className="text-sm font-semibold text-load-700">{formatCurrency(product.fixedPrice)}</p>
      <Button size="sm" onClick={() => onAdd(product.name, product.fixedPrice)}>
        Add
      </Button>
    </div>
  </article>
)

// ─── Page ──────────────────────────────────────────────────────────────────────

export const CoffeeCategoryDetail = () => {
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const groupedDrinks = useMemo(() => {
    const map = new Map<string, CoffeeProduct[]>()
    for (const p of coffeeProducts) {
      const existing = map.get(p.subCategoryLabel) ?? []
      map.set(p.subCategoryLabel, [...existing, p])
    }
    return map
  }, [])

  const groupedFood = useMemo(() => {
    const map = new Map<string, FoodProduct[]>()
    for (const p of foodProducts) {
      const existing = map.get(p.subCategoryLabel) ?? []
      map.set(p.subCategoryLabel, [...existing, p])
    }
    return map
  }, [])

  const handleAdd = (label: string, price: number) => {
    // Phase D wires additions into a persisted Customer order/cart flow.
    // For now this confirms the selection and computed price to the customer.
    setToastMessage(`Added ${label} — ${formatCurrency(price)}`)
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link to={appPaths.customerServices} className="font-semibold text-load-600 hover:text-load-700">
          Services
        </Link>
        <span className="text-muted" aria-hidden="true">/</span>
        <span className="text-ink">{loadCoffeeCategory.name}</span>
      </div>

      {/* Category header */}
      <div className="rounded-panel border border-card-border bg-white p-5 shadow-card">
        <div className="flex items-center gap-4">
          <div
            className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full text-3xl ${loadCoffeeCategory.accent}`}
            aria-hidden="true"
          >
            {loadCoffeeCategory.icon}
          </div>
          <div>
            <h1 className="text-heading text-ink">{loadCoffeeCategory.name}</h1>
            <p className="mt-1 text-body text-muted">{loadCoffeeCategory.description}</p>
            <p className="mt-2 text-sm font-semibold text-load-700">{loadCoffeeCategory.startingPriceLabel}</p>
          </div>
        </div>
      </div>

      {/* Menu sections */}
      <div className="space-y-6">
        {coffeeSubcategories.map((section) => {
          const drinks = groupedDrinks.get(section)
          const food = groupedFood.get(section)
          if (!drinks && !food) return null

          return (
            <section key={section} aria-labelledby={`coffee-group-${section}`}>
              <h2
                id={`coffee-group-${section}`}
                className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted"
              >
                {section}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {drinks?.map((product) => (
                  <CoffeeProductCard key={product.id} product={product} onAdd={handleAdd} />
                ))}
                {food?.map((product) => (
                  <FoodProductCard key={product.id} product={product} onAdd={handleAdd} />
                ))}
              </div>
            </section>
          )
        })}
      </div>

      {toastMessage ? (
        <Toast message={toastMessage} tone="success" onDismiss={() => setToastMessage(null)} />
      ) : null}
    </div>
  )
}
