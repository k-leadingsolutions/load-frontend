import { useQuery } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui/SectionCard'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { mockRouteService } from '@/services/mock'

export const DriverDashboardPage = () => {
  const routeQuery = useQuery({
    queryKey: ['driver-dashboard-route'],
    queryFn: () => mockRouteService.getRoute('driver-01'),
  })

  if (routeQuery.isLoading) return <LoadingState />
  if (routeQuery.isError) return <ErrorState title="Unable to load dashboard" message="Try again shortly." />

  const route = routeQuery.data
  if (!route) return <ErrorState title="Route unavailable" message="No route data found." />
  const nextStop = route.stops.find((stop) => stop.stopStatus === 'EN_ROUTE' || stop.stopStatus === 'PENDING')

  return (
    <div className="space-y-6">
      <SectionCard title="Driver dashboard" description="Today's route, active stops, and on-time delivery performance.">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-card border border-card-border bg-load-50 p-4">
            <p className="text-caption text-muted">Stops today</p>
            <p className="text-heading text-ink">{route.totalStops}</p>
          </div>
          <div className="rounded-card border border-card-border bg-load-50 p-4">
            <p className="text-caption text-muted">Orders today</p>
            <p className="text-heading text-ink">{route.totalOrders}</p>
          </div>
          <div className="rounded-card border border-card-border bg-load-50 p-4">
            <p className="text-caption text-muted">On-time</p>
            <p className="text-heading text-ink">{route.onTimePercent}%</p>
          </div>
        </div>
        {nextStop ? (
          <div className="mt-4 rounded-card border border-load-200 bg-white p-4 text-sm">
            <p className="font-semibold text-ink">Next stop</p>
            <p className="text-muted">{nextStop.customerName} · {nextStop.suburb}</p>
            <p className="text-muted">ETA {nextStop.etaMinutes} min · {nextStop.distanceKm} km</p>
          </div>
        ) : null}
      </SectionCard>
    </div>
  )
}
