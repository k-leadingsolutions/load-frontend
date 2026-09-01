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

/** Navigate from step 1 → step 2 → step 3, selecting a service along the way */
const goToStepThree = async (user: ReturnType<typeof userEvent.setup>) => {
  await screen.findByText('Choose your services')
  await user.click(screen.getByRole('button', { name: /increase shirt \/ blouse/i }))
  await user.click(screen.getByRole('button', { name: /Next: Collection & delivery/i }))
  await waitFor(() => screen.getByText('Pickup address'))
  await user.click(screen.getByRole('button', { name: /Next: Review/i }))
  await waitFor(() => screen.getByText('Review your order'))
  await waitFor(() => expect(screen.getByRole('button', { name: /Confirm order/i })).toBeEnabled())
}

describe('CustomerBookingPage', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(mockCustomerProfile))
  })

  it('shows the three-step stepper header on load', async () => {
    renderPage()
    expect(await screen.findByText('Services')).toBeInTheDocument()
    expect(screen.getByText('Collection & delivery')).toBeInTheDocument()
    expect(screen.getByText('Review')).toBeInTheDocument()
  })

  it('shows step 1 service list on load', async () => {
    renderPage()
    expect(await screen.findByText('Choose your services')).toBeInTheDocument()
  })

  it('does not show pricing-model choice tiles', async () => {
    renderPage()
    await screen.findByText('Choose your services')
    expect(screen.queryByText('Choose pricing mode')).not.toBeInTheDocument()
    expect(screen.queryByText('Pay per basket')).not.toBeInTheDocument()
    expect(screen.queryByText('Pay per kilogram')).not.toBeInTheDocument()
  })

  it('does not show basket size tiles', async () => {
    renderPage()
    await screen.findByText('Choose your services')
    expect(screen.queryByText('Basket pricing')).not.toBeInTheDocument()
  })

  it('navigates from step 1 to step 2 using Next button', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Choose your services')
    await user.click(screen.getByRole('button', { name: /increase shirt \/ blouse/i }))
    await user.click(screen.getByRole('button', { name: /Next: Collection & delivery/i }))

    await waitFor(() => {
      expect(screen.getByText('Pickup address')).toBeInTheDocument()
    })
    expect(screen.queryByText('Choose your services')).not.toBeInTheDocument()
  })

  it('navigates back from step 2 to step 1 using Back button', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('Choose your services')
    await user.click(screen.getByRole('button', { name: /increase shirt \/ blouse/i }))
    await user.click(screen.getByRole('button', { name: /Next: Collection & delivery/i }))
    await waitFor(() => screen.getByText('Pickup address'))

    await user.click(screen.getByRole('button', { name: /← Back/i }))

    await waitFor(() => {
      expect(screen.getByText('Choose your services')).toBeInTheDocument()
    })
  })

  it('Step 3 shows order review and Confirm order button', async () => {
    const user = userEvent.setup()
    renderPage()

    await goToStepThree(user)

    expect(screen.getByText('Review your order')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Confirm order/i })).toBeInTheDocument()
  })

  it('shows the Track order CTA on the confirmation screen', async () => {
    const user = userEvent.setup()
    renderPage()

    await goToStepThree(user)
    await user.click(screen.getByRole('button', { name: /Confirm order/i }))

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Track order' })).toBeInTheDocument()
    }, { timeout: 4000 })
  })

  it('shows weight-based estimate disclaimer on step 3 for a per-kilogram service', async () => {
    const user = userEvent.setup()
    renderPage()

    // Wash + Dry + Fold is PER_KILOGRAM — select it directly
    await user.click(await screen.findByRole('button', { name: /increase wash \+ dry \+ fold/i }))
    await user.click(screen.getByRole('button', { name: /Next: Collection & delivery/i }))
    await waitFor(() => screen.getByText('Pickup address'))
    await user.click(screen.getByRole('button', { name: /Next: Review/i }))
    await waitFor(() => screen.getByText('Review your order'))

    expect(
      await screen.findByText(/estimated amount — final total confirmed after collection and weighing\./i, undefined, {
        timeout: 4000,
      }),
    ).toBeInTheDocument()
  })

  it('places order and shows confirmation screen', async () => {
    const user = userEvent.setup()
    renderPage()

    await goToStepThree(user)
    await user.click(screen.getByRole('button', { name: /Confirm order/i }))

    expect(await screen.findByText('Order confirmed', undefined, { timeout: 4000 })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Track order' })).toBeInTheDocument()
  })
})
