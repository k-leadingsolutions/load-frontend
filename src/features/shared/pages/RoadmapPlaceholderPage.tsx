import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { productRouteMap } from '@/app/config/productBlueprint'
import { EmptyState } from '@/components/ui/EmptyState'
import { SectionCard } from '@/components/ui/SectionCard'

export const RoadmapPlaceholderPage = () => {
  const { moduleId } = useParams()
  const moduleInfo = useMemo(
    () => productRouteMap.find((item) => item.path.endsWith(moduleId ?? '')),
    [moduleId],
  )

  return (
    <SectionCard title="Future-ready placeholder" description="This module is intentionally visible but not in current MVP scope.">
      {moduleInfo ? (
        <div className="space-y-3 text-sm text-slate-600">
          <p className="text-lg font-semibold text-ink">{moduleInfo.title}</p>
          <p>{moduleInfo.summary}</p>
          <p>Current release status: {moduleInfo.release}</p>
        </div>
      ) : (
        <EmptyState title="Placeholder not found" description="This roadmap route has not been defined yet." />
      )}
    </SectionCard>
  )
}
