import { useQuery } from '@tanstack/react-query'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { LoadingState } from '@/components/ui/LoadingState'
import { SectionCard } from '@/components/ui/SectionCard'
import { mockOperationsService } from '@/services/mock'

export const OperationsBoardPage = () => {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['operations-orders'],
    queryFn: () => mockOperationsService.listProductionOrders(),
  })

  return (
    <SectionCard title="Operations flow foundation" description="New orders, production progress, and quality-control preparation.">
      {isLoading ? <LoadingState /> : null}
      {isError ? (
        <ErrorState title="Unable to load operations board" message={error instanceof Error ? error.message : 'Unknown error'} />
      ) : null}
      {!isLoading && !isError && (!data?.data || data.data.length === 0) ? (
        <EmptyState title="No production orders" description="Operations orders will appear here once available." />
      ) : null}
      {!isLoading && !isError && data?.data ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {data.data.map((order) => (
            <article key={order.id} className="rounded-3xl border border-load-100 bg-white p-5">
              <p className="text-sm font-semibold text-load-700">#{order.id}</p>
              <h2 className="mt-2 text-lg font-semibold text-ink">{order.customerName}</h2>
              <p className="mt-1 text-sm text-slate-500">{order.suburb}</p>
              <p className="mt-4 text-sm text-slate-600">Current stage: {order.stageLabel}</p>
              <p className="mt-2 text-sm text-slate-600">
                QC status: {order.qualityCheckPending ? 'Awaiting review' : 'On track'}
              </p>
            </article>
          ))}
        </div>
      ) : null}
    </SectionCard>
  )
}
