import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/app/providers/AuthProvider'
import { PublicLayout } from '@/app/layouts/PublicLayout'

const renderAt = (initialEntry: string) =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <QueryClientProvider client={new QueryClient()}>
        <AuthProvider>
          <Routes>
            <Route element={<PublicLayout />}>
              <Route path="/" element={<div>home page</div>} />
              <Route path="/operations/dashboard" element={<div>operations dashboard page</div>} />
              <Route path="/operations/login" element={<div>operations login page</div>} />
              <Route path="/admin/overview" element={<div>admin overview page</div>} />
            </Route>
          </Routes>
        </AuthProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  )

describe('PublicLayout', () => {
  it('shows the public header with the official LOAD brand tagline on public routes', () => {
    renderAt('/')

    expect(screen.getByText('LAUNDRY • COFFEE • DONE BEAUTIFULLY')).toBeInTheDocument()
    expect(screen.queryByText('Premium laundry and delivery MVP foundation')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Sign in' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Create account' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument()
  })

  it('hides the public Home/Customer/Sign in/Create account controls on an Operations page', () => {
    renderAt('/operations/dashboard')

    expect(screen.getByText('operations dashboard page')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Sign in' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Create account' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Home' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Customer' })).not.toBeInTheDocument()
  })

  it('hides the public controls on an Admin page', () => {
    renderAt('/admin/overview')

    expect(screen.getByText('admin overview page')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Sign in' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Home' })).not.toBeInTheDocument()
  })

  it('still shows the public header on the Operations login route', () => {
    renderAt('/operations/login')

    expect(screen.getByText('operations login page')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Sign in' })).toBeInTheDocument()
  })
})
