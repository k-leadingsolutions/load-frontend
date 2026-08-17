import { mockServices } from '@/services/mock/data'
import { formatCurrency } from '@/utils/format'

const COFFEE_EMOJI: Record<string, string> = {
  'svc-coffee-espresso': '☕',
  'svc-coffee-filter': '🫖',
  'svc-coffee-capsules': '⚡',
}

const coffeeItems = mockServices.filter((s) => s.categoryId === 'coffee' && s.featured)

export const CoffeeSection = () => (
  <section aria-labelledby="coffee-section-heading">
    <div className="flex items-center gap-3">
      <h2 id="coffee-section-heading" className="text-lg font-semibold text-ink">
        LOAD Coffee
      </h2>
      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
        New
      </span>
    </div>
    <p className="mt-1 text-sm text-slate-500">
      Freshly roasted single-origin beans — delivered with your laundry order.
    </p>

    <div
      className="mt-4 grid gap-3 sm:grid-cols-3"
      role="list"
      aria-label="LOAD Coffee menu"
    >
      {coffeeItems.map((item) => (
        <article
          key={item.id}
          role="listitem"
          className="flex flex-col rounded-3xl border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-5"
        >
          <span className="text-3xl" aria-hidden="true">
            {COFFEE_EMOJI[item.id] ?? '☕'}
          </span>
          <p className="mt-3 font-semibold text-ink">{item.name}</p>
          <p className="mt-1 text-sm text-slate-500">{item.shortDescription}</p>
          <div className="mt-4 flex items-center justify-between gap-2">
            <p className="text-lg font-semibold text-ink">
              {formatCurrency(item.basePrice)}
              <span className="ml-1 text-sm font-normal text-slate-500">/{item.unitLabel}</span>
            </p>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs text-amber-800">
              {item.turnaroundLabel}
            </span>
          </div>
        </article>
      ))}
    </div>

    <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
      ☕ Add coffee to your next laundry order at checkout — no separate delivery fee.
    </p>
  </section>
)
