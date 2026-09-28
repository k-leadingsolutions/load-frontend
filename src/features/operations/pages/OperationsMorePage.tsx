import { Link } from 'react-router-dom'
import { appPaths } from '@/app/router/paths'
import { SectionCard } from '@/components/ui/SectionCard'

const moreLinks = [
  {
    to: appPaths.operationsNotifications,
    title: 'Notifications',
    description: 'Weight captures, payment updates, quality exceptions, and reschedules.',
  },
  {
    to: appPaths.operationsReports,
    title: 'Reports',
    description: 'Daily throughput and service performance reporting.',
  },
]

/**
 * Secondary Operations hub. Surfaces destinations that don't fit on the bottom
 * nav (Notifications, Reports) — it never duplicates Orders/Production content.
 */
export const OperationsMorePage = () => (
  <SectionCard title="More" description="Additional Operations tools and information.">
    <ul className="space-y-3">
      {moreLinks.map((link) => (
        <li key={link.to}>
          <Link
            to={link.to}
            className="block rounded-3xl border border-load-100 bg-white p-4 transition hover:border-load-300 hover:bg-load-50"
          >
            <p className="font-semibold text-ink">{link.title}</p>
            <p className="mt-1 text-sm text-muted">{link.description}</p>
          </Link>
        </li>
      ))}
    </ul>
  </SectionCard>
)
