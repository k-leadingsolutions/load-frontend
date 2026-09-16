import type { CatalogService } from '@/domain/models/service'
import { Button } from '@/components/ui/Button'
import { useCustomerOrderDraft, usesQuantityInteraction } from '@/features/customer/booking/CustomerOrderDraftContext'

interface ServiceSelectionControlProps {
  service: CatalogService
}

/**
 * Pricing-model-aware selection control for a catalogue service card.
 *
 * - PER_ITEM / FIXED_SERVICE (repeat-unit services): quantity stepper (−  n  +).
 * - PER_KILOGRAM / ASSESSMENT_REQUIRED / QUOTE_REQUIRED: Add/Remove toggle only.
 *   The Customer is requesting the service, not declaring a quantity or weight.
 */
export const ServiceSelectionControl = ({ service }: ServiceSelectionControlProps) => {
  const { getServiceQuantity, setServiceQuantity, isServiceSelected, toggleService } = useCustomerOrderDraft()

  if (usesQuantityInteraction(service.pricingModel)) {
    const quantity = getServiceQuantity(service.id)
    return (
      <div className="flex items-center gap-3" role="group" aria-label={`Quantity for ${service.name}`}>
        <button
          type="button"
          onClick={() => setServiceQuantity(service.id, Math.max(0, quantity - 1))}
          disabled={quantity === 0}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-load-200 text-lg font-semibold text-load-700 transition hover:bg-load-50 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label={`Decrease ${service.name}`}
        >
          −
        </button>
        <span className="min-w-6 text-center text-sm font-semibold text-ink" data-testid={`quantity-${service.id}`}>
          {quantity}
        </span>
        <button
          type="button"
          onClick={() => setServiceQuantity(service.id, quantity + 1)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-load-600 text-lg font-semibold text-white transition hover:bg-load-700"
          aria-label={`Increase ${service.name}`}
        >
          +
        </button>
      </div>
    )
  }

  const selected = isServiceSelected(service.id)

  if (selected) {
    return (
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-load-700">✓ Added</span>
        <Button size="sm" variant="outline" onClick={() => toggleService(service.id)}>
          Remove
        </Button>
      </div>
    )
  }

  return (
    <Button size="sm" variant="primary" onClick={() => toggleService(service.id)}>
      Add service
    </Button>
  )
}
