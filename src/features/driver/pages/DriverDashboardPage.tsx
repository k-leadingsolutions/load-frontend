import { useQuery } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui/SectionCard'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { apiDriverService } from '@/services/api/driverService'

const ACTIVE_STATUSES = new Set(['ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'VERIFIED', 'RESCHEDULE_REQUESTED'])
const COMPLETE_STATUSES = new Set(['COLLECTED', 'DELIVERED', 'COMPLETED'])

export const DriverDashboardPage = () => {
  const assignmentsQuery = useQuery({
    queryKey: ['driver-assignments'],
    queryFn: () => apiDriverService.listAssignments(),
  })

  if (assignmentsQuery.isLoading) return <LoadingState />
  if (assignmentsQuery.isError) return <ErrorState title="Unable to load dashboard" message="Try again shortly." />

  const assignments = [...(assignmentsQuery.data?.data ?? [])].sort((a, b) => a.stopIndex - b.stopIndex)
  if (assignments.length === 0) return <ErrorState title="No assignments" message="No stops have been scheduled yet." />

  const collections = assignments.filter((assignment) => assignment.stopType === 'PICKUP')
  const deliveries = assignments.filter((assignment) => assignment.stopType === 'DELIVERY')
  const completed = assignments.filter((assignment) => COMPLETE_STATUSES.has(assignment.stopStatus))
  const nextStop = assignments.find((assignment) => ACTIVE_STATUSES.has(assignment.stopStatus))
  const progressPercent = Math.round((completed.length / assignments.length) * 100)

  return (
    <div className="space-y-6">
      <SectionCard title="Driver dashboard" description="Today's work, current/next stop, and progress across collections and deliveries.">
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="rounded-card border border-card-border bg-load-50 p-4">
            <p className="text-caption text-muted">Stops today</p>
            <p className="text-heading text-ink">{assignments.length}</p>
          </div>
          <div className="rounded-card border border-card-border bg-load-50 p-4">
            <p className="text-caption text-muted">Collections</p>
            <p className="text-heading text-ink">{collections.length}</p>
          </div>
          <div className="rounded-card border border-card-border bg-load-50 p-4">
            <p className="text-caption text-muted">Deliveries</p>
            <p className="text-heading text-ink">{deliveries.length}</p>
          </div>
          <div className="rounded-card border border-card-border bg-load-50 p-4">
            <p className="text-caption text-muted">Completed</p>
            <p className="text-heading text-ink">{completed.length}/{assignments.length} ({progressPercent}%)</p>
          </div>
        </div>
        {nextStop ? (
          <div className="mt-4 rounded-card border border-load-200 bg-white p-4 text-sm">
            <p className="font-semibold text-ink">Current / next stop</p>
            <p className="text-muted">Stop #{nextStop.stopIndex} · {nextStop.stopType} · {nextStop.customerName}</p>
            <p className="text-muted">{nextStop.addressLine}{nextStop.suburb ? `, ${nextStop.suburb}` : ''}</p>
            <p className="text-muted">Window: {nextStop.scheduledWindow}</p>
            {nextStop.etaMinutes !== undefined ? (
              <p className="text-muted">ETA {nextStop.etaMinutes} min{nextStop.distanceKm !== undefined ? ` · ${nextStop.distanceKm} km` : ''}</p>
            ) : null}
          </div>
        ) : (
          <div className="mt-4 rounded-card border border-load-200 bg-white p-4 text-sm">
            <p className="font-semibold text-ink">All stops complete</p>
            <p className="text-muted">No more active stops for today's route.</p>
          </div>
        )}
      </SectionCard>
    </div>
  )
}
