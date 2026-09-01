interface EmptyStateProps {
  title: string
  description: string
}

export const EmptyState = ({ title, description }: EmptyStateProps) => (
  <div className="rounded-panel border border-dashed border-load-200 bg-load-50 p-6 text-center">
    <p className="text-title text-ink">{title}</p>
    <p className="mt-2 text-body text-muted">{description}</p>
  </div>
)
