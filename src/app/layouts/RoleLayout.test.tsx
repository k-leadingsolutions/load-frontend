import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi } from 'vitest'
import { RoleLayout } from '@/app/layouts/RoleLayout'

/**
 * Renders RoleLayout with real nested routing so bottom-nav active state is
 * driven by the actual current location (via NavLink), matching how
 * AppRouter wires each role's routes in production.
 */
const renderWithRoutes = (initialEntry: string) =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route
          element={
            <RoleLayout
              roleLabel="Operations"
              title="Operations command centre"
              mobileNavLinks={[
                { to: '/operations/dashboard', label: 'Dashboard', icon: '⌂' },
                { to: '/operations/orders', label: 'Orders', icon: '◷' },
                { to: '/operations/collections', label: 'Dispatch', icon: '➤', emphasis: true },
              ]}
            />
          }
        >
          <Route path="/operations/dashboard" element={<div>Dashboard page</div>} />
          <Route path="/operations/orders" element={<div>Orders page</div>} />
          <Route path="/operations/orders/:orderId" element={<div>Order detail page</div>} />
          <Route path="/operations/collections" element={<div>Collections page</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )

describe('RoleLayout', () => {
  it('renders a Sign out action that calls the provided handler when onSignOut is given', async () => {
    const user = userEvent.setup()
    const onSignOut = vi.fn()
    render(
      <MemoryRouter>
        <RoleLayout roleLabel="Operations" title="Operations command centre" onSignOut={onSignOut} />
      </MemoryRouter>,
    )

    const signOutButton = screen.getByRole('button', { name: 'Sign out' })
    await user.click(signOutButton)

    expect(onSignOut).toHaveBeenCalledTimes(1)
  })

  it('does not render a Sign out action when onSignOut is omitted', () => {
    render(
      <MemoryRouter>
        <RoleLayout roleLabel="Driver" title="Driver run management" />
      </MemoryRouter>,
    )

    expect(screen.queryByRole('button', { name: 'Sign out' })).not.toBeInTheDocument()
  })

  it('does not render a Sign out action in greeting mode even if onSignOut were somehow provided', () => {
    render(
      <MemoryRouter>
        <RoleLayout roleLabel="Customer" greetingMode onSignOut={vi.fn()} />
      </MemoryRouter>,
    )

    expect(screen.queryByRole('button', { name: 'Sign out' })).not.toBeInTheDocument()
  })

  it('reserves safe-area-aware bottom clearance for content when a fixed mobile nav is rendered', () => {
    const { container } = render(
      <MemoryRouter>
        <RoleLayout
          roleLabel="Operations"
          title="Operations command centre"
          mobileNavLinks={[{ to: '/operations/dashboard', label: 'Dashboard', icon: '⌂' }]}
        />
      </MemoryRouter>,
    )

    const nav = screen.getByRole('navigation', { name: 'Operations navigation' })
    expect(nav.className).toContain('fixed')

    // The outer content wrapper must reserve enough bottom padding — including
    // env(safe-area-inset-bottom) — so scrolled content never sits behind the
    // fixed nav (regression for Operations bottom-nav content overlap).
    const contentWrapper = container.firstElementChild as HTMLElement
    expect(contentWrapper.style.paddingBottom).toMatch(/^calc\(.*env\(safe-area-inset-bottom\).*\)$/)
  })

  it('still renders the header quick-links nav for roles with no bottom nav (Admin), preserving its only navigation', () => {
    render(
      <MemoryRouter>
        <RoleLayout
          roleLabel="Admin"
          title="Admin control tower"
          primaryLinks={[{ to: '/admin/overview', label: 'Overview' }]}
        />
      </MemoryRouter>,
    )

    expect(screen.getByRole('navigation', { name: 'Admin quick links' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Admin navigation' })).not.toBeInTheDocument()
  })

  it('does not reserve bottom clearance when there is no mobile nav to overlap', () => {
    const { container } = render(
      <MemoryRouter>
        <RoleLayout roleLabel="Admin" title="Admin control tower" />
      </MemoryRouter>,
    )

    expect(screen.queryByRole('navigation', { name: 'Admin navigation' })).not.toBeInTheDocument()
    const contentWrapper = container.firstElementChild as HTMLElement
    expect(contentWrapper.style.paddingBottom).toBe('')
  })

  it('derives bottom clearance from the fixed nav\'s actual measured height, not a fixed guess (real-browser regression)', () => {
    // A static guessed clearance (e.g. the previous `pb-[calc(6.5rem+...)]`)
    // can never be verified by jsdom, which performs no real CSS layout —
    // getBoundingClientRect/ResizeObserver always report 0 there unless
    // mocked, so a class-name-only assertion can pass while the real
    // browser's nav (taller due to wrapped labels, larger text settings, or
    // a different item count per role) still overlaps content. This test
    // simulates a real nav rendering taller than any hardcoded guess and
    // asserts the wrapper's reserved clearance grows to match it exactly,
    // which only holds if clearance is derived from the nav's real height.
    const realNavHeightPx = 140 // deliberately taller than any previous static guess (104px)
    let resizeCallback: ResizeObserverCallback | null = null

    class FakeResizeObserver {
      constructor(callback: ResizeObserverCallback) {
        resizeCallback = callback
      }
      observe(target: Element) {
        Object.defineProperty(target, 'getBoundingClientRect', {
          configurable: true,
          value: () => ({ height: realNavHeightPx }) as DOMRect,
        })
        resizeCallback?.(
          [{ target, contentRect: { height: realNavHeightPx } } as unknown as ResizeObserverEntry],
          this as unknown as ResizeObserver,
        )
      }
      unobserve() {}
      disconnect() {}
    }

    const originalResizeObserver = globalThis.ResizeObserver
    globalThis.ResizeObserver = FakeResizeObserver as unknown as typeof ResizeObserver

    try {
      const { container } = render(
        <MemoryRouter>
          <RoleLayout
            roleLabel="Operations"
            title="Operations command centre"
            mobileNavLinks={[{ to: '/operations/dashboard', label: 'Dashboard', icon: '⌂' }]}
          />
        </MemoryRouter>,
      )

      const contentWrapper = container.firstElementChild as HTMLElement
      expect(contentWrapper.style.paddingBottom).toContain(`${realNavHeightPx}px`)
    } finally {
      globalThis.ResizeObserver = originalResizeObserver
    }
  })

  describe('active basket bar slot (basketBar prop)', () => {
    it('renders nothing extra and reserves no additional clearance when basketBar is omitted', () => {
      const { container } = render(
        <MemoryRouter>
          <RoleLayout
            roleLabel="Operations"
            title="Operations command centre"
            mobileNavLinks={[{ to: '/operations/dashboard', label: 'Dashboard', icon: '⌂' }]}
          />
        </MemoryRouter>,
      )

      expect(screen.queryByRole('link', { name: /view cart/i })).not.toBeInTheDocument()
      const contentWrapper = container.firstElementChild as HTMLElement
      // Clearance still reflects only the nav (fallback height) — no basket-bar term appended.
      expect(contentWrapper.style.paddingBottom).toContain('88px')
    })

    it('renders an arbitrary basketBar element positioned above the nav, without RoleLayout knowing anything about baskets', () => {
      render(
        <MemoryRouter>
          <RoleLayout
            roleLabel="Customer"
            greetingMode
            mobileNavLinks={[{ to: '/customer/home', label: 'Home', icon: '⌂' }]}
            basketBar={<div data-testid="stub-basket-bar">Stub basket bar</div>}
          />
        </MemoryRouter>,
      )

      // RoleLayout renders whatever opaque node it is given — no Coffee/Laundry
      // coupling exists inside the shared shell itself.
      expect(screen.getByTestId('stub-basket-bar')).toBeInTheDocument()
      expect(screen.getByRole('navigation', { name: 'Customer navigation' })).toBeInTheDocument()
    })

    it('folds the basket bar\'s real measured height into the reserved content clearance so it never hides content', () => {
      const basketBarHeightPx = 64
      let resizeCallback: ResizeObserverCallback | null = null
      let observedCount = 0

      class FakeResizeObserver {
        constructor(callback: ResizeObserverCallback) {
          resizeCallback = callback
        }
        observe(target: Element) {
          observedCount += 1
          // First observed node is the nav (fixed fallback), second is the basket bar.
          const height = observedCount === 1 ? 88 : basketBarHeightPx
          Object.defineProperty(target, 'getBoundingClientRect', {
            configurable: true,
            value: () => ({ height }) as DOMRect,
          })
          resizeCallback?.(
            [{ target, contentRect: { height } } as unknown as ResizeObserverEntry],
            this as unknown as ResizeObserver,
          )
        }
        unobserve() {}
        disconnect() {}
      }

      const originalResizeObserver = globalThis.ResizeObserver
      globalThis.ResizeObserver = FakeResizeObserver as unknown as typeof ResizeObserver

      try {
        const { container } = render(
          <MemoryRouter>
            <RoleLayout
              roleLabel="Customer"
              greetingMode
              mobileNavLinks={[{ to: '/customer/home', label: 'Home', icon: '⌂' }]}
              basketBar={<div>1 item · R52,00</div>}
            />
          </MemoryRouter>,
        )

        const contentWrapper = container.firstElementChild as HTMLElement
        expect(contentWrapper.style.paddingBottom).toContain(`${basketBarHeightPx}px`)
      } finally {
        globalThis.ResizeObserver = originalResizeObserver
      }
    })
  })

  describe('bottom-nav active-state UX', () => {
    it('marks the current destination active with stronger font weight and the brand pill indicator, while other items stay secondary', () => {
      renderWithRoutes('/operations/orders')

      const activeLink = screen.getByRole('link', { name: /Orders/i })
      const inactiveLink = screen.getByRole('link', { name: /Dashboard/i })

      // Accessible active-state signal (React Router's built-in aria-current).
      expect(activeLink).toHaveAttribute('aria-current', 'page')
      expect(inactiveLink).not.toHaveAttribute('aria-current')

      // Stronger font weight for the active item; inactive items stay secondary.
      expect(activeLink.className).toContain('font-semibold')
      expect(inactiveLink.className).toContain('font-medium')
      expect(inactiveLink.className).not.toContain('font-semibold')
      expect(inactiveLink.className).toContain('text-muted')

      // Existing LOAD brand indicator (bg-load-100 pill, same family used for
      // status/active chips elsewhere in the app) — only on the active item.
      expect(activeLink.className).toContain('bg-load-100')
      expect(inactiveLink.className).not.toContain('bg-load-100')

      // Strengthened active icon treatment (scaled up vs. resting size).
      const activeIcon = activeLink.querySelector('span[aria-hidden="true"]') as HTMLElement
      const inactiveIcon = inactiveLink.querySelector('span[aria-hidden="true"]') as HTMLElement
      expect(activeIcon.className).toContain('scale-125')
      expect(inactiveIcon.className).toContain('scale-100')
      expect(inactiveIcon.className).not.toContain('scale-125')
    })

    it('keeps the parent nav item active on nested/detail routes (e.g. /operations/orders/:id => Orders)', () => {
      renderWithRoutes('/operations/orders/ld-1023')

      expect(screen.getByText('Order detail page')).toBeInTheDocument()

      const ordersLink = screen.getByRole('link', { name: /Orders/i })
      expect(ordersLink).toHaveAttribute('aria-current', 'page')
      expect(ordersLink.className).toContain('font-semibold')
      expect(ordersLink.className).toContain('bg-load-100')

      const dashboardLink = screen.getByRole('link', { name: /Dashboard/i })
      expect(dashboardLink).not.toHaveAttribute('aria-current')
      expect(dashboardLink.className).not.toContain('bg-load-100')
    })

    it('applies the same active-state pill/weight treatment to emphasis (CTA) items when active', () => {
      renderWithRoutes('/operations/collections')

      const activeEmphasisLink = screen.getByRole('link', { name: /Dispatch/i })
      expect(activeEmphasisLink).toHaveAttribute('aria-current', 'page')
      expect(activeEmphasisLink.className).toContain('font-bold')
      expect(activeEmphasisLink.className).toContain('text-load-700')
      expect(activeEmphasisLink.className).toContain('bg-load-100')

      const inactiveNonEmphasisLink = screen.getByRole('link', { name: /Dashboard/i })
      expect(inactiveNonEmphasisLink.className).not.toContain('bg-load-100')
    })
  })
})
