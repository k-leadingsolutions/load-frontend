import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
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
import { useCoffeeCart, type AddCoffeeCartItemInput } from '@/features/customer/coffee/CoffeeCartContext'
import type { CoffeeProduct, CoffeeSize, FoodProduct, Modifier } from '@/domain/models/coffee'

/** Modifiers actually applicable to a product, per its catalogue `modifierIds`. */
const useAvailableModifiers = (modifierIds: string[] | undefined) =>
  useMemo(
    () => coffeeModifiers.filter((m: Modifier) => modifierIds?.includes(m.id) && m.available),
    [modifierIds],
  )

// ─── Category navigation — compact, horizontally scrollable chip row ─────────

const CategoryNavigation = ({
  sections,
  active,
  onSelect,
}: {
  sections: string[]
  active: string | null
  onSelect: (section: string) => void
}) => (
  <nav aria-label="Coffee menu categories" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:overflow-visible sm:px-0">
    <div className="flex gap-2 sm:flex-wrap">
      {sections.map((section) => {
        const isActive = section === active
        return (
          <button
            key={section}
            type="button"
            onClick={() => onSelect(section)}
            aria-current={isActive ? 'true' : undefined}
            className={`flex-shrink-0 rounded-pill border px-4 py-2 text-sm transition ${
              isActive
                ? 'border-load-500 bg-load-50 font-semibold text-load-700 shadow-card'
                : 'border-card-border bg-white font-medium text-muted hover:border-load-200 hover:text-ink'
            }`}
          >
            {section}
          </button>
        )
      })}
    </div>
  </nav>
)

// ─── Coffee/tea drink card — compact: identity, size(s), price(s), one CTA ────

const CoffeeProductCard = ({
  product,
  onCustomize,
  onAddDirect,
}: {
  product: CoffeeProduct
  onCustomize: (product: CoffeeProduct) => void
  onAddDirect: (input: AddCoffeeCartItemInput) => void
}) => {
  const hasLargeSize = product.largePrice !== undefined
  const availableModifiers = useAvailableModifiers(product.modifierIds)
  const needsCustomization = hasLargeSize || availableModifiers.length > 0

  const handleClick = () => {
    if (needsCustomization) {
      onCustomize(product)
      return
    }
    onAddDirect({
      productId: product.id,
      name: product.name,
      modifierIds: [],
      unitPrice: product.regularPrice,
    })
  }

  return (
    <article
      className="flex flex-col rounded-card border border-card-border bg-white p-4 shadow-card"
      aria-label={product.favourite ? `${product.name} — LOAD Favourite` : product.name}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-title text-ink">{product.name}</p>
        {product.favourite ? (
          <Badge tone="warning" size="sm">
            LOAD Favourite
          </Badge>
        ) : null}
      </div>

      <div className="mt-3 space-y-1">
        {hasLargeSize ? (
          <>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">Regular</span>
              <span className="font-semibold text-load-700">{formatCurrency(product.regularPrice)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">Large</span>
              <span className="font-semibold text-load-700">{formatCurrency(product.largePrice!)}</span>
            </div>
          </>
        ) : (
          <p className="text-sm font-semibold text-load-700">{formatCurrency(product.regularPrice)}</p>
        )}
      </div>

      <Button size="sm" className="mt-4" onClick={handleClick}>
        {needsCustomization ? 'Customize & add' : 'Add'}
      </Button>
    </article>
  )
}

// ─── Pastry / donut card — fixed price, no size/modifiers ─────────────────────

const FoodProductCard = ({
  product,
  onAdd,
}: {
  product: FoodProduct
  onAdd: (input: AddCoffeeCartItemInput) => void
}) => (
  <article
    className="flex flex-col rounded-card border border-card-border bg-white p-4 shadow-card"
    aria-label={`${product.name} — ${formatCurrency(product.fixedPrice)}`}
  >
    <p className="text-title text-ink">{product.name}</p>
    {product.note ? <p className="mt-1 text-caption text-muted">{product.note}</p> : null}
    <div className="mt-4 flex items-center justify-between gap-3">
      <p className="text-sm font-semibold text-load-700">{formatCurrency(product.fixedPrice)}</p>
      <Button
        size="sm"
        onClick={() =>
          onAdd({
            productId: product.id,
            name: product.name,
            modifierIds: [],
            unitPrice: product.fixedPrice,
          })
        }
      >
        Add
      </Button>
    </div>
  </article>
)

// ─── Product customisation — reused for both mobile (bottom sheet) and ───────
// desktop (centered dialog) via the existing responsive `Modal` component.

const ProductCustomizerBody = ({
  product,
  onAdd,
  onClose,
}: {
  product: CoffeeProduct
  onAdd: (input: AddCoffeeCartItemInput) => void
  onClose: () => void
}) => {
  const [size, setSize] = useState<CoffeeSize>('REGULAR')
  const [selectedModifierIds, setSelectedModifierIds] = useState<string[]>([])
  const [quantity, setQuantity] = useState(1)

  const hasLargeSize = product.largePrice !== undefined
  const availableModifiers = useAvailableModifiers(product.modifierIds)

  const basePrice = size === 'LARGE' && product.largePrice !== undefined ? product.largePrice : product.regularPrice
  const selectedModifiers = selectedModifierIds
    .map((id) => coffeeModifiers.find((m) => m.id === id))
    .filter((m): m is Modifier => Boolean(m))
  const modifierTotal = selectedModifiers.reduce((sum, m) => sum + m.priceAdjustment, 0)
  const unitPrice = basePrice + modifierTotal
  const totalPrice = unitPrice * quantity

  const toggleModifier = (id: string) => {
    setSelectedModifierIds((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]))
  }

  const handleAdd = () => {
    onAdd({
      productId: product.id,
      name: product.name,
      ...(hasLargeSize ? { size } : {}),
      modifierIds: selectedModifierIds,
      ...(selectedModifiers.length > 0
        ? { modifierLabel: selectedModifiers.map((m) => m.name).join(', ') }
        : {}),
      unitPrice,
      quantity,
    })
  }

  return (
    <div className="space-y-5">
      {product.favourite ? (
        <Badge tone="warning" size="sm">
          LOAD Favourite
        </Badge>
      ) : null}

      {hasLargeSize ? (
        <fieldset>
          <legend className="text-sm font-semibold text-ink">Choose size</legend>
          <div className="mt-2 space-y-2">
            {(['REGULAR', 'LARGE'] as const).map((s) => {
              const price = s === 'LARGE' ? product.largePrice! : product.regularPrice
              const isSelected = size === s
              return (
                <label
                  key={s}
                  className={`flex cursor-pointer items-center justify-between gap-3 rounded-card border px-3 py-2 transition ${
                    isSelected ? 'border-load-500 bg-load-50 shadow-card' : 'border-card-border bg-white hover:border-load-200'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`${product.id}-size`}
                      value={s}
                      checked={isSelected}
                      onChange={() => setSize(s)}
                      className="h-4 w-4 border-card-border text-load-600 focus:ring-load-400"
                    />
                    <span className={isSelected ? 'font-semibold text-ink' : 'text-ink'}>
                      {s === 'REGULAR' ? 'Regular' : 'Large'}
                    </span>
                  </span>
                  <span className="text-sm font-semibold text-load-700">{formatCurrency(price)}</span>
                </label>
              )
            })}
          </div>
        </fieldset>
      ) : (
        <p className="text-sm font-semibold text-load-700">{formatCurrency(product.regularPrice)}</p>
      )}

      {availableModifiers.length > 0 ? (
        <fieldset>
          <legend className="text-sm font-semibold text-ink">Customise</legend>
          <div className="mt-2 space-y-1.5">
            {availableModifiers.map((modifier) => (
              <label key={modifier.id} className="flex items-center justify-between gap-2 text-sm text-ink">
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
        </fieldset>
      ) : null}

      <div>
        <p className="text-sm font-semibold text-ink">Quantity</p>
        <div className="mt-2 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            aria-label={`Decrease ${product.name} quantity`}
            className="h-9 w-9 rounded-full border border-load-200 text-base font-semibold text-load-700 transition hover:bg-load-50"
          >
            −
          </button>
          <span className="min-w-6 text-center text-sm font-semibold text-ink" aria-live="polite">
            {quantity}
          </span>
          <button
            type="button"
            onClick={() => setQuantity((q) => q + 1)}
            aria-label={`Increase ${product.name} quantity`}
            className="h-9 w-9 rounded-full bg-load-600 text-base font-semibold text-white transition hover:bg-load-700"
          >
            +
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-divider pt-4">
        <p className="text-sm font-semibold text-ink">Total</p>
        <p className="text-title font-semibold text-load-700">{formatCurrency(totalPrice)}</p>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" fullWidth onClick={onClose}>
          Cancel
        </Button>
        <Button fullWidth onClick={handleAdd}>
          Add to order
        </Button>
      </div>
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export const CoffeeCategoryDetail = () => {
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [customizingProduct, setCustomizingProduct] = useState<CoffeeProduct | null>(null)
  const { addItem, itemCount, subtotal } = useCoffeeCart()
  const sectionRefs = useRef<Partial<Record<string, HTMLElement | null>>>({})

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

  const availableSections = useMemo(
    () => coffeeSubcategories.filter((section) => groupedDrinks.has(section) || groupedFood.has(section)),
    [groupedDrinks, groupedFood],
  )

  const [activeCategory, setActiveCategory] = useState<string | null>(availableSections[0] ?? null)

  useEffect(() => {
    if (activeCategory === null && availableSections.length > 0) {
      setActiveCategory(availableSections[0]!)
    }
  }, [activeCategory, availableSections])

  const handleAdd = (input: AddCoffeeCartItemInput) => {
    addItem(input)
    setToastMessage(`Added ${input.name} — ${formatCurrency(input.unitPrice)}`)
  }

  const handleAddFromCustomizer = (input: AddCoffeeCartItemInput) => {
    handleAdd(input)
    setCustomizingProduct(null)
  }

  const handleSelectCategory = (section: string) => {
    setActiveCategory(section)
    sectionRefs.current[section]?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className={itemCount > 0 ? 'space-y-6 pb-24' : 'space-y-6'}>
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

      <CategoryNavigation sections={availableSections} active={activeCategory} onSelect={handleSelectCategory} />

      {/* Menu sections */}
      <div className="space-y-6">
        {availableSections.map((section) => {
          const drinks = groupedDrinks.get(section)
          const food = groupedFood.get(section)

          return (
            <section
              key={section}
              aria-labelledby={`coffee-group-${section}`}
              ref={(el: HTMLElement | null) => {
                sectionRefs.current[section] = el
              }}
            >
              <h2
                id={`coffee-group-${section}`}
                className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted"
              >
                {section}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {drinks?.map((product) => (
                  <CoffeeProductCard
                    key={product.id}
                    product={product}
                    onCustomize={setCustomizingProduct}
                    onAddDirect={handleAdd}
                  />
                ))}
                {food?.map((product) => (
                  <FoodProductCard key={product.id} product={product} onAdd={handleAdd} />
                ))}
              </div>
            </section>
          )
        })}
      </div>

      <Modal
        open={customizingProduct !== null}
        onClose={() => setCustomizingProduct(null)}
        title={customizingProduct?.name ?? ''}
      >
        {customizingProduct ? (
          <ProductCustomizerBody
            key={customizingProduct.id}
            product={customizingProduct}
            onAdd={handleAddFromCustomizer}
            onClose={() => setCustomizingProduct(null)}
          />
        ) : null}
      </Modal>

      {itemCount > 0 ? (
        <div className="fixed inset-x-0 bottom-16 z-40 flex justify-center px-4 sm:bottom-4">
          <Link
            to={appPaths.customerCoffeeCart}
            className="flex w-full max-w-md items-center justify-between gap-3 rounded-pill bg-load-700 px-5 py-3 text-white shadow-panel transition hover:bg-load-800"
          >
            <span className="text-sm font-semibold">
              {itemCount} {itemCount === 1 ? 'item' : 'items'} in cart
            </span>
            <span className="text-sm font-semibold">
              View cart · {formatCurrency(subtotal)}
            </span>
          </Link>
        </div>
      ) : null}

      {toastMessage ? (
        <Toast message={toastMessage} tone="success" onDismiss={() => setToastMessage(null)} />
      ) : null}
    </div>
  )
}
