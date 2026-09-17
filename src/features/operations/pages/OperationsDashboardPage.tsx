import { useQuery } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui/SectionCard'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { EmptyState } from '@/components/ui/EmptyState'
import { mockOperationsService } from '@/services/mock'

export const OperationsDashboardPage = () => {
  const metricsQuery = useQuery({
    queryKey: ['operations-metrics'],
    queryFn: () => mockOperationsService.getMetrics(),
  })
  const ordersQuery = useQuery({
    queryKey: ['operations-orders'],
    queryFn: () => mockOperationsService.listProductionOrders(),
  })
  const assignmentsQuery = useQuery({
    queryKey: ['operations-driver-assignments'],
    queryFn: () => mockOperationsService.listDriverAssignments(),
  })

  if (metricsQuery.isLoading) return <LoadingState />
  if (metricsQuery.isError || metricsQuery.data?.status === 'error') return <ErrorState title="Unable to load dashboard" message="Try again shortly." />
  if (!metricsQuery.data?.data) return <ErrorState title="Dashboard unavailable" message="No metrics available right now." />

  const orders = ordersQuery.data?.data ?? []
  const assignments = assignmentsQuery.data?.data ?? []

  const attentionItems = [
    {
      id: 'awaiting-intake',
      label: 'Awaiting store intake',
      count: orders.filter((order) => !order.receivedAtStore).length,
    },
    {
      id: 'quality-check',
      label: 'Awaiting quality check',
      count: orders.filter((order) => order.qualityCheckPending).length,
    },
    {
      id: 'ready-for-dispatch',
      label: 'Ready for dispatch/collection',
      count: orders.filter((order) => order.status === 'READY_FOR_DISPATCH').length,
    },
    {
      id: 'reschedule-requests',
      label: 'Reschedule requests',
      count: assignments.filter((assignment) => assignment.stopStatus === 'RESCHEDULE_REQUESTED').length,
    },
    {
      id: 'failed-attempts',
      label: 'Failed attempts',
      count: assignments.filter((assignment) => assignment.stopStatus === 'FAILED').length,
    },
  ]

  return (
    <div className="space-y-6">
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

      <SectionCard title="Needs attention" description="Operational items that require action right now.">
        {ordersQuery.isLoading || assignmentsQuery.isLoading ? <LoadingState /> : null}
        {!ordersQuery.isLoading && !assignmentsQuery.isLoading && attentionItems.every((item) => item.count === 0) ? (
          <EmptyState title="All clear" description="No operational items require attention right now." />
        ) : null}
        {!ordersQuery.isLoading && !assignmentsQuery.isLoading && attentionItems.some((item) => item.count > 0) ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {attentionItems.filter((item) => item.count > 0).map((item) => (
              <div key={item.id} className="rounded-card border border-card-border bg-white p-4 text-center">
                <p className="text-heading text-ink">{item.count}</p>
                <p className="text-caption text-muted">{item.label}</p>
              </div>
            ))}
          </div>
        ) : null}
      </SectionCard>
    </div>
  )
}
