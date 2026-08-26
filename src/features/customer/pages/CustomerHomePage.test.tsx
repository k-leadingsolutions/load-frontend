import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/app/providers/AuthProvider'
import { RequireCustomerAuth } from '@/app/router/RequireCustomerAuth'
import { appPaths } from '@/app/router/paths'
import { CustomerHomePage } from '@/features/customer/pages/CustomerHomePage'
import { mockCustomerProfile } from '@/services/mock/data'
import { AUTH_STORAGE_KEY } from '@/services/mock/sessionStore'

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AuthProvider>
        <MemoryRouter initialEntries={[appPaths.customerHome]}>
          <Routes>
            <Route element={<RequireCustomerAuth />}>
              <Route path={appPaths.customerHome} element={<CustomerHomePage />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  )

describe('CustomerHomePage', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(mockCustomerProfile))
  })

  it('renders a greeting with the customer name', async () => {
    renderPage()
    expect(await screen.findByText(mockCustomerProfile.firstName, { exact: false })).toBeInTheDocument()
  })

  it('renders loyalty balance stats', async () => {
    renderPage()
    expect(await screen.findByText('Balance')).toBeInTheDocument()
    expect(screen.getByText('Points')).toBeInTheDocument()
    expect(screen.getAllByText('Rewards').length).toBeGreaterThan(0)
  })

  it('renders quick action navigation links', async () => {
    renderPage()
    expect(await screen.findByRole('link', { name: /new order/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /my orders/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /rewards/i })).toBeInTheDocument()
  })

  it('renders the Quick Services section', async () => {
    renderPage()
    expect(await screen.findByRole('heading', { name: /quick actions/i })).toBeInTheDocument()
    expect((await screen.findAllByText(/everyday/i)).length).toBeGreaterThan(0)
  })

  it('renders the LOAD Coffee section', async () => {
    renderPage()
    expect(await screen.findByRole('button', { name: /load coffee/i })).toBeInTheDocument()
  })

  it('renders the recent orders section heading', async () => {
    renderPage()
    expect(await screen.findByRole('heading', { name: /recent orders/i })).toBeInTheDocument()
  })
})
