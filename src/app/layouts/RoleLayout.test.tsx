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
})
