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
    expect(contentWrapper.className).toMatch(/pb-\[calc\(.*env\(safe-area-inset-bottom\).*\)\]/)
  })

  it('does not reserve bottom clearance when there is no mobile nav to overlap', () => {
    const { container } = render(
      <MemoryRouter>
        <RoleLayout roleLabel="Admin" title="Admin control tower" />
      </MemoryRouter>,
    )

    expect(screen.queryByRole('navigation', { name: 'Admin navigation' })).not.toBeInTheDocument()
    const contentWrapper = container.firstElementChild as HTMLElement
    expect(contentWrapper.className).not.toContain('safe-area-inset-bottom')
  })
})
