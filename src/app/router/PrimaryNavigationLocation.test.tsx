import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'

vi.mock('@/services/api/operationsService', async () => {
  const { mockOperationsService } = await import('@/services/mock')
  return { apiOperationsService: mockOperationsService }
})
vi.mock('@/services/api/driverService', async () => {
  const { mockDriverService } = await import('@/services/mock')
  return { apiDriverService: mockDriverService }
})

import App from '@/App'
import { appPaths } from '@/app/router/paths'
import { OPERATIONS_AUTH_STORAGE_KEY } from '@/services/api/operationsSessionStore'
import { DRIVER_AUTH_STORAGE_KEY } from '@/services/mock/driverSessionStore'
import { AUTH_STORAGE_KEY } from '@/services/mock/sessionStore'
import { mockCustomerProfile } from '@/services/mock/data'
import type { OperationsProfile, DriverProfile } from '@/domain/models'

/**
 * LOAD primary-navigation rule: for roles that have a fixed bottom nav
 * (Customer, Driver, Operations), that bottom nav is the ONLY primary
 * navigation. The role header must stay contextual/branding only and must
 * never render a second, duplicated set of the same route links up top.
 * Admin has no bottom nav, so its header quick-links nav remains its sole
 * navigation and must be preserved.
 */

const mockOperationsSession: OperationsProfile = {
  id: 'ops-01',
  email: 'ops@load.co.za',
  role: 'OPERATIONS',
}

const mockDriverSession: DriverProfile = {
  id: 'driver-01',
  driverId: 'driver-01',
  name: 'Thabo Mokoena',
  mobileNumber: '0821234567',
  role: 'DRIVER',
}

describe('LOAD primary navigation location', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('Operations: renders the bottom nav only, with no duplicated header quick-links nav', async () => {
    window.localStorage.setItem(OPERATIONS_AUTH_STORAGE_KEY, JSON.stringify(mockOperationsSession))
    window.history.pushState({}, '', appPaths.operationsDashboard)
    render(<App />)

    await screen.findByText('Operations command centre')
    expect(screen.getByRole('navigation', { name: 'Operations navigation' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Operations quick links' })).not.toBeInTheDocument()
  })

  it('Driver: renders the bottom nav only, with no duplicated header quick-links nav', async () => {
    window.localStorage.setItem(DRIVER_AUTH_STORAGE_KEY, JSON.stringify(mockDriverSession))
    window.history.pushState({}, '', appPaths.driverDashboard)
    render(<App />)

    await screen.findByText('Driver run management')
    expect(screen.getByRole('navigation', { name: 'Driver navigation' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Driver quick links' })).not.toBeInTheDocument()
  })

  it('Customer: renders the bottom nav only, with no header quick-links nav (greeting header is branding only)', async () => {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(mockCustomerProfile))
    window.history.pushState({}, '', appPaths.customerHome)
    render(<App />)

    expect(await screen.findByRole('navigation', { name: 'Customer navigation' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Customer quick links' })).not.toBeInTheDocument()
  })

  it('Admin: has no bottom nav, so its header quick-links nav is preserved as its only navigation', async () => {
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
    }
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(mockAdminSession))
    window.history.pushState({}, '', appPaths.adminOverview)
    render(<App />)

    await screen.findByText('Admin control tower (future scope)')
    expect(screen.getByRole('navigation', { name: 'Admin quick links' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Admin navigation' })).not.toBeInTheDocument()
  })
})
