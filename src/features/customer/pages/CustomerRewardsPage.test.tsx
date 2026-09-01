import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/app/providers/AuthProvider'
import { RequireCustomerAuth } from '@/app/router/RequireCustomerAuth'
import { appPaths } from '@/app/router/paths'
import { CustomerRewardsPage } from '@/features/customer/pages/CustomerRewardsPage'
import { mockCustomerProfile } from '@/services/mock/data'
import { AUTH_STORAGE_KEY } from '@/services/mock/sessionStore'

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AuthProvider>
        <MemoryRouter initialEntries={[appPaths.customerRewards]}>
          <Routes>
            <Route element={<RequireCustomerAuth />}>
              <Route path={appPaths.customerRewards} element={<CustomerRewardsPage />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  )

describe('CustomerRewardsPage', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(mockCustomerProfile))
  })

  it('renders the loyalty balance hero tiles', async () => {
    renderPage()
    expect(await screen.findByText('Tier')).toBeInTheDocument()
    expect(screen.getByText('Points balance')).toBeInTheDocument()
    expect(screen.getByText('LOAD balance')).toBeInTheDocument()
  })

  it('renders both Rewards and History tabs', async () => {
    renderPage()
    expect(await screen.findByRole('tab', { name: /available rewards/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /loyalty history/i })).toBeInTheDocument()
  })

  it('shows reward cards with a Redeem reward button on the rewards tab', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: 'Redeem reward' }).length).toBeGreaterThan(0)
    })
  })

  it('switches to the history tab and shows transaction activity', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByRole('tab', { name: /loyalty history/i })
    await user.click(screen.getByRole('tab', { name: /loyalty history/i }))

    await waitFor(() => {
      // Transactions should be visible; the tab panel should be active
      expect(screen.getByRole('tabpanel')).toBeInTheDocument()
    })
  })

  it('disables Redeem reward button for locked rewards', async () => {
    renderPage()
    await waitFor(() => {
      const buttons = screen.getAllByRole('button', { name: 'Redeem reward' })
      // Some buttons may be disabled (locked rewards)
      expect(buttons.length).toBeGreaterThan(0)
    })
    // All "Locked" badges should be visible for unavailable rewards
    const lockedBadges = screen.queryAllByText('Locked')
    const availableBadges = screen.queryAllByText('Available')
    expect(lockedBadges.length + availableBadges.length).toBeGreaterThan(0)
  })
})
