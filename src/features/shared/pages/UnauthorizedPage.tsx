import { Link } from 'react-router-dom'
import { appPaths } from '@/app/router/paths'
import { SectionCard } from '@/components/ui/SectionCard'

export const UnauthorizedPage = () => (
  <SectionCard
    title="You don't have access to this page"
    description="Your account doesn't have permission to view this area. If you believe this is a mistake, contact support."
  >
    <Link to={appPaths.home} className="inline-flex rounded-full bg-load-600 px-5 py-3 text-sm font-semibold text-white">
      Back to home
    </Link>
  </SectionCard>
)
