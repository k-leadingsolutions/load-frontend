interface EmptyStateProps {
  title: string
  description: string
}

export const EmptyState = ({ title, description }: EmptyStateProps) => (
  <div className="rounded-panel border border-dashed border-load-200 bg-load-50/70 p-6 text-center text-sm text-slate-500">
    <p className="font-semibold text-ink">{title}</p>
    <p className="mt-2">{description}</p>
  </div>
)
