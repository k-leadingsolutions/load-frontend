import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'

vi.mock('@/services/api/operationsService', async () => {
  const { mockOperationsService } = await import('@/services/mock')
  return { apiOperationsService: mockOperationsService }
})

import App from '@/App'
import { appPaths } from '@/app/router/paths'
import { OPERATIONS_AUTH_STORAGE_KEY } from '@/services/api/operationsSessionStore'
import { AUTH_STORAGE_KEY } from '@/services/mock/sessionStore'
import type { OperationsProfile } from '@/domain/models'
import type { CustomerProfile } from '@/domain/models'

const mockOperationsSession: OperationsProfile = {
  id: 'ops-01',
  email: 'ops@load.co.za',
  role: 'OPERATIONS',
}

// Admin authorization runs through the Customer AuthContext (`useAuth`),
// guarded by `RequireRole allowedRoles={['ADMIN']}` — see RequireRole.tsx.
const mockAdminSession = {
  id: 'admin-01',
  firstName: 'Lebo',
  lastName: 'Nkosi',
  mobileNumber: '0820000000',
  email: 'admin@load.co.za',
  role: 'ADMIN',
  defaultAddressId: '',
  addresses: [],
  loyalty: { tier: 'Silver', points: 0, availableRewards: 0, loadBalance: 0 },
} as unknown as CustomerProfile

describe('Operations/Admin shell sign-out', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('shows a Sign out action on an authenticated Operations page (no public Home/Customer/Sign in controls) and clears the session on click', async () => {
    window.localStorage.setItem(OPERATIONS_AUTH_STORAGE_KEY, JSON.stringify(mockOperationsSession))
    window.history.pushState({}, '', appPaths.operationsDashboard)
    const user = userEvent.setup()
    render(<App />)

    await screen.findByText('Operations dashboard')

    // Public controls must remain hidden on this authenticated Operations page.
    expect(screen.queryByRole('link', { name: 'Sign in' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Create account' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Home' })).not.toBeInTheDocument()

    const signOutButton = await screen.findByRole('button', { name: 'Sign out' })
    await user.click(signOutButton)

    await waitFor(() => {
      expect(window.localStorage.getItem(OPERATIONS_AUTH_STORAGE_KEY)).toBeNull()
    })
    // Signing out returns to the existing Operations login flow.
    await waitFor(() => {
      expect(window.location.pathname).toBe(appPaths.operationsLogin)
    })
  })

  it('shows a Sign out action on the authenticated Admin overview page and clears the session on click', async () => {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(mockAdminSession))
    window.history.pushState({}, '', appPaths.adminOverview)
    const user = userEvent.setup()
    render(<App />)

    await screen.findByText('Admin control tower (future scope)')

    expect(screen.queryByRole('link', { name: 'Sign in' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Home' })).not.toBeInTheDocument()

    const signOutButton = await screen.findByRole('button', { name: 'Sign out' })
    await user.click(signOutButton)

    await waitFor(() => {
      expect(window.localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull()
    })
    // Signing out returns to the existing (Customer) login/public flow.
    await waitFor(() => {
      expect(window.location.pathname).toBe(appPaths.login)
    })
  })
})
