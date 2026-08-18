import { mockServices } from '@/services/mock/data'
import { formatCurrency } from '@/utils/format'

const coffeeItems = mockServices.filter((service) => service.categoryId === 'coffee' && service.featured)

export const CoffeeSection = () => {
  return (
    <section aria-labelledby="coffee-section-heading">
      <div className="flex items-center justify-between gap-3">
        <h2 id="coffee-section-heading" className="text-title text-ink">
          LOAD Coffee
        </h2>
        <button type="button" className="text-sm font-semibold text-load-600 hover:text-load-700">
          View all
        </button>
      </div>

      <div className="mt-3 space-y-3">
        {coffeeItems.map((item) => (
          <article
            key={item.id}
            className="flex items-center gap-4 rounded-panel border border-card-border bg-white p-4 shadow-card"
          >
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-load-100 text-2xl" aria-hidden="true">
              ☕
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-ink">{item.name}</p>
              <p className="text-caption text-muted">{item.shortDescription}</p>
              <p className="text-caption text-slate-500">{item.turnaroundLabel}</p>
            </div>
            <p className="flex-shrink-0 text-sm font-semibold text-load-700">
              {formatCurrency(item.basePrice)}
            </p>
          </article>
        ))}
      </div>
    </section>
  )
}
