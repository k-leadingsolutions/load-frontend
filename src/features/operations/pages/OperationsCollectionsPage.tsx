import { SectionCard } from '@/components/ui/SectionCard'

const statuses = ['Today', 'Upcoming', 'Completed', 'Rescheduled', 'Failed'] as const

export const OperationsCollectionsPage = () => (
  <SectionCard title="Collections & dispatch" description="Collection scheduling, driver assignments, and dispatch controls.">
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {statuses.map((status) => (
        <div key={status} className="rounded-card border border-card-border bg-white p-4 text-center">
          <p className="text-sm font-semibold text-ink">{status}</p>
          <p className="text-caption text-muted">Mock queue</p>
        </div>
      ))}
    </div>
  </SectionCard>
)

