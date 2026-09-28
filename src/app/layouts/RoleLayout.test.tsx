import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import { RoleLayout } from '@/app/layouts/RoleLayout'

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
})
