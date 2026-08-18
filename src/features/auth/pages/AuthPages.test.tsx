import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/app/providers/AuthProvider'
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
    const user = userEvent.setup()
    renderRoutes([appPaths.login])

    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /thando mokoena/i })).toBeInTheDocument()
    })

    it('renders OTP verification inputs and resend timer', async () => {
      renderRoutes([appPaths.otpVerify])
      expect(await screen.findByRole('heading', { name: /verify your number/i })).toBeInTheDocument()
      expect(screen.getAllByRole('textbox')).toHaveLength(6)
      expect(screen.getByText(/resend code in/i)).toBeInTheDocument()
    })

    it('renders biometric method options', async () => {
      renderRoutes([appPaths.biometricLogin])
      expect(await screen.findByRole('button', { name: /face id/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /fingerprint/i })).toBeInTheDocument()
    })
  })
})
