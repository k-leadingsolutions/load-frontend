import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/app/providers/AuthProvider'
import { RequireCustomerAuth } from '@/app/router/RequireCustomerAuth'
import { RoleLayout } from '@/app/layouts/RoleLayout'
import { appPaths } from '@/app/router/paths'
import { CustomerHomePage } from '@/features/customer/pages/CustomerHomePage'
import { CustomerServicesPage } from '@/features/customer/pages/CustomerServicesPage'
import { mockCustomerProfile } from '@/services/mock/data'
import { AUTH_STORAGE_KEY } from '@/services/mock/sessionStore'

/**
 * Renders the same route shape used in production: a role layout providing the
 * bottom navigation "New Order" link, plus the Customer Home page (which owns
 * the Quick Actions "New Order" shortcut) and the canonical Services page —
 * so both entry points can be exercised against the real routing tree.
 */
const renderCustomerArea = (initialEntry: string) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AuthProvider>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route element={<RequireCustomerAuth />}>
              <Route
                element={
                  <RoleLayout
                    roleLabel="Customer"
                    greetingMode
                    mobileNavLinks={[
                      { to: appPaths.customerHome, label: 'Home', icon: '⌂' },
                      { to: appPaths.customerServices, label: 'New Order', icon: '+', emphasis: true },
                    ]}
                  />
                }
              >
                <Route path={appPaths.customerHome} element={<CustomerHomePage />} />
                <Route path={appPaths.customerServices} element={<CustomerServicesPage />} />
              </Route>
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  )

describe('Customer New Order entry points', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(mockCustomerProfile))
  })

  it('opens the canonical Services screen from the bottom navigation "New Order" link', async () => {
    const user = userEvent.setup()
    renderCustomerArea(appPaths.customerHome)

    await screen.findByText(mockCustomerProfile.firstName, { exact: false })
    const bottomNav = screen.getByRole('navigation', { name: /customer navigation/i })
    await user.click(within(bottomNav).getByRole('link', { name: /new order/i }))

    expect(await screen.findByRole('heading', { name: 'Services' })).toBeInTheDocument()
    expect(
      screen.getByText('Choose a category to explore individual services and pricing.'),
    ).toBeInTheDocument()
  })

  it('opens the same canonical Services screen from the Quick Actions "New Order" shortcut', async () => {
    const user = userEvent.setup()
    renderCustomerArea(appPaths.customerHome)

    await screen.findByRole('heading', { name: /quick actions/i })
    const quickActionsRegion = screen.getByRole('heading', { name: /quick actions/i }).closest('section')!
    const newOrderLink = within(quickActionsRegion).getByRole('link', { name: /new order/i })
    await user.click(newOrderLink)

    expect(await screen.findByRole('heading', { name: 'Services' })).toBeInTheDocument()
    expect(
      screen.getByText('Choose a category to explore individual services and pricing.'),
    ).toBeInTheDocument()
  })

  it('renders no separate "New Order" screen — both entry points share the CustomerServicesPage root', async () => {
    renderCustomerArea(appPaths.customerServices)

    expect(await screen.findByRole('heading', { name: 'Services' })).toBeInTheDocument()
    // The legacy step-based booking stepper heading must not appear on this canonical route.
    expect(screen.queryByText('Choose your services')).not.toBeInTheDocument()
  })
})
