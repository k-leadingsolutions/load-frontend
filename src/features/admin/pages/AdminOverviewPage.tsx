import { useQuery } from '@tanstack/react-query'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { LoadingState } from '@/components/ui/LoadingState'
import { SectionCard } from '@/components/ui/SectionCard'
import { mockAdminService } from '@/services/mock'

export const AdminOverviewPage = () => {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin-metrics'],
    queryFn: () => mockAdminService.getMetrics(),
  })

  return (
    <div className="space-y-6">
      <SectionCard title="Admin foundation" description="Catalogue, pricing, promotion, loyalty, and revenue control baseline.">
        {isLoading ? <LoadingState /> : null}
        {isError ? (
          <ErrorState title="Unable to load admin metrics" message={error instanceof Error ? error.message : 'Unknown error'} />
        ) : null}
        {!isLoading && !isError && (!data?.data || data.data.length === 0) ? (
          <EmptyState title="No metrics available" description="Admin metrics will appear here once connected." />
        ) : null}
        {!isLoading && !isError && data?.data ? (
          <div className="grid gap-4 md:grid-cols-3">
            {data.data.map((metric) => (
              <article key={metric.id} className="rounded-3xl border border-load-100 bg-white p-5">
                <p className="text-sm text-slate-500">{metric.label}</p>
                <p className="mt-2 text-2xl font-semibold text-ink">{metric.value}</p>
                <p className="mt-2 text-sm text-load-700">{metric.changeLabel}</p>
              </article>
            ))}
          </div>
        ) : null}
      </SectionCard>

      <SectionCard title="Roadmap placeholders" description="Visible future modules without expanding MVP build scope.">
        <ul className="grid gap-3 md:grid-cols-2 text-sm text-slate-600">
          <li className="rounded-2xl bg-load-50 px-4 py-3">CRM — future capability placeholder</li>
          <li className="rounded-2xl bg-load-50 px-4 py-3">Multi-store support — future capability placeholder</li>
          <li className="rounded-2xl bg-load-50 px-4 py-3">Franchise management — future capability placeholder</li>
          <li className="rounded-2xl bg-load-50 px-4 py-3">Advanced executive analytics — future capability placeholder</li>
        </ul>
      </SectionCard>
    </div>
  )
}
