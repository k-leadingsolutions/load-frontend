import { useQuery } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui/SectionCard'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { mockDriverService } from '@/services/mock'

const getDirectionsUrl = (addressLine: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressLine)}`

export const DriverRoutePage = () => {
  const assignmentsQuery = useQuery({
    queryKey: ['driver-assignments'],
    queryFn: () => mockDriverService.listAssignments(),
  })

  if (assignmentsQuery.isLoading) return <LoadingState />
  if (assignmentsQuery.isError) return <ErrorState title="Unable to load route" message="Try again shortly." />

  const stops = [...(assignmentsQuery.data?.data ?? [])].sort((a, b) => a.stopIndex - b.stopIndex)
  if (stops.length === 0) return <ErrorState title="Route unavailable" message="No stops assigned yet." />

  return (
    <SectionCard title="Today's route" description="Ordered stops with sequence, type, address, instructions, and status.">
      <ul className="space-y-3">
        {stops.map((stop) => (
          <li key={stop.id} className="rounded-card border border-card-border bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold text-ink">#{stop.stopIndex} · {stop.customerName}</p>
              <span className="rounded-pill bg-load-50 px-3 py-1 text-xs font-semibold text-load-700">{stop.stopStatus}</span>
            </div>
            <p className="mt-1 text-sm text-muted">{stop.stopType} · {stop.addressLine}</p>
            {stop.customerInstructions ? <p className="text-xs text-muted">Instructions: {stop.customerInstructions}</p> : null}
            <p className="text-xs text-muted">
              {stop.distanceKm !== undefined ? `${stop.distanceKm} km · ` : ''}
              {stop.etaMinutes !== undefined ? `ETA ${stop.etaMinutes} min · ` : ''}
              {stop.scheduledWindow}
            </p>
            <a
              href={getDirectionsUrl(stop.addressLine)}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-load-700 underline"
            >
              Get directions
            </a>
          </li>
        ))}
      </ul>
    </SectionCard>
  )
}
