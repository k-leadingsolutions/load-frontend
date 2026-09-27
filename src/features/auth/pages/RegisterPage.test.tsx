import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/app/providers/AuthProvider'
import { RegisterPage } from '@/features/auth/pages/RegisterPage'

describe('RegisterPage branding', () => {
  it('shows the current auth-facing tagline, not the retired "More" variant', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <AuthProvider>
          <MemoryRouter>
            <RegisterPage />
          </MemoryRouter>
        </AuthProvider>
      </QueryClientProvider>,
    )

    expect(screen.getByText('LAUNDRY • COFFEE • DONE BEAUTIFULLY')).toBeInTheDocument()
    expect(screen.queryByText('Laundry · Coffee · More')).not.toBeInTheDocument()
  })
})
