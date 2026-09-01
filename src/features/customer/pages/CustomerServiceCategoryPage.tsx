import { useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { appPaths } from '@/app/router/paths'
import {
  approvedCategories,
  approvedLaundryServices,
} from '@/services/mock/approvedLaundryCatalogue'
import { formatCurrency } from '@/utils/format'
import type { CatalogService } from '@/domain/models/service'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const pricingLabel = (service: CatalogService): string => {
  if (service.pricingModel === 'PER_KILOGRAM') {
    return `${service.isStartingPrice ? 'from ' : ''}${formatCurrency(service.basePrice)}/kg`
  }
  if (service.basePrice === 0) {
    return 'Assessment required'
  }
  return `${service.isStartingPrice ? 'from ' : ''}${formatCurrency(service.basePrice)}${service.unitLabel !== 'item' && service.unitLabel !== 'pair' ? `/${service.unitLabel}` : ''}`
}

const ctaLabel = (_service: CatalogService): string => {
  return 'Select'
}

const ctaTone = (_service: CatalogService): 'primary' | 'outline' | 'ghost' => {
  return 'primary'
}

const pricingBadgeTone = (service: CatalogService): 'info' | 'warning' | 'muted' => {
  if (service.pricingModel === 'PER_KILOGRAM') {
    return 'info'
  }
  if (service.pricingModel === 'ASSESSMENT_REQUIRED' || service.pricingModel === 'QUOTE_REQUIRED') {
    return 'muted'
  }
  return 'muted'
}

const pricingBadgeText = (service: CatalogService): string | null => {
  if (service.pricingModel === 'PER_KILOGRAM') return 'Per kg'
  if (service.pricingModel === 'ASSESSMENT_REQUIRED' || service.pricingModel === 'QUOTE_REQUIRED') return 'from'
  return null
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const ServiceCard = ({ service }: { service: CatalogService }) => {
  const badge = pricingBadgeText(service)
  const isAssessment =
    service.pricingModel === 'ASSESSMENT_REQUIRED' || service.pricingModel === 'QUOTE_REQUIRED'

  return (
    <article
      className="flex flex-col rounded-card border border-card-border bg-white p-4 shadow-card"
      aria-label={`${service.name} — ${pricingLabel(service)}`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-title text-ink">{service.name}</p>
        {badge ? (
          <Badge tone={pricingBadgeTone(service)} size="sm">
            {badge}
          </Badge>
        ) : null}
      </div>

      {service.shortDescription ? (
        <p className="mt-1 text-caption text-muted">{service.shortDescription}</p>
      ) : null}

      {service.pricingModel === 'PER_KILOGRAM' && service.minimumCharge ? (
        <p className="mt-2 text-caption text-muted">
          Minimum service charge: {formatCurrency(service.minimumCharge)}
        </p>
      ) : null}

      {isAssessment ? (
        <p className="mt-2 text-caption text-muted">
          Final price confirmed after inspection.
        </p>
      ) : null}

      {service.loadPassEligible ? (
        <p className="mt-2 text-caption text-load-700">✓ LOAD Pass eligible</p>
      ) : null}

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-load-700">{pricingLabel(service)}</p>
        <Button
          size="sm"
          variant={ctaTone(service)}
          onClick={() => {
            /* Phase B/C will wire up add-to-cart / assessment flow */
          }}
        >
          {ctaLabel(service)}
        </Button>
      </div>
    </article>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

/** Filters used on the service list */
type FilterId = 'all' | 'fixed' | 'kg' | 'from'

const FILTERS: Array<{ id: FilterId; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'fixed', label: 'Fixed price' },
  { id: 'kg', label: 'Per kg' },
  { id: 'from', label: 'From' },
]

export const CustomerServiceCategoryPage = () => {
  const { categoryId } = useParams<{ categoryId: string }>()
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterId>('all')

  const category = useMemo(
    () => approvedCategories.find((c) => c.id === categoryId),
    [categoryId],
  )

  const categoryServices = useMemo(
    () => approvedLaundryServices.filter((s) => s.categoryId === categoryId),
    [categoryId],
  )

  // Group by subCategoryLabel for display
  const subGroups = useMemo(() => {
    const map = new Map<string, CatalogService[]>()
    for (const svc of categoryServices) {
      const key = svc.subCategoryLabel ?? ''
      const existing = map.get(key) ?? []
      map.set(key, [...existing, svc])
    }
    return map
  }, [categoryServices])

  const filteredServices = useMemo(() => {
    return categoryServices.filter((s) => {
      const matchesSearch =
        search.trim() === '' ||
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        (s.shortDescription?.toLowerCase().includes(search.toLowerCase()) ?? false)

      const matchesFilter =
        activeFilter === 'all' ||
        (activeFilter === 'fixed' && s.pricingModel === 'FIXED_SERVICE') ||
        (activeFilter === 'kg' && s.pricingModel === 'PER_KILOGRAM') ||
        (activeFilter === 'from' &&
          (s.pricingModel === 'ASSESSMENT_REQUIRED' || s.pricingModel === 'QUOTE_REQUIRED'))

      return matchesSearch && matchesFilter
    })
  }, [categoryServices, search, activeFilter])

  const filteredByGroup = useMemo(() => {
    const map = new Map<string, CatalogService[]>()
    for (const svc of filteredServices) {
      const key = svc.subCategoryLabel ?? ''
      const existing = map.get(key) ?? []
      map.set(key, [...existing, svc])
    }
    return map
  }, [filteredServices])

  if (!category) {
    return (
      <div className="space-y-4">
        <Link to={appPaths.customerServices} className="text-sm font-semibold text-load-600 hover:text-load-700">
          ← Back to services
        </Link>
        <EmptyState title="Category not found" description="This service category does not exist." />
      </div>
    )
  }

  const hasMultipleSubGroups = subGroups.size > 1 || (subGroups.size === 1 && ![...subGroups.keys()][0])

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link
          to={appPaths.customerServices}
          className="font-semibold text-load-600 hover:text-load-700"
        >
          Services
        </Link>
        <span className="text-muted" aria-hidden="true">/</span>
        <span className="text-ink">{category.name}</span>
      </div>

      {/* Category header */}
      <div className="rounded-panel border border-card-border bg-white p-5 shadow-card">
        <div className="flex items-center gap-4">
          <div
            className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full text-3xl ${category.accent}`}
            aria-hidden="true"
          >
            {category.icon}
          </div>
          <div>
            <h1 className="text-heading text-ink">{category.name}</h1>
            <p className="mt-1 text-body text-muted">{category.description}</p>
            <p className="mt-2 text-sm font-semibold text-load-700">{category.startingPriceLabel}</p>
          </div>
        </div>

        {category.id === 'everyday' ? (
          <div className="mt-4 rounded-card border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-caption text-amber-800">
              Estimated price. Final amount is confirmed after collection and weighing.
              Minimum service charge: R120.
            </p>
          </div>
        ) : null}

        {category.id === 'dry-cleaning' ? (
          <div className="mt-4 rounded-card border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-caption text-slate-700">
              Dresses, gowns, bridal wear, designer garments, embellished pieces, heavily stained
              items and unusual fabrics are inspected first. Final price is confirmed before
              cleaning.
            </p>
          </div>
        ) : null}

        {category.id === 'luxury-care' ? (
          <div className="mt-4 rounded-card border border-violet-200 bg-violet-50 px-4 py-3">
            <p className="text-caption text-violet-800">
              Luxury Care includes inspection, individual tagging, fabric-appropriate cleaning,
              finishing, quality control and premium presentation.
            </p>
          </div>
        ) : null}

        {category.id === 'rug-care' ? (
          <div className="mt-4 rounded-card border border-emerald-200 bg-emerald-50 px-4 py-3">
            <p className="text-caption text-emerald-800">
              Persian, handmade, antique, wool, silk, viscose, damaged or colour-sensitive rugs
              require inspection and a confirmed quotation.
            </p>
          </div>
        ) : null}

        {category.id === 'tailoring' ? (
          <div className="mt-4 rounded-card border border-rose-200 bg-rose-50 px-4 py-3">
            <p className="text-caption text-rose-800">
              Final pricing is confirmed after the garment is physically assessed.
            </p>
          </div>
        ) : null}

        {category.id === 'bag-care' ? (
          <div className="mt-4 rounded-card border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-caption text-amber-800">
              Replacement parts, hardware and specialist materials are charged separately where
              applicable.
            </p>
          </div>
        ) : null}
      </div>

      {/* Search + filters */}
      <div className="space-y-3">
        <div className="relative">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${category.name.toLowerCase()} services…`}
            aria-label={`Search ${category.name} services`}
            className="w-full rounded-card border border-card-border bg-white px-4 py-2.5 pr-10 text-sm text-ink placeholder:text-muted outline-none focus:border-load-400 focus:ring-2 focus:ring-load-100"
          />
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
          >
            <path
              fillRule="evenodd"
              d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
              clipRule="evenodd"
            />
          </svg>
        </div>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter services">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setActiveFilter(f.id)}
              aria-pressed={activeFilter === f.id}
              className={`rounded-pill border px-3 py-1.5 text-xs font-semibold transition ${
                activeFilter === f.id
                  ? 'border-load-500 bg-load-500 text-white'
                  : 'border-card-border bg-white text-muted hover:border-load-300 hover:text-ink'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Service list */}
      {filteredServices.length === 0 ? (
        <EmptyState
          title="No services match"
          description="Try adjusting your search or clearing the filter."
        />
      ) : hasMultipleSubGroups && search === '' && activeFilter === 'all' ? (
        // Grouped view (when no active search/filter)
        <div className="space-y-6">
          {[...filteredByGroup.entries()].map(([group, services]) => (
            <section key={group || 'default'} aria-labelledby={group ? `group-${group}` : undefined}>
              {group ? (
                <h2
                  id={`group-${group}`}
                  className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted"
                >
                  {group}
                </h2>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-2">
                {services.map((svc) => (
                  <ServiceCard key={svc.id} service={svc} />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        // Flat view (search / filter active)
        <div className="grid gap-3 sm:grid-cols-2">
          {filteredServices.map((svc) => (
            <ServiceCard key={svc.id} service={svc} />
          ))}
        </div>
      )}

      {/* Book CTA */}
      <div className="rounded-panel border border-load-200 bg-load-50 p-4 text-center">
        <p className="text-body text-muted">Ready to book?</p>
        <Link
          to={appPaths.customerBooking}
          className="mt-3 inline-flex h-control items-center rounded-pill bg-load-600 px-6 text-sm font-semibold text-white transition hover:bg-load-700"
        >
          Start booking
        </Link>
      </div>
    </div>
  )
}
