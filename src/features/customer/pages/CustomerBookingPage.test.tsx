import { render, screen, waitFor, within } from '@testing-library/react'
import { vi } from 'vitest'

vi.mock('@/services/api/customerOrderService', async () => {
  const { mockCustomerOrderService } = await import('@/services/mock')
  return { apiCustomerOrderService: mockCustomerOrderService }
})
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import App from '@/App'
import { AuthProvider } from '@/app/providers/AuthProvider'
import { RequireCustomerAuth } from '@/app/router/RequireCustomerAuth'
import { appPaths } from '@/app/router/paths'
import { CustomerBookingPage } from '@/features/customer/pages/CustomerBookingPage'
import { CustomerServicesPage } from '@/features/customer/pages/CustomerServicesPage'
import { CustomerServiceCategoryPage } from '@/features/customer/pages/CustomerServiceCategoryPage'
import { CustomerOrderDraftProvider } from '@/features/customer/booking/CustomerOrderDraftContext'
import { mockCustomerProfile } from '@/services/mock/data'
import { AUTH_STORAGE_KEY } from '@/services/mock/sessionStore'

const renderApp = (initialEntry: string) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AuthProvider>
        <CustomerOrderDraftProvider>
          <MemoryRouter initialEntries={[initialEntry]}>
            <Routes>
              <Route element={<RequireCustomerAuth />}>
                <Route path={appPaths.customerServices} element={<CustomerServicesPage />} />
                <Route path={appPaths.customerServiceCategory} element={<CustomerServiceCategoryPage />} />
                <Route path={appPaths.customerBooking} element={<CustomerBookingPage />} />
              </Route>
            </Routes>
          </MemoryRouter>
        </CustomerOrderDraftProvider>
      </AuthProvider>
    </QueryClientProvider>,
  )

/** Selects "Shirt / Blouse" (FIXED_SERVICE, quantity-based) × 1 in Dry Cleaning and continues to booking. */
const selectFixedServiceAndContinue = async (user: ReturnType<typeof userEvent.setup>) => {
  renderApp('/customer/services/dry-cleaning')
  await user.click(await screen.findByRole('button', { name: /increase shirt \/ blouse/i }))
  await user.click(await screen.findByRole('link', { name: /continue to collection & delivery/i }))
  await waitFor(() => screen.getByText('Pickup address'))
}

/** Picks the first pickup (and, for DELIVERY, delivery) address + window so Continue is unblocked. */
const fillCollectionDetails = async (user: ReturnType<typeof userEvent.setup>) => {
  const pickupSection = screen.getByText('Pickup address').closest('.rounded-panel')! as HTMLElement
  await user.click(within(pickupSection).getByText('Home').closest('button')!)

  const pickupWindowSection = screen.getByText('Pickup window').closest('.rounded-panel')! as HTMLElement
  const pickupWindowButtons = within(pickupWindowSection).getAllByRole('button')
  await user.click(pickupWindowButtons[0]!)

  if (screen.queryByText('Delivery address')) {
    const deliverySection = screen.getByText('Delivery address').closest('.rounded-panel')! as HTMLElement
    await user.click(within(deliverySection).getByText('Home').closest('button')!)
  }
  if (screen.queryByText('Delivery window')) {
    const deliveryWindowSection = screen.getByText('Delivery window').closest('.rounded-panel')! as HTMLElement
    const deliveryWindowButtons = within(deliveryWindowSection).getAllByRole('button')
    // Pick the last (latest) delivery slot — guaranteed to be strictly after
    // the first (earliest) pickup slot selected above, so it stays enabled.
    await user.click(deliveryWindowButtons[deliveryWindowButtons.length - 1]!)
  }
}

describe('CustomerBookingPage — Collection & Delivery / Review flow', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(mockCustomerProfile))
  })

  it('category service selection actually updates the order draft (quantity control)', async () => {
    const user = userEvent.setup()
    renderApp('/customer/services/dry-cleaning')

    await user.click(await screen.findByRole('button', { name: /increase shirt \/ blouse/i }))

    expect(await screen.findByTestId('quantity-dc-shirt-blouse')).toHaveTextContent('1')
  })

  it('PER_ITEM / FIXED_SERVICE uses quantity controls (−/+)', async () => {
    renderApp('/customer/services/dry-cleaning')

    const card = (await screen.findByText('Shirt / Blouse')).closest('article')!
    expect(within(card).getByRole('button', { name: /increase shirt \/ blouse/i })).toBeInTheDocument()
    expect(within(card).getByRole('button', { name: /decrease shirt \/ blouse/i })).toBeInTheDocument()
  })

  it('PER_KILOGRAM does not expose kilogram quantity controls, only Add/Remove', async () => {
    renderApp('/customer/services/everyday')

    const card = (await screen.findByText('Wash + Dry + Fold')).closest('article')!
    expect(within(card).queryByRole('button', { name: /increase wash/i })).not.toBeInTheDocument()
    expect(within(card).getByRole('button', { name: 'Add service' })).toBeInTheDocument()
  })

  it('PER_KILOGRAM can be Added and Removed', async () => {
    const user = userEvent.setup()
    renderApp('/customer/services/everyday')

    const card = (await screen.findByText('Wash + Dry + Fold')).closest('article')!
    await user.click(within(card).getByRole('button', { name: 'Add service' }))
    expect(within(card).getByText('✓ Added')).toBeInTheDocument()

    await user.click(within(card).getByRole('button', { name: 'Remove' }))
    expect(within(card).getByRole('button', { name: 'Add service' })).toBeInTheDocument()
  })

  it('ASSESSMENT_REQUIRED can be Added and Removed', async () => {
    const user = userEvent.setup()
    renderApp('/customer/services/dry-cleaning')

    const card = (await screen.findByText('Cocktail Dress')).closest('article')!
    await user.click(within(card).getByRole('button', { name: 'Add service' }))
    expect(within(card).getByText('✓ Added')).toBeInTheDocument()

    await user.click(within(card).getByRole('button', { name: 'Remove' }))
    expect(within(card).getByRole('button', { name: 'Add service' })).toBeInTheDocument()
  })

  it('persists multi-category selections across category navigation', async () => {
    const user = userEvent.setup()
    renderApp('/customer/services/everyday')

    const everydayCard = (await screen.findByText('Wash + Dry + Fold')).closest('article')!
    await user.click(within(everydayCard).getByRole('button', { name: 'Add service' }))

    await user.click(await screen.findByRole('link', { name: /back to services/i }))
    await user.click(await screen.findByRole('link', { name: /browse dry cleaning/i }))
    await user.click(await screen.findByRole('button', { name: /increase shirt \/ blouse/i }))

    await user.click(await screen.findByRole('link', { name: /back to services/i }))
    await user.click(await screen.findByRole('link', { name: /browse sneaker care/i }))
    const sneakerCard = (await screen.findByText('Fresh Clean')).closest('article')!
    await user.click(within(sneakerCard).getByRole('button', { name: /increase fresh clean/i }))

    expect(await screen.findByText(/3 items\/services selected/i)).toBeInTheDocument()
  })

  it('New Order → Everyday → select a service → Continue advances to Collection & Delivery (not back to Services)', async () => {
    const user = userEvent.setup()
    renderApp(appPaths.customerServices)

    await user.click(await screen.findByRole('link', { name: /browse everyday/i }))
    await screen.findByRole('heading', { name: 'Everyday' })

    const washDryFoldCard = (await screen.findByText('Wash + Dry + Fold')).closest('article')!
    await user.click(within(washDryFoldCard).getByRole('button', { name: 'Add service' }))

    await user.click(await screen.findByRole('link', { name: /continue to collection & delivery/i }))

    expect(await screen.findByText('Pickup address')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Services' })).not.toBeInTheDocument()
  })

  it('regression: through the real app shell (PublicLayout/RequireCustomerAuth/RoleLayout), Continue does not lose the draft and land back on Services', async () => {
    // Deliberately renders the REAL `App` (real BrowserRouter + the full
    // PublicLayout > RequireCustomerAuth > CoffeeCartProvider >
    // CustomerOrderDraftProvider > RoleLayout nesting from AppRouter),
    // instead of the simplified `renderApp` harness above which mounts
    // CustomerOrderDraftProvider directly above a bare MemoryRouter/Routes
    // tree. That simplified harness cannot detect a regression where an
    // ancestor *inside* the real route tree (e.g. a `key={location.pathname}`
    // remount boundary sitting above the provider) wipes the draft on every
    // navigation, because it never renders those ancestors at all.
    window.history.pushState({}, '', appPaths.customerServices)
    const user = userEvent.setup()
    render(<App />)

    await user.click(await screen.findByRole('link', { name: /browse everyday/i }))
    await screen.findByRole('heading', { name: 'Everyday' })

    const washDryFoldCard = (await screen.findByText('Wash + Dry + Fold')).closest('article')!
    await user.click(within(washDryFoldCard).getByRole('button', { name: 'Add service' }))
    await screen.findByText(/1 item\/service selected/i)

    await user.click(await screen.findByRole('link', { name: /continue to collection & delivery/i }))

    expect(await screen.findByText('Pickup address')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Services' })).not.toBeInTheDocument()
    expect(window.location.pathname).toBe(appPaths.customerBooking)
  })

  it('"Start booking" duplicate flow no longer exists', async () => {
    renderApp('/customer/services/dry-cleaning')
    await screen.findByRole('heading', { name: 'Dry Cleaning' })
    expect(screen.queryByText('Ready to book?')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Start booking' })).not.toBeInTheDocument()
  })

  it('Continue routes directly to Collection & Delivery — no duplicate Choose Your Services screen', async () => {
    const user = userEvent.setup()
    await selectFixedServiceAndContinue(user)

    expect(screen.getByText('Pickup address')).toBeInTheDocument()
    expect(screen.queryByText('Choose your services')).not.toBeInTheDocument()
  })

  it('DELIVERY (the default) requires a delivery address and window before Review', async () => {
    const user = userEvent.setup()
    await selectFixedServiceAndContinue(user)

    expect(screen.getByText('Delivery address')).toBeInTheDocument()
    expect(screen.getByText('Delivery window')).toBeInTheDocument()
  })

  it('STORE_COLLECTION does not require delivery address/window', async () => {
    const user = userEvent.setup()
    await selectFixedServiceAndContinue(user)

    await user.click(screen.getByRole('button', { name: /pickup & collect in store/i }))
    expect(screen.queryByText('Delivery address')).not.toBeInTheDocument()
    expect(screen.queryByText('Delivery window')).not.toBeInTheDocument()
  })

  it('Review renders selected services and uses estimate terminology without exposing payment', async () => {
    const user = userEvent.setup()
    await selectFixedServiceAndContinue(user)
    await fillCollectionDetails(user)

    await user.click(screen.getByRole('button', { name: /continue to review/i }))

    await waitFor(() => screen.getByText('Review your order'))
    expect(screen.getByText(/shirt \/ blouse/i)).toBeInTheDocument()
    expect(screen.getAllByText(/estimated pricing/i).length).toBeGreaterThan(0)
    expect(screen.queryByText('Amount Due')).not.toBeInTheDocument()
    expect(screen.queryByText(/pay now/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirm Booking' })).toBeInTheDocument()
  })

  it('Back preserves the order draft', async () => {
    const user = userEvent.setup()
    await selectFixedServiceAndContinue(user)

    await user.click(screen.getByRole('link', { name: /← back/i }))
    expect(await screen.findByRole('heading', { name: 'Services' })).toBeInTheDocument()
    expect(await screen.findByText(/view order · 1/i)).toBeInTheDocument()
  })

  it('safely redirects direct booking navigation without a draft to /customer/services', async () => {
    renderApp(appPaths.customerBooking)

    expect(await screen.findByRole('heading', { name: 'Services' })).toBeInTheDocument()
  })

  it('places a STORE_COLLECTION order and shows fulfilment-aware confirmation copy', async () => {
    const user = userEvent.setup()
    await selectFixedServiceAndContinue(user)
    await user.click(screen.getByRole('button', { name: /pickup & collect in store/i }))
    await fillCollectionDetails(user)

    await user.click(screen.getByRole('button', { name: /continue to review/i }))
    await waitFor(() => screen.getByText('Review your order'))

    await user.click(screen.getByRole('button', { name: 'Confirm Booking' }))

    expect(await screen.findByText('Your booking is confirmed.', undefined, { timeout: 4000 })).toBeInTheDocument()
    expect(screen.getByText(/you can pay at the load store/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Track order' })).toBeInTheDocument()
  })
})

describe('CustomerBookingPage — pickup/delivery window scheduling validation', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(mockCustomerProfile))
  })

  const selectAddresses = async (user: ReturnType<typeof userEvent.setup>) => {
    const pickupSection = screen.getByText('Pickup address').closest('.rounded-panel')! as HTMLElement
    await user.click(within(pickupSection).getByText('Home').closest('button')!)
    if (screen.queryByText('Delivery address')) {
      const deliverySection = screen.getByText('Delivery address').closest('.rounded-panel')! as HTMLElement
      await user.click(within(deliverySection).getByText('Home').closest('button')!)
    }
  }

  it('disables delivery-window options that are not strictly after the selected pickup window (same-slot invalid)', async () => {
    const user = userEvent.setup()
    await selectFixedServiceAndContinue(user)
    await selectAddresses(user)

    const pickupWindowSection = screen.getByText('Pickup window').closest('.rounded-panel')! as HTMLElement
    const pickupWindowButtons = within(pickupWindowSection).getAllByRole('button')
    const pickupLabel = pickupWindowButtons[0]!.textContent
    await user.click(pickupWindowButtons[0]!)

    const deliveryWindowSection = screen.getByText('Delivery window').closest('.rounded-panel')! as HTMLElement
    const deliveryWindowButtons = within(deliveryWindowSection).getAllByRole('button')

    // The same slot as pickup must be disabled (invalid: same-slot delivery).
    const sameSlotButton = deliveryWindowButtons.find((button) => button.textContent === pickupLabel)!
    expect(sameSlotButton).toBeDisabled()

    // A later slot must remain enabled (valid: strictly-after delivery).
    const laterButton = deliveryWindowButtons[deliveryWindowButtons.length - 1]!
    expect(laterButton).not.toBeDisabled()
  })

  it('clicking a disabled (same-slot or earlier) delivery window does not select it', async () => {
    const user = userEvent.setup()
    await selectFixedServiceAndContinue(user)
    await selectAddresses(user)

    const pickupWindowSection = screen.getByText('Pickup window').closest('.rounded-panel')! as HTMLElement
    const pickupWindowButtons = within(pickupWindowSection).getAllByRole('button')
    await user.click(pickupWindowButtons[1]!) // second (later same-day) slot

    const deliveryWindowSection = screen.getByText('Delivery window').closest('.rounded-panel')! as HTMLElement
    const deliveryWindowButtons = within(deliveryWindowSection).getAllByRole('button')
    // The earliest delivery slot is now before the selected pickup slot — invalid.
    await user.click(deliveryWindowButtons[0]!)

    expect(deliveryWindowButtons[0]).not.toHaveClass('border-load-500')
  })

  it('allows a valid later delivery window to be selected and proceeds to Review', async () => {
    const user = userEvent.setup()
    await selectFixedServiceAndContinue(user)
    await selectAddresses(user)

    const pickupWindowSection = screen.getByText('Pickup window').closest('.rounded-panel')! as HTMLElement
    await user.click(within(pickupWindowSection).getAllByRole('button')[0]!)

    const deliveryWindowSection = screen.getByText('Delivery window').closest('.rounded-panel')! as HTMLElement
    const deliveryWindowButtons = within(deliveryWindowSection).getAllByRole('button')
    const latestDeliveryButton = deliveryWindowButtons[deliveryWindowButtons.length - 1]!
    await user.click(latestDeliveryButton)

    await user.click(screen.getByRole('button', { name: /continue to review/i }))
    await waitFor(() => screen.getByText('Review your order'))
  })

  it('clears an existing delivery selection when the pickup window changes and it becomes invalid', async () => {
    const user = userEvent.setup()
    await selectFixedServiceAndContinue(user)
    await selectAddresses(user)

    const pickupWindowSection = screen.getByText('Pickup window').closest('.rounded-panel')! as HTMLElement
    const pickupWindowButtons = within(pickupWindowSection).getAllByRole('button')
    await user.click(pickupWindowButtons[0]!) // earliest pickup slot

    const deliveryWindowSection = screen.getByText('Delivery window').closest('.rounded-panel')! as HTMLElement
    const deliveryWindowButtons = within(deliveryWindowSection).getAllByRole('button')
    const laterDeliveryButton = deliveryWindowButtons[1]! // valid: strictly after pickup[0]
    await user.click(laterDeliveryButton)
    expect(laterDeliveryButton).toHaveClass('border-load-500')

    // Now move pickup to the same slot the delivery was selected for — the
    // existing delivery selection is no longer valid and must be cleared.
    await user.click(pickupWindowButtons[1]!)

    expect(laterDeliveryButton).not.toHaveClass('border-load-500')
  })

  it('blocks Continue to Review when no valid delivery window has been selected (same-slot option stays disabled)', async () => {
    const user = userEvent.setup()
    await selectFixedServiceAndContinue(user)
    await selectAddresses(user)

    const pickupWindowSection = screen.getByText('Pickup window').closest('.rounded-panel')! as HTMLElement
    const pickupWindowButtons = within(pickupWindowSection).getAllByRole('button')
    await user.click(pickupWindowButtons[0]!)

    // Directly select a later delivery slot, then force it back to the
    // pickup slot by re-selecting pickup after — simulate an invalid
    // in-flight state by attempting Continue without ever fixing delivery.
    await user.click(screen.getByRole('button', { name: /continue to review/i }))

    // Delivery window was never selected (all earlier/equal options disabled
    // and none clicked), so Continue must be blocked with an error toast.
    expect(await screen.findByText('Please select a delivery window.')).toBeInTheDocument()
    expect(screen.queryByText('Review your order')).not.toBeInTheDocument()
  })

  it('STORE_COLLECTION does not require or validate a delivery window', async () => {
    const user = userEvent.setup()
    await selectFixedServiceAndContinue(user)
    await user.click(screen.getByRole('button', { name: /pickup & collect in store/i }))
    await selectAddresses(user)

    const pickupWindowSection = screen.getByText('Pickup window').closest('.rounded-panel')! as HTMLElement
    await user.click(within(pickupWindowSection).getAllByRole('button')[0]!)

    expect(screen.queryByText('Delivery window')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /continue to review/i }))
    await waitFor(() => screen.getByText('Review your order'))
  })
})
