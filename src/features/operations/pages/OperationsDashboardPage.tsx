import { useQuery } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui/SectionCard'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { mockOperationsService } from '@/services/mock'

export const OperationsDashboardPage = () => {
  const metricsQuery = useQuery({
    queryKey: ['operations-metrics'],
    queryFn: () => mockOperationsService.getMetrics(),
  })

  if (metricsQuery.isLoading) return <LoadingState />
  if (metricsQuery.isError || metricsQuery.data?.status === 'error') return <ErrorState title="Unable to load dashboard" message="Try again shortly." />
  if (!metricsQuery.data?.data) return <ErrorState title="Dashboard unavailable" message="No metrics available right now." />

  return (
    <SectionCard title="Operations dashboard" description="Orders, collections, dispatch readiness, and payment visibility.">
      <div className="grid gap-3 md:grid-cols-3">
        {metricsQuery.data.data.map((metric) => (
          <div key={metric.id} className="rounded-card border border-card-border bg-white p-4">
            <p className="text-caption text-muted">{metric.label}</p>
            <p className="text-heading text-ink">{metric.value}</p>
            <p className="text-caption text-load-700">{metric.changeLabel}</p>
          </div>
        ))}
      </div>
    </SectionCard>
  )
}
