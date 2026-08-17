import { Link } from 'react-router-dom'
import { appPaths } from '@/app/router/paths'
import { mockCategories, mockServices } from '@/services/mock/data'
import { formatCurrency } from '@/utils/format'

const LAUNDRY_CATEGORY_IDS = new Set(['wash-fold', 'dry-clean', 'home-care'])

const quickServices = mockServices.filter(
  (s) => s.featured && LAUNDRY_CATEGORY_IDS.has(s.categoryId),
)

const getCategoryAccent = (categoryId: string) =>
  mockCategories.find((c) => c.id === categoryId)?.accent ?? 'bg-load-100 text-load-700'

export const QuickServicesSection = () => (
  <section aria-labelledby="quick-services-heading">
    <div className="flex items-center justify-between gap-3">
      <h2 id="quick-services-heading" className="text-lg font-semibold text-ink">
        Quick services
      </h2>
      <Link
        to={appPaths.customerBooking}
        className="text-sm font-semibold text-load-600 hover:text-load-700"
      >
        View all
      </Link>
    </div>
    <div
      className="mt-4 grid gap-3 sm:grid-cols-3"
      role="list"
      aria-label="Available laundry services"
    >
      {quickServices.map((service) => (
        <Link
          key={service.id}
          to={appPaths.customerBooking}
          role="listitem"
          className="group flex flex-col rounded-3xl border border-load-100 bg-white p-5 shadow-panel transition hover:border-load-300 hover:shadow-glow focus-visible:outline-2 focus-visible:outline-load-600"
          aria-label={`Book ${service.name} – ${formatCurrency(service.basePrice)} per ${service.unitLabel}`}
        >
          <span
            className={`inline-block self-start rounded-full px-3 py-1 text-xs font-semibold ${getCategoryAccent(service.categoryId)}`}
          >
            {mockCategories.find((c) => c.id === service.categoryId)?.name}
          </span>
          <p className="mt-3 font-semibold text-ink group-hover:text-load-700">{service.name}</p>
          <p className="mt-1 text-sm text-slate-500">{service.shortDescription}</p>
          <div className="mt-4 flex items-center justify-between gap-2">
            <p className="text-lg font-semibold text-ink">
              {formatCurrency(service.basePrice)}
              <span className="ml-1 text-sm font-normal text-slate-500">/{service.unitLabel}</span>
            </p>
            <span className="rounded-full bg-load-50 px-3 py-1 text-xs text-load-700">
              {service.turnaroundLabel}
            </span>
          </div>
        </Link>
      ))}
    </div>
  </section>
)
