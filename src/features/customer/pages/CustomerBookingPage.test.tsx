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
  await waitFor(() => screen.getByText('Promotion & rewards'))
}

const fillCardForm = async (
  user: ReturnType<typeof userEvent.setup>,
  cardNumber = '4242 4242 4242 4242',
) => {
  await user.type(screen.getByLabelText(/Cardholder name/i), 'Thando Mokoena')
  await user.clear(screen.getByLabelText(/Card number/i))
  await user.type(screen.getByLabelText(/Card number/i), cardNumber)
  await user.type(screen.getByLabelText(/Expiry month/i), '12')
  await user.type(screen.getByLabelText(/Expiry year/i), '35')
  await user.type(screen.getByLabelText(/CVV/i), '123')
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

  it('navigates to step 3 and shows Promotion & rewards section', async () => {
    const user = userEvent.setup()
    renderPage()

    await goToStepThree(user)

    expect(screen.getByText('Promotion & rewards')).toBeInTheDocument()
  })

  it('places an order with Apple Pay via all 3 steps', async () => {
    const user = userEvent.setup()
    renderPage()

    await goToStepThree(user)
    await user.click(screen.getByRole('button', { name: /Apple Pay/i }))
    await user.click(screen.getByRole('button', { name: /Pay .* with Apple Pay/i }))

    expect(await screen.findByText('Payment successful', undefined, { timeout: 4000 })).toBeInTheDocument()
  })

  it('shows the Track order CTA on the confirmation screen', async () => {
    const user = userEvent.setup()
    renderPage()

    await goToStepThree(user)
    await user.click(screen.getByRole('button', { name: /Apple Pay/i }))
    await user.click(screen.getByRole('button', { name: /Pay .* with Apple Pay/i }))

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
    await waitFor(() => screen.getByText('Promotion & rewards'))

    expect(
      await screen.findByText(/estimated amount — final total confirmed after collection and weighing\./i, undefined, {
        timeout: 4000,
      }),
    ).toBeInTheDocument()
  })

  it('shows tip selector on step 3', async () => {
    const user = userEvent.setup()
    renderPage()

    await goToStepThree(user)

    expect(screen.getByText('Tip Your Driver')).toBeInTheDocument()
  })

  it('shows payment method selector on step 3', async () => {
    const user = userEvent.setup()
    renderPage()

    await goToStepThree(user)

    expect(screen.getByText('Payment Method')).toBeInTheDocument()
  })

  it('selecting Apple Pay shows correct CTA', async () => {
    const user = userEvent.setup()
    renderPage()

    await goToStepThree(user)
    await user.click(screen.getByRole('button', { name: /Apple Pay/i }))

    expect(screen.getByRole('button', { name: /Pay .* with Apple Pay/i })).toBeInTheDocument()
  })

  it('selecting card payment shows card form', async () => {
    const user = userEvent.setup()
    renderPage()

    await goToStepThree(user)
    await user.click(screen.getByRole('button', { name: /Credit \/ Debit Card/i }))

    expect(screen.getByLabelText(/Card number/i)).toBeInTheDocument()
  })

  it('driver tip does not affect free-delivery threshold', async () => {
    const user = userEvent.setup()
    renderPage()

    await goToStepThree(user)
    const freeDeliveryGap = await screen.findByText(/to go/i)
    expect(freeDeliveryGap).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'R20' }))

    expect(
      screen.getByText((_, element) => element?.textContent === freeDeliveryGap.textContent),
    ).toBeInTheDocument()
  })

  it('Apple Pay mock payment succeeds and shows confirmation', async () => {
    const user = userEvent.setup()
    renderPage()

    await goToStepThree(user)
    await user.click(screen.getByRole('button', { name: /Apple Pay/i }))
    await user.click(screen.getByRole('button', { name: /Pay .* with Apple Pay/i }))

    expect(await screen.findByText('Payment successful', undefined, { timeout: 4000 })).toBeInTheDocument()
  })

  it('card payment mock succeeds with valid card number', async () => {
    const user = userEvent.setup()
    renderPage()

    await goToStepThree(user)
    await user.click(screen.getByRole('button', { name: /Credit \/ Debit Card/i }))
    await fillCardForm(user)
    await user.click(screen.getByRole('button', { name: /Pay by card/i }))

    expect(await screen.findByText('Payment successful', undefined, { timeout: 4000 })).toBeInTheDocument()
  })

  it('card payment fails with declined card ending 0000', async () => {
    const user = userEvent.setup()
    renderPage()

    await goToStepThree(user)
    await user.click(screen.getByRole('button', { name: /Credit \/ Debit Card/i }))
    await fillCardForm(user, '4000 0000 0000 0000')
    await user.click(screen.getByRole('button', { name: /Pay by card/i }))

    expect(await screen.findByText('Payment failed', undefined, { timeout: 4000 })).toBeInTheDocument()
    expect(screen.getByText('Card declined')).toBeInTheDocument()
  })

  it('retry after payment failure', async () => {
    const user = userEvent.setup()
    renderPage()

    await goToStepThree(user)
    await user.click(screen.getByRole('button', { name: /Credit \/ Debit Card/i }))
    await fillCardForm(user, '4000 0000 0000 0000')
    await user.click(screen.getByRole('button', { name: /Pay by card/i }))

    expect(await screen.findByText('Payment failed', undefined, { timeout: 4000 })).toBeInTheDocument()
    expect(screen.getByLabelText(/Card number/i)).toHaveValue('4000 0000 0000 0000')

    await user.click(screen.getByRole('button', { name: 'Retry' }))

    await waitFor(() => {
      expect(screen.queryByText('Payment failed')).not.toBeInTheDocument()
    })
    expect(screen.getByLabelText(/Card number/i)).toHaveValue('4000 0000 0000 0000')

    await user.clear(screen.getByLabelText(/Card number/i))
    await user.type(screen.getByLabelText(/Card number/i), '4242 4242 4242 4242')
    await user.click(screen.getByRole('button', { name: /Pay by card/i }))

    expect(await screen.findByText('Payment successful', undefined, { timeout: 4000 })).toBeInTheDocument()
  })
})
