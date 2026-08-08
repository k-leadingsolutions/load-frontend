export const LoadingState = () => (
  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-live="polite">
    {Array.from({ length: 3 }, (_, index) => (
      <div key={index} className="h-28 animate-pulse rounded-panel bg-load-100/80" />
    ))}
  </div>
)
