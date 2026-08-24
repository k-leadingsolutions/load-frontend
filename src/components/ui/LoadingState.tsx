export const LoadingState = () => (
  <div role="status" aria-live="polite" aria-busy="true" className="flex flex-col items-center gap-3 py-10">
    <span className="sr-only">Loading content</span>
    <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-load-200 border-t-load-500" aria-hidden="true" />
    <p className="text-caption text-muted">Loading…</p>
  </div>
)

/** Single skeleton line — use inside skeleton card composites */
export const SkeletonLine = ({ wide = false }: { wide?: boolean }) => (
  <div className={`h-3 animate-pulse-soft rounded-pill bg-load-100 ${wide ? 'w-full' : 'w-2/3'}`} aria-hidden="true" />
)

/** Skeleton card block — replace content while loading */
export const SkeletonCard = () => (
  <div className="rounded-card border border-card-border bg-white p-4 shadow-card space-y-3 animate-pulse-soft" aria-hidden="true">
    <SkeletonLine wide />
    <SkeletonLine />
    <SkeletonLine wide />
  </div>
)
