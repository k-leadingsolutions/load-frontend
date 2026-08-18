import { useQuery } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui/SectionCard'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { mockRouteService } from '@/services/mock'

export const DriverRoutePage = () => {
  const routeQuery = useQuery({
    queryKey: ['driver-route'],
    queryFn: () => mockRouteService.getRoute('driver-01'),
  })

  if (routeQuery.isLoading) return <LoadingState />
  if (routeQuery.isError) return <ErrorState title="Unable to load route" message="Try again shortly." />

  if (!routeQuery.data) return <ErrorState title="Route unavailable" message="No route data found." />

  return (
    <SectionCard title="Today's route" description="Mock route ordering with ETA, distance, and stop state.">
      <ul className="space-y-3">
        {routeQuery.data.stops.map((stop) => (
          <li key={stop.id} className="rounded-card border border-card-border bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold text-ink">#{stop.stopIndex} · {stop.customerName}</p>
              <span className="rounded-pill bg-load-50 px-3 py-1 text-xs font-semibold text-load-700">{stop.stopStatus}</span>
            </div>
            <p className="mt-1 text-sm text-muted">{stop.stopType} · {stop.addressLine}</p>
            <p className="text-xs text-muted">{stop.distanceKm} km · ETA {stop.etaMinutes} min · {stop.scheduledWindow}</p>
          </li>
        ))}
      </ul>
    </SectionCard>
  )
}
