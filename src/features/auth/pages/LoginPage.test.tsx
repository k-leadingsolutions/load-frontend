import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/app/providers/AuthProvider'
import { DriverAuthProvider } from '@/app/providers/DriverAuthProvider'
import { OperationsAuthProvider } from '@/app/providers/OperationsAuthProvider'
import { LoginPage } from '@/features/auth/pages/LoginPage'

const renderLoginPage = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AuthProvider>
        <DriverAuthProvider>
          <OperationsAuthProvider>
            <MemoryRouter>
              <LoginPage />
            </MemoryRouter>
          </OperationsAuthProvider>
        </DriverAuthProvider>
      </AuthProvider>
    </QueryClientProvider>,
  )

describe('LoginPage branding', () => {
  it('shows the current auth-facing tagline, not the retired "More" variant', () => {
    renderLoginPage()

    expect(screen.getByText('LAUNDRY • COFFEE • DONE BEAUTIFULLY')).toBeInTheDocument()
    expect(screen.queryByText('Laundry · Coffee · More')).not.toBeInTheDocument()
  })
})

describe('LoginPage social SSO', () => {
  it('renders Apple, Google and Facebook sign-in controls with the "or continue with" divider', () => {
    renderLoginPage()

    expect(screen.getByText(/or continue with/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /continue with apple/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /continue with facebook/i })).toBeInTheDocument()
  })

  it('keeps social sign-in controls safely non-authenticating (disabled, no mock alert) until real provider integration is configured', () => {
    const alertSpy = vi.spyOn(window, 'alert')
    renderLoginPage()

    const appleButton = screen.getByRole('button', { name: /continue with apple/i })
    const googleButton = screen.getByRole('button', { name: /continue with google/i })
    const facebookButton = screen.getByRole('button', { name: /continue with facebook/i })

    expect(appleButton).toBeDisabled()
    expect(googleButton).toBeDisabled()
    expect(facebookButton).toBeDisabled()

    fireEvent.click(appleButton)
    fireEvent.click(googleButton)
    fireEvent.click(facebookButton)

    expect(alertSpy).not.toHaveBeenCalled()
  })

  it('keeps email/mobile sign-in fully functional', () => {
    renderLoginPage()

    expect(screen.getByRole('button', { name: 'Email' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mobile' })).toBeInTheDocument()
    expect(screen.getByLabelText('Phone Number')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })
})
