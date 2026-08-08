import { useQuery } from '@tanstack/react-query'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { LoadingState } from '@/components/ui/LoadingState'
import { SectionCard } from '@/components/ui/SectionCard'
import { mockDriverService } from '@/services/mock'

export const DriverAssignmentsPage = () => {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['driver-assignments'],
    queryFn: () => mockDriverService.listAssignments(),
  })

  return (
    <SectionCard title="Driver workflow foundation" description="Assigned pickups and deliveries with proof and failure capture readiness.">
      {isLoading ? <LoadingState /> : null}
      {isError ? (
        <ErrorState title="Unable to load driver assignments" message={error instanceof Error ? error.message : 'Unknown error'} />
      ) : null}
      {!isLoading && !isError && (!data?.data || data.data.length === 0) ? (
        <EmptyState title="No assignments" description="Driver tasks will appear here once routes are assigned." />
      ) : null}
      {!isLoading && !isError && data?.data ? (
        <div className="space-y-4">
          {data.data.map((assignment) => (
            <article key={assignment.id} className="rounded-3xl border border-load-100 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-semibold text-ink">{assignment.stopType} #{assignment.orderId}</p>
                <p className="text-sm text-load-700">{assignment.scheduledWindow}</p>
              </div>
              <p className="mt-2 text-sm text-slate-600">{assignment.customerName} · {assignment.addressLine}</p>
              <p className="mt-2 text-sm text-slate-500">Route area: {assignment.area}</p>
            </article>
          ))}
        </div>
      ) : null}
    </SectionCard>
  )
}
