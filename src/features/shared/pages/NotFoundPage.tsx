import { Link } from 'react-router-dom'
import { appPaths } from '@/app/router/paths'
import { SectionCard } from '@/components/ui/SectionCard'

export const NotFoundPage = () => (
  <SectionCard title="Route not found" description="Use the primary navigation to return to the LOAD MVP foundation.">
    <Link to={appPaths.home} className="inline-flex rounded-full bg-load-600 px-5 py-3 text-sm font-semibold text-white">
      Back to home
    </Link>
  </SectionCard>
)
