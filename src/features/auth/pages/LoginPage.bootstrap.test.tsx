import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/app/providers/AuthProvider'
import { DriverAuthProvider } from '@/app/providers/DriverAuthProvider'
import { OperationsAuthProvider } from '@/app/providers/OperationsAuthProvider'
import { RequireCustomerAuth } from '@/app/router/RequireCustomerAuth'
import { RequireDriverRole } from '@/app/router/RequireDriverRole'
import { RequireOperationsRole } from '@/app/router/RequireOperationsRole'
import { appPaths } from '@/app/router/paths'
import { LoginPage } from '@/features/auth/pages/LoginPage'

/**
 * Regression coverage for the role-aware login/bootstrap defect: an
 * OPERATIONS (or DRIVER) account signing in through the single, generic
 * `/login` screen must never trigger the Customer-only `GET
 * /api/customer/profile` call, and must land in its own role's UI — not be
 * treated as a failed Customer login.
 */

const jsonResponse = (body: unknown, status = 200): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    clone() {
      return jsonResponse(body, status)
    },
  }) as unknown as Response

const renderApp = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AuthProvider>
        <DriverAuthProvider>
          <OperationsAuthProvider>
            <MemoryRouter initialEntries={[appPaths.login]}>
              <Routes>
                <Route path={appPaths.login} element={<LoginPage />} />
                <Route element={<RequireCustomerAuth />}>
                  <Route path={appPaths.customerHome} element={<div>Customer Home Reached</div>} />
                </Route>
                <Route element={<RequireOperationsRole />}>
                  <Route path={appPaths.operationsDashboard} element={<div>Operations Dashboard Reached</div>} />
                </Route>
                <Route element={<RequireDriverRole />}>
                  <Route path={appPaths.driverDashboard} element={<div>Driver Dashboard Reached</div>} />
                </Route>
              </Routes>
            </MemoryRouter>
          </OperationsAuthProvider>
        </DriverAuthProvider>
      </AuthProvider>
    </QueryClientProvider>,
  )

const submitLogin = async (email: string, password: string) => {
  fireEvent.click(screen.getByRole('button', { name: 'Email' }))
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } })
  fireEvent.click(screen.getByRole('button', { name: /sign in/i }))
}

const calledUrls = (fetchMock: ReturnType<typeof vi.fn>) =>
  fetchMock.mock.calls.map(([url]) => String(url))

describe('Role-aware login/bootstrap', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    window.localStorage.clear()
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('CUSTOMER: existing flow is preserved — calls GET /api/customer/profile and enters the Customer UI', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url.endsWith('/api/auth/login')) {
        return jsonResponse({ token: 'tok-customer', email: 'jane@example.com', role: 'CUSTOMER' })
      }
      if (url.endsWith('/api/customer/profile')) {
        return jsonResponse({
          userId: 'user-1',
          firstName: 'Jane',
          lastName: 'Doe',
          mobileNumber: '+27821112222',
          email: 'jane@example.com',
        })
      }
      if (url.endsWith('/api/customer/addresses')) {
        return jsonResponse([])
      }
      throw new Error(`Unexpected fetch: ${url}`)
    })

    renderApp()
    await submitLogin('jane@example.com', 'Load@1234')

    await screen.findByText('Customer Home Reached')
    expect(calledUrls(fetchMock).some((url) => url.endsWith('/api/customer/profile'))).toBe(true)
  })

  it('OPERATIONS: never calls GET /api/customer/profile and enters the Operations UI, not a 403', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url.endsWith('/api/auth/login')) {
        return jsonResponse({ token: 'tok-ops', email: 'ops@example.com', role: 'OPERATIONS' })
      }
      if (url.endsWith('/api/customer/profile')) {
        return jsonResponse({ message: 'Forbidden' }, 403)
      }
      throw new Error(`Unexpected fetch: ${url}`)
    })

    renderApp()
    await submitLogin('ops@example.com', 'Load@1234')

    await screen.findByText('Operations Dashboard Reached')
    expect(calledUrls(fetchMock).some((url) => url.endsWith('/api/customer/profile'))).toBe(false)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('DRIVER: never calls GET /api/customer/profile and enters the Driver UI, not a 403', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url.endsWith('/api/auth/login')) {
        return jsonResponse({ token: 'tok-driver', email: 'driver@example.com', role: 'DRIVER' })
      }
      if (url.endsWith('/api/customer/profile')) {
        return jsonResponse({ message: 'Forbidden' }, 403)
      }
      throw new Error(`Unexpected fetch: ${url}`)
    })

    renderApp()
    await submitLogin('driver@example.com', 'Load@1234')

    await screen.findByText('Driver Dashboard Reached')
    expect(calledUrls(fetchMock).some((url) => url.endsWith('/api/customer/profile'))).toBe(false)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('ADMIN: routed through the same Operations bootstrap path (existing authorized admin/operations behaviour)', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url.endsWith('/api/auth/login')) {
        return jsonResponse({ token: 'tok-admin', email: 'admin@example.com', role: 'ADMIN' })
      }
      if (url.endsWith('/api/customer/profile')) {
        return jsonResponse({ message: 'Forbidden' }, 403)
      }
      throw new Error(`Unexpected fetch: ${url}`)
    })

    renderApp()
    await submitLogin('admin@example.com', 'Load@1234')

    await screen.findByText('Operations Dashboard Reached')
    expect(calledUrls(fetchMock).some((url) => url.endsWith('/api/customer/profile'))).toBe(false)
  })

  it('surfaces a real backend error message rather than silently failing when login itself is rejected', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url.endsWith('/api/auth/login')) {
        return jsonResponse({ message: 'Invalid credentials.' }, 401)
      }
      throw new Error(`Unexpected fetch: ${url}`)
    })

    renderApp()
    await submitLogin('unknown@example.com', 'Load@1234')

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid credentials.')
    })
    expect(calledUrls(fetchMock).some((url) => url.endsWith('/api/customer/profile'))).toBe(false)
  })
})
