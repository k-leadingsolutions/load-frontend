import { useQuery } from '@tanstack/react-query'
import { mockCoffeeService } from '@/services/mock'
import { LoadingState } from '@/components/ui/LoadingState'

export const CoffeeSection = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['coffee-offers'],
    queryFn: () => mockCoffeeService.getOffers(),
  })

  if (isLoading) return <LoadingState />
  if (!data?.length) return null

  return (
    <section aria-labelledby="coffee-section-heading">
      <div className="flex items-center justify-between gap-3">
        <h2 id="coffee-section-heading" className="text-title text-ink">
          Promotions
        </h2>
        <button type="button" className="text-sm font-semibold text-load-600 hover:text-load-700">
          View all
        </button>
      </div>

      <div className="mt-3 space-y-3">
        {data.map((offer) => (
          <article
            key={offer.id}
            className="flex items-center gap-4 rounded-panel border border-card-border bg-white p-4 shadow-card"
          >
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-load-100 text-2xl" aria-hidden="true">
              {offer.imageEmoji ?? '☕'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-ink">{offer.title}</p>
              <p className="text-caption text-muted">{offer.description}</p>
              {offer.expiresAt ? (
                <p className="text-caption text-amber-600">Today Only</p>
              ) : null}
            </div>
            <button
              type="button"
              className="flex-shrink-0 rounded-pill border border-load-300 px-3 py-1.5 text-xs font-semibold text-load-600 transition hover:bg-load-50"
            >
              {offer.ctaLabel}
            </button>
          </article>
        ))}
      </div>
    </section>
  )
}
