import { render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'

vi.mock('@/services/api/authService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/api/authService')>()
  const { mockAuthService } = await import('@/services/mock')
  return { ...actual, apiAuthService: mockAuthService }
})
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/app/providers/AuthProvider'
import { DriverAuthProvider } from '@/app/providers/DriverAuthProvider'
import { OperationsAuthProvider } from '@/app/providers/OperationsAuthProvider'
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
        <DriverAuthProvider>
          <OperationsAuthProvider>
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
          </OperationsAuthProvider>
        </DriverAuthProvider>
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
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith('/api/auth/login')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ token: 'tok-cust', email: 'jane@example.com', role: 'CUSTOMER' }),
          clone() {
            return this
          },
        } as unknown as Response
      }
      if (url.endsWith('/api/customer/profile')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            userId: 'user-1',
            firstName: 'Jane',
            lastName: 'Doe',
            mobileNumber: '+27821112222',
            email: 'jane@example.com',
          }),
          clone() {
            return this
          },
        } as unknown as Response
      }
      if (url.endsWith('/api/customer/addresses')) {
        return {
          ok: true,
          status: 200,
          json: async () => [],
          clone() {
            return this
          },
        } as unknown as Response
      }
      throw new Error(`Unexpected fetch: ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock)

    const user = userEvent.setup()
    renderGuardedRoutes([appPaths.login])

    await user.click(screen.getByRole('button', { name: 'Email' }))
    await user.clear(screen.getByLabelText('Email'))
    await user.type(screen.getByLabelText('Email'), 'jane@example.com')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => {
      expect(screen.getByText('Customer home content')).toBeInTheDocument()
    })

    renderGuardedRoutes([appPaths.operationsDashboard])

    expect(await screen.findByRole('heading', { name: /don't have access/i })).toBeInTheDocument()
    expect(screen.queryByText('Operations command centre content')).not.toBeInTheDocument()

    vi.unstubAllGlobals()
  })
})
