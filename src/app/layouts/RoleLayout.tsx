import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'

interface MobileNavItem {
  to: string
  label: string
  icon: string
  /** When true the item receives stronger visual emphasis (e.g. the primary CTA in a bottom nav) */
  emphasis?: boolean
}

interface RoleLayoutProps {
  roleLabel: string
  /** Shown only for non-Customer roles as a top-card title */
  title?: string
  /** Shown only for non-Customer roles as a top-card summary */
  summary?: string
  /** Top-card nav pills — shown only for non-Customer roles */
  primaryLinks?: Array<{ to: string; label: string }>
  mobileNavLinks?: MobileNavItem[]
  /** When true the top card is rendered as a minimal greeting shell (no nav pills, no role label) */
  greetingMode?: boolean
  /** Safe route to offer if a routed page crashes. Defaults to the first mobile nav link, or app home. */
  errorSafeRoute?: string
}

export const RoleLayout = ({
  roleLabel,
  title,
  summary,
  primaryLinks = [],
  mobileNavLinks = [],
  greetingMode = false,
  errorSafeRoute,
}: RoleLayoutProps) => {
  const location = useLocation()
  const safeRoute = errorSafeRoute ?? mobileNavLinks[0]?.to ?? '/'

  return (
    <div className="space-y-6 pb-24">
      {greetingMode ? (
        /* ── Customer greeting card — no nav pills, just brand identity ── */
        <section
          aria-label="LOAD header"
          className="rounded-[2rem] bg-gradient-to-r from-load-600 to-load-800 p-6 text-white shadow-glow"
        >
          <p className="text-xs font-bold tracking-[0.25em] text-white/60 uppercase">LOAD</p>
          <p className="mt-3 text-sm text-white/70">LAUNDRY • COFFEE • DONE BEAUTIFULLY</p>
        </section>
      ) : (
        /* ── Standard role card with nav pills (Driver, Operations, Admin) ── */
        <section className="rounded-[2rem] bg-gradient-to-r from-load-600 to-load-800 p-6 text-white shadow-glow">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/60">{roleLabel}</p>
          {title ? <h1 className="mt-4 text-3xl font-semibold">{title}</h1> : null}
          {summary ? <p className="mt-2 max-w-3xl text-sm text-white/80">{summary}</p> : null}
          {primaryLinks.length > 0 ? (
            <nav aria-label={`${roleLabel} quick links`} className="mt-5 flex flex-wrap gap-2">
              {primaryLinks.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className="rounded-full bg-white/15 px-4 py-2 text-sm text-white transition hover:bg-white/25"
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          ) : null}
        </section>
      )}

      <ErrorBoundary key={location.pathname} safeRoute={safeRoute} safeRouteLabel={`Back to ${roleLabel}`}>
        <Outlet />
      </ErrorBoundary>

      {mobileNavLinks.length > 0 ? (
        <nav
          aria-label={`${roleLabel} navigation`}
          className="fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-20 mx-auto flex max-w-lg items-center justify-between rounded-panel border border-card-border bg-white/95 px-4 py-2 shadow-panel backdrop-blur"
        >
          {mobileNavLinks.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex min-w-[54px] flex-col items-center gap-1 rounded-card px-2 py-1 text-[11px] transition ${
                  item.emphasis
                    ? isActive
                      ? 'font-bold text-load-700'
                      : 'font-bold text-load-600'
                    : isActive
                      ? 'font-medium text-load-700'
                      : 'font-medium text-muted'
                }`
              }
            >
              <span aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      ) : null}
    </div>
  )
}

