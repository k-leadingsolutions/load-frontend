import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { buildPath } from '@/app/router/paths'
import { approvedCategories } from '@/services/mock/approvedLaundryCatalogue'

// Laundry categories available to customers — coffee excluded until pricing approved
const customerCategories = approvedCategories

export const CustomerServicesPage = () => (
  <div className="space-y-6">
    <div>
      <h1 className="text-heading text-ink">Services</h1>
      <p className="mt-1 text-body text-muted">
        Choose a category to explore individual services and pricing.
      </p>
    </div>

    <div className="grid gap-4 sm:grid-cols-2">
      {customerCategories.map((category) => (
        <Link
          key={category.id}
          to={buildPath.customerServiceCategory(category.id)}
          className="group block rounded-panel border border-card-border bg-white shadow-card transition hover:border-load-300 hover:shadow-panel focus-visible:outline-2 focus-visible:outline-load-600"
          aria-label={`Browse ${category.name} — ${category.tagline}`}
        >
          <Card variant="flat" className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div
                className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-2xl ${category.accent}`}
                aria-hidden="true"
              >
                {category.icon}
              </div>
              {category.isFeatured ? (
                <Badge tone="info" size="sm">
                  Featured
                </Badge>
              ) : null}
            </div>

            <div className="mt-4">
              <p className="text-title text-ink group-hover:text-load-700">{category.name}</p>
              <p className="mt-1 text-caption text-muted">{category.tagline}</p>
            </div>

            <div className="mt-4 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-load-700">{category.startingPriceLabel}</p>
              <span className="flex items-center gap-1 text-sm font-semibold text-load-600 group-hover:text-load-700">
                View services
                <svg
                  aria-hidden="true"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-4 w-4 transition group-hover:translate-x-0.5"
                >
                  <path
                    fillRule="evenodd"
                    d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
            </div>
          </Card>
        </Link>
      ))}
    </div>

    <p className="text-caption text-muted text-center">
      Coffee ordering will be available once the menu is finalised.
    </p>
  </div>
)
