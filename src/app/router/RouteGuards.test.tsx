import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/app/providers/AuthProvider'
import { RequireRole } from '@/app/router/RequireRole'
import { appPaths } from '@/app/router/paths'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { UnauthorizedPage } from '@/features/shared/pages/UnauthorizedPage'

const OperationsProbe = () => <div>Operations command centre content</div>
const DriverProbe = () => <div>Driver run management content</div>
const AdminProbe = () => <div>Admin control tower content</div>

const renderGuardedRoutes = (initialEntries: string[]) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AuthProvider>
        <MemoryRouter initialEntries={initialEntries}>
          <Routes>
            <Route path={appPaths.login} element={<LoginPage />} />
            <Route path={appPaths.customerHome} element={<div>Customer home content</div>} />
            <Route path={appPaths.unauthorized} element={<UnauthorizedPage />} />
            <Route element={<RequireRole allowedRoles={['OPERATIONS']} />}>
              <Route path={appPaths.operationsDashboard} element={<OperationsProbe />} />
            </Route>
            <Route element={<RequireRole allowedRoles={['DRIVER']} />}>
              <Route path={appPaths.driverDashboard} element={<DriverProbe />} />
            </Route>
            <Route element={<RequireRole allowedRoles={['ADMIN']} />}>
              <Route path={appPaths.adminOverview} element={<AdminProbe />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  )

describe('role route guards', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('redirects unauthenticated visitors away from the operations area to login', async () => {
    renderGuardedRoutes([appPaths.operationsDashboard])

    expect(await screen.findByRole('heading', { name: /log in/i })).toBeInTheDocument()
    expect(screen.queryByText('Operations command centre content')).not.toBeInTheDocument()
  })

  it('redirects unauthenticated visitors away from the driver area to login', async () => {
    renderGuardedRoutes([appPaths.driverDashboard])

    expect(await screen.findByRole('heading', { name: /log in/i })).toBeInTheDocument()
    expect(screen.queryByText('Driver run management content')).not.toBeInTheDocument()
  })

  it('redirects unauthenticated visitors away from the admin area to login', async () => {
    renderGuardedRoutes([appPaths.adminOverview])

    expect(await screen.findByRole('heading', { name: /log in/i })).toBeInTheDocument()
    expect(screen.queryByText('Admin control tower content')).not.toBeInTheDocument()
  })

  it('never grants operations access using a stale/foreign Driver session key', async () => {
    // A Driver session lives in a separate storage key/context; it must not satisfy the
    // Customer/Operations/Admin AuthContext guard used by RequireRole.
    window.localStorage.setItem('load.driver.session.v1', JSON.stringify({ id: 'driver-1', role: 'DRIVER' }))

    renderGuardedRoutes([appPaths.operationsDashboard])

    expect(await screen.findByRole('heading', { name: /log in/i })).toBeInTheDocument()
    expect(screen.queryByText('Operations command centre content')).not.toBeInTheDocument()
  })

  it('sends an authenticated customer session to the unauthorized page instead of the operations dashboard', async () => {
    const user = userEvent.setup()
    renderGuardedRoutes([appPaths.login])

    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => {
      expect(screen.getByText('Customer home content')).toBeInTheDocument()
    })

    renderGuardedRoutes([appPaths.operationsDashboard])

    expect(await screen.findByRole('heading', { name: /don't have access/i })).toBeInTheDocument()
    expect(screen.queryByText('Operations command centre content')).not.toBeInTheDocument()
  })
})
