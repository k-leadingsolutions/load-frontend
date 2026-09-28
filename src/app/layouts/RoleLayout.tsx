import { useLayoutEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'

/**
 * The fixed mobile nav's own offset from the viewport bottom
 * (`bottom-[calc(1rem+env(safe-area-inset-bottom))]` below) plus a small
 * visual breathing-room buffer. Kept in one place so the content clearance
 * calculation below can never silently drift out of sync with the nav's
 * actual position.
 */
const NAV_BOTTOM_OFFSET_AND_BUFFER_REM = 1.5

/**
 * Conservative clearance used only until the real nav height has been
 * measured in the browser (e.g. during the very first paint). Real devices
 * may render the nav taller than this (longer/wrapped labels, larger text
 * settings, different item counts per role) — measurement below is what
 * keeps clearance correct once mounted, not this constant.
 */
const FALLBACK_NAV_HEIGHT_PX = 88

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
  /**
   * When provided, renders a "Sign out" action in the standard role card
   * header that calls this handler (the role's own session-clearing logout).
   * Omitted for roles that don't yet need it here (e.g. Customer uses its
   * own greeting-mode header in PublicLayout; Driver is unchanged).
   */
  onSignOut?: () => void
}

export const RoleLayout = ({
  roleLabel,
  title,
  summary,
  primaryLinks = [],
  mobileNavLinks = [],
  greetingMode = false,
  errorSafeRoute,
  onSignOut,
}: RoleLayoutProps) => {
  const location = useLocation()
  const safeRoute = errorSafeRoute ?? mobileNavLinks[0]?.to ?? '/'

  const hasMobileNav = mobileNavLinks.length > 0
  const navRef = useRef<HTMLElement | null>(null)
  const [measuredNavHeight, setMeasuredNavHeight] = useState<number | null>(null)

  /*
   * The static Tailwind class this replaced (`pb-[calc(6.5rem+...)]`) baked
   * in a guessed nav height that has no guaranteed relationship to the nav's
   * actual rendered footprint — which varies per role (different item
   * counts/labels), per viewport width, and per device text-size setting.
   * jsdom-based unit tests can only assert that class string is present;
   * jsdom never performs real CSS layout, so they cannot detect an actual
   * pixel overlap when the guess is wrong in a real browser. Measuring the
   * nav's real height and deriving clearance from it keeps content always
   * fully clear of the fixed nav, regardless of its true rendered size.
   */
  useLayoutEffect(() => {
    if (!hasMobileNav) {
      setMeasuredNavHeight(null)
      return
    }

    const node = navRef.current
    if (!node) {
      return
    }

    const applyHeight = (height: number) => {
      if (height > 0) {
        setMeasuredNavHeight(height)
      }
    }

    applyHeight(node.getBoundingClientRect().height)

    if (typeof ResizeObserver === 'undefined') {
      return
    }

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const boxSize = entry.borderBoxSize?.[0]
        applyHeight(boxSize ? boxSize.blockSize : entry.contentRect.height)
      }
    })
    observer.observe(node)

    return () => observer.disconnect()
  }, [hasMobileNav, mobileNavLinks.length])

  const contentBottomClearance = hasMobileNav
    ? `calc(${measuredNavHeight ?? FALLBACK_NAV_HEIGHT_PX}px + ${NAV_BOTTOM_OFFSET_AND_BUFFER_REM}rem + env(safe-area-inset-bottom))`
    : undefined

  return (
    <div className="space-y-6" style={contentBottomClearance ? { paddingBottom: contentBottomClearance } : undefined}>
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
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-white/60">{roleLabel}</p>
              {title ? <h1 className="mt-4 text-3xl font-semibold">{title}</h1> : null}
              {summary ? <p className="mt-2 max-w-3xl text-sm text-white/80">{summary}</p> : null}
            </div>
            {onSignOut ? (
              <button
                type="button"
                onClick={onSignOut}
                className="rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
              >
                Sign out
              </button>
            ) : null}
          </div>
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
          ref={navRef}
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

