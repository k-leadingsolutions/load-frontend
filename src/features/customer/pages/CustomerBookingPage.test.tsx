import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/app/providers/AuthProvider'
import { RequireCustomerAuth } from '@/app/router/RequireCustomerAuth'
import { appPaths } from '@/app/router/paths'
import { CustomerBookingPage } from '@/features/customer/pages/CustomerBookingPage'
import { mockCustomerProfile } from '@/services/mock/data'
import { AUTH_STORAGE_KEY } from '@/services/mock/sessionStore'

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AuthProvider>
        <MemoryRouter initialEntries={[appPaths.customerBooking]}>
          <Routes>
            <Route element={<RequireCustomerAuth />}>
              <Route path={appPaths.customerBooking} element={<CustomerBookingPage />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  )

describe('CustomerBookingPage', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(mockCustomerProfile))
  })

  it('shows the three-step stepper header on load', async () => {
    renderPage()
    expect(await screen.findByText('Service selection')).toBeInTheDocument()
    expect(screen.getByText('Schedule & address')).toBeInTheDocument()
    expect(screen.getByText('Review & pay')).toBeInTheDocument()
  })

  it('shows step 1 service selection content on load', async () => {
    renderPage()
    expect(await screen.findByText('Choose pricing mode')).toBeInTheDocument()
  })

  it('navigates from step 1 to step 2 using Next button', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Choose pricing mode')

    await user.click(screen.getByRole('button', { name: /Next: Schedule & address/i }))

    await waitFor(() => {
      expect(screen.getByText('Pickup address')).toBeInTheDocument()
    })
    expect(screen.queryByText('Choose pricing mode')).not.toBeInTheDocument()
  })

  it('navigates back from step 2 to step 1 using Back button', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Choose pricing mode')
    await user.click(screen.getByRole('button', { name: /Next: Schedule & address/i }))
    await waitFor(() => screen.getByText('Pickup address'))

    await user.click(screen.getByRole('button', { name: /← Back/i }))

    await waitFor(() => {
      expect(screen.getByText('Choose pricing mode')).toBeInTheDocument()
    })
  })

  it('navigates to step 3 and shows Review & pay heading', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Choose pricing mode')

    // Step 1 → 2
    await user.click(screen.getByRole('button', { name: /Next: Schedule & address/i }))
    await waitFor(() => screen.getByText('Pickup address'))

    // Step 2 → 3
    await user.click(screen.getByRole('button', { name: /Next: Review & pay/i }))

    await waitFor(() => {
      expect(screen.getByText('Promotion & rewards')).toBeInTheDocument()
    })
  })

  it('places a seeded basket booking via all 3 steps', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Choose pricing mode')

    // Step 1 → 2 (default basket already selected)
    await user.click(screen.getByRole('button', { name: /Next: Schedule & address/i }))
    await waitFor(() => screen.getByText('Pickup address'))

    // Step 2 → 3 (default address + windows already set)
    await user.click(screen.getByRole('button', { name: /Next: Review & pay/i }))
    await waitFor(() => screen.getByText('Promotion & rewards'))

    // Place order
    await user.click(screen.getByRole('button', { name: /Place order|Placing order/i }))

    await waitFor(() => {
      expect(screen.getByText('Order booked')).toBeInTheDocument()
    })
  })

  it('shows the Track order CTA on the confirmation screen', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Choose pricing mode')
    await user.click(screen.getByRole('button', { name: /Next: Schedule & address/i }))
    await waitFor(() => screen.getByText('Pickup address'))
    await user.click(screen.getByRole('button', { name: /Next: Review & pay/i }))
    await waitFor(() => screen.getByText('Promotion & rewards'))
    await user.click(screen.getByRole('button', { name: /Place order|Placing order/i }))

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Track order' })).toBeInTheDocument()
    })
  })

  it('shows weight-based estimate disclaimer on step 3 for per-kilogram flow', async () => {
    const user = userEvent.setup()
    renderPage()

    // Step 1: select per kg and add a service
    await user.click(await screen.findByRole('button', { name: /pay per kilogram/i }))
    await user.click(screen.getByRole('button', { name: /increase wash \+ dry \+ fold/i }))

    // Step 1 → 2
    await user.click(screen.getByRole('button', { name: /Next: Schedule & address/i }))
    await waitFor(() => screen.getByText('Pickup address'))

    // Step 2 → 3
    await user.click(screen.getByRole('button', { name: /Next: Review & pay/i }))
    await waitFor(() => screen.getByText('Promotion & rewards'))

    await waitFor(() => {
      expect(
        screen.getByText(/estimated price\. final amount will be confirmed after collection and weighing\./i),
      ).toBeInTheDocument()
    })
  })
})
