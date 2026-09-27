import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/app/providers/AuthProvider'
import { LoginPage } from '@/features/auth/pages/LoginPage'

const renderLoginPage = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AuthProvider>
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
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
  it('does not render any non-functional social sign-in controls', () => {
    renderLoginPage()

    expect(screen.queryByText(/or continue with/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /continue with apple/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /continue with google/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /continue with facebook/i })).not.toBeInTheDocument()
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
