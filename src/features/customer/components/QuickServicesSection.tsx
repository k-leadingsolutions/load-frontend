import { Link } from 'react-router-dom'
import { appPaths, buildPath } from '@/app/router/paths'
import { approvedCategories } from '@/services/mock/approvedLaundryCatalogue'

// Show the 4 featured laundry categories as the discovery grid on the quick-services widget
const featuredCategories = approvedCategories.filter((c) => c.isFeatured)

export const QuickServicesSection = () => (
  <section aria-labelledby="quick-services-heading">
    <div className="flex items-center justify-between gap-3">
      <h2 id="quick-services-heading" className="text-lg font-semibold text-ink">
        Quick services
      </h2>
      <Link
        to={appPaths.customerServices}
        className="text-sm font-semibold text-load-600 hover:text-load-700"
      >
        View all
      </Link>
    </div>
    <div
      className="mt-4 grid gap-3 sm:grid-cols-2"
      role="list"
      aria-label="Service categories"
    >
      {featuredCategories.map((cat) => (
        <Link
          key={cat.id}
          to={buildPath.customerServiceCategory(cat.id)}
          role="listitem"
          className="group flex flex-col rounded-3xl border border-load-100 bg-white p-5 shadow-panel transition hover:border-load-300 hover:shadow-glow focus-visible:outline-2 focus-visible:outline-load-600"
          aria-label={`${cat.name} — ${cat.tagline} — ${cat.startingPriceLabel}`}
        >
          <div className={`flex h-10 w-10 items-center justify-center rounded-full text-2xl ${cat.accent}`} aria-hidden="true">
            {cat.icon}
          </div>
          <p className="mt-3 font-semibold text-ink group-hover:text-load-700">{cat.name}</p>
          <p className="mt-1 text-sm text-slate-500">{cat.tagline}</p>
          <div className="mt-4 flex items-center justify-between gap-2">
            <p className="text-lg font-semibold text-load-700">{cat.startingPriceLabel}</p>
            <span className="rounded-full bg-load-50 px-3 py-1 text-xs text-load-700">
              View services
            </span>
          </div>
        </Link>
      ))}
    </div>
  </section>
)

