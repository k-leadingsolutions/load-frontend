import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { appPaths } from '@/app/router/paths'
import { SectionCard } from '@/components/ui/SectionCard'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { EmptyState } from '@/components/ui/EmptyState'
import { apiOperationsService } from '@/services/api/operationsService'

/** Focus ring shared by every keyboard-accessible dashboard card link. */
const cardLinkClassName =
  'block rounded-card border border-card-border bg-white p-4 transition hover:border-load-300 hover:shadow-panel focus:outline-none focus-visible:ring-2 focus-visible:ring-load-500 focus-visible:ring-offset-2'

/**
 * Maps an actionable dashboard metric to the existing Operations route/queue
 * it summarises. Metrics with no destination here (e.g. on-time delivery) are
 * informational only and must never be rendered as fake-clickable.
 */
const metricRouteById: Record<string, string> = {
  orders: appPaths.operationsOrders,
}

const attentionItemRoutes = {
  'awaiting-intake': appPaths.operationsProduction,
  'quality-check': appPaths.operationsProduction,
  'ready-for-dispatch': appPaths.operationsCollections,
  'reschedule-requests': appPaths.operationsCollections,
  'failed-attempts': appPaths.operationsCollections,
} as const

export const OperationsDashboardPage = () => {
  const metricsQuery = useQuery({
    queryKey: ['operations-metrics'],
    queryFn: () => apiOperationsService.getMetrics(),
  })
  const ordersQuery = useQuery({
    queryKey: ['operations-orders'],
    queryFn: () => apiOperationsService.listProductionOrders(),
  })
  const assignmentsQuery = useQuery({
    queryKey: ['operations-driver-assignments'],
    queryFn: () => apiOperationsService.listDriverAssignments(),
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
          {metricsQuery.data.data.map((metric) => {
            const to = metricRouteById[metric.id]
            const content = (
              <>
                <p className="text-caption text-muted">{metric.label}</p>
                <p className="text-heading text-ink">{metric.value}</p>
                <p className="text-caption text-load-700">{metric.changeLabel}</p>
              </>
            )

            return to ? (
              <Link key={metric.id} to={to} className={cardLinkClassName} aria-label={`View ${metric.label} in Operations`}>
                {content}
              </Link>
            ) : (
              <div key={metric.id} className="rounded-card border border-card-border bg-white p-4">
                {content}
              </div>
            )
          })}
        </div>
      </SectionCard>

      <SectionCard title="Needs attention" description="Operational items that require action right now.">
        {ordersQuery.isLoading || assignmentsQuery.isLoading ? <LoadingState /> : null}
        {!ordersQuery.isLoading && !assignmentsQuery.isLoading && attentionItems.every((item) => item.count === 0) ? (
          <EmptyState title="All clear" description="No operational items require attention right now." />
        ) : null}
        {!ordersQuery.isLoading && !assignmentsQuery.isLoading && attentionItems.some((item) => item.count > 0) ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {attentionItems
              .filter((item) => item.count > 0)
              .map((item) => {
                const to = attentionItemRoutes[item.id as keyof typeof attentionItemRoutes]
                const content = (
                  <>
                    <p className="text-heading text-ink">{item.count}</p>
                    <p className="text-caption text-muted">{item.label}</p>
                  </>
                )

                return to ? (
                  <Link key={item.id} to={to} className={`${cardLinkClassName} text-center`} aria-label={`View ${item.label} in Operations`}>
                    {content}
                  </Link>
                ) : (
                  <div key={item.id} className="rounded-card border border-card-border bg-white p-4 text-center">
                    {content}
                  </div>
                )
              })}
          </div>
        ) : null}
      </SectionCard>
    </div>
  )
}
