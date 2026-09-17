import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DriverAuthProvider } from '@/app/providers/DriverAuthProvider'
import { RequireDriverRole } from '@/app/router/RequireDriverRole'

const renderGuarded = () => {
  const queryClient = new QueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <DriverAuthProvider>
        <MemoryRouter initialEntries={['/driver/dashboard']}>
          <Routes>
            <Route path="/driver/login" element={<div>Driver login screen</div>} />
            <Route element={<RequireDriverRole />}>
              <Route path="/driver/dashboard" element={<div>Driver dashboard content</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </DriverAuthProvider>
    </QueryClientProvider>,
  )
}

describe('RequireDriverRole (role isolation)', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('redirects to the driver login screen when no driver session exists', async () => {
    renderGuarded()

    await waitFor(() => {
      expect(screen.getByText('Driver login screen')).toBeInTheDocument()
    })
    expect(screen.queryByText('Driver dashboard content')).not.toBeInTheDocument()
  })

  it('never grants access using a stale/foreign Customer session key', async () => {
    // A Customer session (different storage key/shape) must not satisfy the Driver guard.
    window.localStorage.setItem('load.customer.session.v1', JSON.stringify({ id: 'cust-1', role: 'CUSTOMER' }))

    renderGuarded()

    await waitFor(() => {
      expect(screen.getByText('Driver login screen')).toBeInTheDocument()
    })
  })
})
