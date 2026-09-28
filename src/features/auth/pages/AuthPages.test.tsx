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
import { GuestOnlyRoute } from '@/app/router/GuestOnlyRoute'
import { RequireCustomerAuth } from '@/app/router/RequireCustomerAuth'
import { appPaths } from '@/app/router/paths'
import { CustomerHomePage } from '@/features/customer/pages/CustomerHomePage'
import { BiometricLoginPage } from '@/features/auth/pages/BiometricLoginPage'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { OtpPage } from '@/features/auth/pages/OtpPage'
import { RegisterPage } from '@/features/auth/pages/RegisterPage'

const renderRoutes = (initialEntries: string[]) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AuthProvider>
        <DriverAuthProvider>
          <OperationsAuthProvider>
            <MemoryRouter initialEntries={initialEntries}>
              <Routes>
                <Route element={<GuestOnlyRoute />}>
                  <Route path={appPaths.login} element={<LoginPage />} />
                  <Route path={appPaths.register} element={<RegisterPage />} />
                  <Route path={appPaths.otpVerify} element={<OtpPage />} />
                  <Route path={appPaths.biometricLogin} element={<BiometricLoginPage />} />
                </Route>
                <Route element={<RequireCustomerAuth />}>
                  <Route path={appPaths.customerHome} element={<CustomerHomePage />} />
                </Route>
              </Routes>
            </MemoryRouter>
          </OperationsAuthProvider>
        </DriverAuthProvider>
      </AuthProvider>
    </QueryClientProvider>,
  )

describe('auth pages', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('validates the register form before submission', async () => {
    const user = userEvent.setup()
    renderRoutes([appPaths.register])

    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByText('First name must be at least 2 characters.')).toBeInTheDocument()
    expect(screen.getByText('Use South African format like +27 82 555 0142.')).toBeInTheDocument()
  })

  it('signs in with demo credentials and opens the customer account', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith('/api/auth/login')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ token: 'tok-demo', email: 'thando@example.com', role: 'CUSTOMER' }),
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
            userId: 'user-demo',
            firstName: 'Thando',
            lastName: 'Nkosi',
            mobileNumber: '+27 82 555 0142',
            email: 'thando@example.com',
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
    renderRoutes([appPaths.login])

    await user.click(screen.getByRole('button', { name: 'Email' }))
    await user.clear(screen.getByLabelText('Email'))
    await user.type(screen.getByLabelText('Email'), 'thando@example.com')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /thando/i })).toBeInTheDocument()
    })

    vi.unstubAllGlobals()
  })

  it('renders OTP verification inputs and resend timer', async () => {
    renderRoutes([appPaths.otpVerify])
    expect(await screen.findByRole('heading', { name: /verify your number/i })).toBeInTheDocument()
    expect(screen.getAllByRole('textbox')).toHaveLength(6)
    expect(screen.getByText(/resend code in/i)).toBeInTheDocument()
  })

  it('renders biometric method options', async () => {
    renderRoutes([appPaths.biometricLogin])
    expect((await screen.findAllByRole('button', { name: /face id/i })).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: /fingerprint/i })).toBeInTheDocument()
  })
})
