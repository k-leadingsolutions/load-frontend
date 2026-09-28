import { Link } from 'react-router-dom'
import type { AddOnOption, CatalogService } from '@/domain/models/service'
import { appPaths } from '@/app/router/paths'
import { Button } from '@/components/ui/Button'
import { useCustomerOrderDraft, usesQuantityInteraction } from '@/features/customer/booking/CustomerOrderDraftContext'
import { formatCurrency } from '@/utils/format'

interface BasketEditorProps {
  services: CatalogService[]
  addOns: AddOnOption[]
}

/**
 * Pre-confirmation basket editor shared by the Collection & Delivery and
 * Review steps of `CustomerBookingPage`. Lets the Customer adjust quantities
 * or remove items from the in-progress `CustomerOrderDraft` without leaving
 * the booking flow, reusing the same draft mutators
 * (`setServiceQuantity` / `toggleService` / `setAddOnQuantity`) that the
 * category catalogue's `ServiceSelectionControl` uses — the draft itself is
 * the single source of truth, so any edit here is immediately reflected in
 * the live pricing quote, free-delivery progress and loyalty preview.
 *
 * Renders an "Add items" call-to-action (linking back into the existing
 * Categories/services flow) whenever the basket is empty, and a per-line
 * "Remove" action alongside quantity steppers so removal never depends on
 * decrementing all the way to zero.
 */
export const BasketEditor = ({ services, addOns }: BasketEditorProps) => {
  const { draft, setServiceQuantity, toggleService, setAddOnQuantity } = useCustomerOrderDraft()

  const selectedServices = draft.serviceSelections.flatMap((selection) => {
    const service = services.find((item) => item.id === selection.serviceId)
    return service ? [{ service, quantity: selection.quantity }] : []
  })
  const selectedAddOns = draft.addOnSelections.flatMap((selection) => {
    const addOn = addOns.find((item) => item.id === selection.addOnId)
    return addOn ? [{ addOn, quantity: selection.quantity }] : []
  })

  const isEmpty = selectedServices.length === 0 && selectedAddOns.length === 0

  if (isEmpty) {
    return (
      <div className="rounded-card border border-dashed border-load-200 bg-load-50/60 p-6 text-center" data-testid="basket-empty-state">
        <p className="text-sm font-semibold text-ink">Your basket is empty</p>
        <p className="mt-1 text-sm text-muted">Add a service to continue with your booking.</p>
        <Link
          to={appPaths.customerServices}
          className="mt-4 inline-flex items-center gap-1 rounded-pill bg-load-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-load-700"
        >
          Add items
        </Link>
      </div>
    )
  }

  return (
    <ul className="space-y-3" data-testid="basket-items">
      {selectedServices.map(({ service, quantity }) => {
        const priceLabel =
          service.pricingModel === 'PER_KILOGRAM'
            ? `${formatCurrency(service.basePrice)}/kg`
            : service.pricingModel === 'ASSESSMENT_REQUIRED' || service.pricingModel === 'QUOTE_REQUIRED'
              ? service.basePrice > 0
                ? `from ${formatCurrency(service.basePrice)}`
                : 'Quote required'
              : formatCurrency(quantity * service.basePrice)

        return (
          <li
            key={service.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-card-border bg-white p-3 text-sm"
          >
            <div>
              <p className="font-semibold text-ink">
                {service.name}
                {usesQuantityInteraction(service.pricingModel) ? ` × ${quantity}` : ''}
              </p>
              <p className="text-caption text-muted">{priceLabel}</p>
            </div>

            {usesQuantityInteraction(service.pricingModel) ? (
              <div className="flex items-center gap-2" role="group" aria-label={`Quantity for ${service.name}`}>
                <button
                  type="button"
                  onClick={() => setServiceQuantity(service.id, Math.max(0, quantity - 1))}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-load-200 text-lg font-semibold text-load-700 transition hover:bg-load-50"
                  aria-label={`Decrease ${service.name}`}
                >
                  −
                </button>
                <span className="min-w-6 text-center text-sm font-semibold text-ink" data-testid={`basket-quantity-${service.id}`}>
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setServiceQuantity(service.id, quantity + 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-load-600 text-lg font-semibold text-white transition hover:bg-load-700"
                  aria-label={`Increase ${service.name}`}
                >
                  +
                </button>
                <Button
                  size="sm"
                  variant="ghost"
                  type="button"
                  onClick={() => setServiceQuantity(service.id, 0)}
                  aria-label={`Remove ${service.name} from basket`}
                >
                  Remove
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="outline"
                type="button"
                onClick={() => toggleService(service.id)}
                aria-label={`Remove ${service.name} from basket`}
              >
                Remove
              </Button>
            )}
          </li>
        )
      })}

      {selectedAddOns.map(({ addOn, quantity }) => (
        <li
          key={addOn.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-card-border bg-white p-3 text-sm"
        >
          <div>
            <p className="font-semibold text-ink">{addOn.name} × {quantity}</p>
            <p className="text-caption text-muted">{formatCurrency(quantity * addOn.price)}</p>
          </div>
          <div className="flex items-center gap-2" role="group" aria-label={`Quantity for ${addOn.name}`}>
            <button
              type="button"
              onClick={() => setAddOnQuantity(addOn.id, Math.max(0, quantity - 1))}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-load-200 text-lg font-semibold text-load-700 transition hover:bg-load-50"
              aria-label={`Decrease ${addOn.name}`}
            >
              −
            </button>
            <span className="min-w-6 text-center text-sm font-semibold text-ink" data-testid={`basket-quantity-${addOn.id}`}>
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setAddOnQuantity(addOn.id, quantity + 1)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-load-600 text-lg font-semibold text-white transition hover:bg-load-700"
              aria-label={`Increase ${addOn.name}`}
            >
              +
            </button>
            <Button
              size="sm"
              variant="ghost"
              type="button"
              onClick={() => setAddOnQuantity(addOn.id, 0)}
              aria-label={`Remove ${addOn.name} from basket`}
            >
              Remove
            </Button>
          </div>
        </li>
      ))}
    </ul>
  )
}
