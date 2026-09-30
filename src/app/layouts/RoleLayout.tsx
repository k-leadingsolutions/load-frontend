import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
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

/**
 * Visual breathing-room gap kept between the active-basket bar and the nav
 * immediately below it, so the two persistent elements never visually fuse
 * into one another (the original overlap defect this replaces).
 */
const BASKET_BAR_GAP_REM = 0.75

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
  /**
   * Renders a persistent active-basket CTA (e.g. Coffee's floating "View
   * cart" bar) positioned directly above the fixed mobile nav, with its own
   * measured height folded into the content bottom clearance below. Kept as
   * an opaque, role-agnostic slot — RoleLayout never imports basket state
   * itself — so only routes that actually have a basket (Customer) supply
   * it. The supplied element is expected to render `null` itself when the
   * basket is empty; RoleLayout measures whatever it renders (including
   * zero) rather than assuming a fixed height.
   */
  basketBar?: ReactNode
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
  basketBar,
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

  const basketBarRef = useRef<HTMLDivElement | null>(null)
  const [measuredBasketBarHeight, setMeasuredBasketBarHeight] = useState(0)

  /*
   * The wrapper below is always mounted whenever `basketBar` is supplied, even
   * while the basket is empty (the supplied element itself renders `null` in
   * that case), so its measured height is genuinely 0 — not a fallback guess
   * — while empty, and grows to the real rendered height the instant an item
   * is added. This keeps "no unnecessary empty spacing" true for the empty
   * state without needing RoleLayout to know anything about basket contents.
   */
  useLayoutEffect(() => {
    if (!basketBar) {
      setMeasuredBasketBarHeight(0)
      return
    }

    const node = basketBarRef.current
    if (!node) {
      return
    }

    const applyHeight = (height: number) => setMeasuredBasketBarHeight(height)

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
  }, [basketBar])

  const basketBarPresent = Boolean(basketBar) && measuredBasketBarHeight > 0
  const basketBarClearance = basketBarPresent ? `calc(${measuredBasketBarHeight}px + ${BASKET_BAR_GAP_REM}rem)` : '0px'

  const contentBottomClearance = hasMobileNav
    ? `calc(${measuredNavHeight ?? FALLBACK_NAV_HEIGHT_PX}px + ${NAV_BOTTOM_OFFSET_AND_BUFFER_REM}rem + env(safe-area-inset-bottom) + ${basketBarClearance})`
    : undefined

  /*
   * Positioned relative to the nav's own measured height so the basket bar
   * always sits directly above it — with a fixed visual gap — regardless of
   * how tall the nav renders for a given role/viewport/text size. This is
   * the single authoritative stacking calculation for both persistent
   * elements; nothing else in the app hardcodes a `bottom` offset for either.
   */
  const basketBarBottomOffset = hasMobileNav
    ? `calc(1rem + env(safe-area-inset-bottom) + ${measuredNavHeight ?? FALLBACK_NAV_HEIGHT_PX}px + ${BASKET_BAR_GAP_REM}rem)`
    : 'calc(1rem + env(safe-area-inset-bottom))'

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

      {basketBar ? (
        <div
          ref={basketBarRef}
          className="fixed inset-x-4 z-20 mx-auto flex max-w-md justify-center"
          style={{ bottom: basketBarBottomOffset }}
        >
          {basketBar}
        </div>
      ) : null}

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
                `flex min-w-[54px] flex-col items-center gap-1 rounded-card px-2 py-1.5 text-[11px] transition ${
                  isActive ? 'bg-load-100' : 'bg-transparent'
                } ${
                  item.emphasis
                    ? isActive
                      ? 'font-bold text-load-700'
                      : 'font-bold text-load-600'
                    : isActive
                      ? 'font-semibold text-load-700'
                      : 'font-medium text-muted'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    aria-hidden="true"
                    className={`text-base leading-none transition-transform ${isActive ? 'scale-125' : 'scale-100'}`}
                  >
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      ) : null}
    </div>
  )
}

