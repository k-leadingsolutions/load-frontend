export const CoffeeSection = () => {
  return (
    <section aria-labelledby="coffee-section-heading">
      <div className="flex items-center justify-between gap-3">
        <h2 id="coffee-section-heading" className="text-title text-ink">
          LOAD Coffee
        </h2>
      </div>

      <div className="mt-3 space-y-3">
        <article className="flex items-center gap-4 rounded-panel border border-card-border bg-white p-4 shadow-card">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 text-2xl" aria-hidden="true">
            ☕
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-ink">LOAD Coffee</p>
            <p className="text-caption text-muted">Freshly roasted single-origin beans delivered to your door.</p>
          </div>
        </article>
        <p className="text-caption text-muted text-center px-4">
          Coffee ordering will be available once the final menu and pricing have been confirmed.
        </p>
      </div>
    </section>
  )
}
