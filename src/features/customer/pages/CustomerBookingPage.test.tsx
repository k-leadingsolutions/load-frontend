import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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
import { evaluateDeliverySchedule, getWindowSlotsForDate, minBookablePickupDate } from '@/features/customer/booking/bookingOptions'
import { apiAddressService } from '@/services/api/addressService'
import { mockCustomerOrderService } from '@/services/mock'
import { mockCustomerProfile } from '@/services/mock/data'
import { AUTH_STORAGE_KEY } from '@/services/mock/sessionStore'
import { formatCurrency } from '@/utils/format'

/** Testing-library's default text normalizer collapses `\u00A0` (the non-breaking space in ZAR currency formatting) to a regular space, so matchers must do the same. */
const currencyText = (amount: number) => formatCurrency(amount).replace(/\u00A0/g, ' ')

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

/** Finds the first delivery window (starting from the pickup date) that is fully feasible against the given pickup window. */
const findFeasibleDeliveryWindow = (pickupWindowLabel: string): string => {
  const [pickupDateIso] = pickupWindowLabel.split('|').map((part) => part.trim())
  for (let dayOffset = 0; dayOffset <= 6; dayOffset += 1) {
    const candidateDate = new Date(`${pickupDateIso}T00:00:00Z`)
    candidateDate.setUTCDate(candidateDate.getUTCDate() + dayOffset)
    const candidateIso = candidateDate.toISOString().slice(0, 10)
    for (const candidateWindow of getWindowSlotsForDate(candidateIso)) {
      if (evaluateDeliverySchedule(pickupWindowLabel, candidateWindow).feasible) {
        return candidateWindow
      }
    }
  }
  throw new Error(`No feasible delivery window found for pickup window ${pickupWindowLabel}`)
}

const setDateInput = (section: HTMLElement, labelText: string, isoDate: string) => {
  const input = within(section).getByLabelText(labelText)
  fireEvent.change(input, { target: { value: isoDate } })
}

/** Picks the first pickup slot on the earliest bookable date, and (for DELIVERY) the earliest feasible delivery slot. */
const fillCollectionDetails = async (user: ReturnType<typeof userEvent.setup>) => {
  const pickupSection = screen.getByText('Pickup address').closest('.rounded-panel')! as HTMLElement
  await user.click(within(pickupSection).getByText('Home').closest('button')!)

  const pickupWindowSection = screen.getByText('Pickup window').closest('.rounded-panel')! as HTMLElement
  const pickupDate = minBookablePickupDate()
  setDateInput(pickupWindowSection, 'Pickup date', pickupDate)
  const pickupWindowButtons = within(pickupWindowSection).getAllByRole('button')
  await user.click(pickupWindowButtons[0]!)
  const pickupWindowLabel = getWindowSlotsForDate(pickupDate)[0]!

  if (screen.queryByText('Delivery address')) {
    const deliverySection = screen.getByText('Delivery address').closest('.rounded-panel')! as HTMLElement
    await user.click(within(deliverySection).getByText('Home').closest('button')!)
  }
  if (screen.queryByText('Delivery window')) {
    const deliveryWindowLabel = findFeasibleDeliveryWindow(pickupWindowLabel)
    const [deliveryDate, deliveryTime] = deliveryWindowLabel.split('|').map((part) => part.trim())
    const deliveryWindowSection = screen.getByText('Delivery window').closest('.rounded-panel')! as HTMLElement
    setDateInput(deliveryWindowSection, 'Delivery date', deliveryDate!)
    const deliveryButton = within(deliveryWindowSection)
      .getAllByRole('button')
      .find((button) => button.textContent === deliveryTime)!
    await user.click(deliveryButton)
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
    expect(screen.getAllByText(/shirt \/ blouse/i).length).toBeGreaterThan(0)
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

describe('CustomerBookingPage — regression: estimate continuity (never a fabricated per-kg total, always an honest headline)', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(mockCustomerProfile))
  })

  it('renders the exact regression: Wash + Dry + Fold R45/kg + Delivery R49 shows per-line pricing and "Calculated after weighing" (never a fabricated delivery-as-laundry-price headline)', async () => {
    const user = userEvent.setup()
    renderApp('/customer/services/everyday')

    // "Wash + Dry + Fold" is PER_KILOGRAM — it contributes 0 to `subtotal`
    // (only exact-priced items do), but with the default DELIVERY
    // fulfilment (default demo address is within the 1–5km / R49 tier) and
    // no free-delivery threshold met, a R49 delivery fee still applies. The
    // Review estimate must show the per-kg rate and the delivery fee as
    // separate, honest lines, and must NEVER headline the delivery fee
    // alone as if it were the laundry price estimate.
    const card = (await screen.findByText('Wash + Dry + Fold')).closest('article')!
    await user.click(within(card).getByRole('button', { name: 'Add service' }))
    await user.click(await screen.findByRole('link', { name: /continue to collection & delivery/i }))
    await waitFor(() => screen.getByText('Pickup address'))
    await fillCollectionDetails(user)

    await user.click(screen.getByRole('button', { name: /continue to review/i }))
    await waitFor(() => screen.getByText('Review your order'))

    // Selected-service line presentation: per-kg rate and delivery fee shown
    // separately. The delivery fee itself is now resolved asynchronously
    // (it depends on the selected address's distance tier), so it must be
    // awaited rather than asserted synchronously.
    expect((await screen.findAllByText(`${currencyText(45)}/kg`)).length).toBeGreaterThan(0)
    expect((await screen.findAllByText('Delivery fee')).length).toBeGreaterThan(0)
    expect(screen.getAllByText(currencyText(49)).length).toBeGreaterThan(0)

    // Total presentation semantics: never the old fabricated headline.
    const oldFabricatedHeadline = `from ${currencyText(45)} + weight-based services`
    expect(screen.queryByText(oldFabricatedHeadline)).not.toBeInTheDocument()
    expect(screen.getAllByText('Calculated after weighing').length).toBeGreaterThan(0)
    expect(screen.queryByText(currencyText(0))).not.toBeInTheDocument()
  })

  it('preserves the same "Calculated after weighing" headline through to the confirmation screen', async () => {
    const user = userEvent.setup()
    renderApp('/customer/services/everyday')

    const card = (await screen.findByText('Wash + Dry + Fold')).closest('article')!
    await user.click(within(card).getByRole('button', { name: 'Add service' }))
    await user.click(await screen.findByRole('link', { name: /continue to collection & delivery/i }))
    await waitFor(() => screen.getByText('Pickup address'))
    await fillCollectionDetails(user)

    await user.click(screen.getByRole('button', { name: /continue to review/i }))
    await waitFor(() => screen.getByText('Review your order'))
    // Wait for the (asynchronously resolved, distance-dependent) quote to
    // load before booking, so the confirmation snapshot reflects it.
    await screen.findAllByText('Delivery fee')
    await user.click(screen.getByRole('button', { name: 'Confirm Booking' }))

    await screen.findByText('Your booking is confirmed.', undefined, { timeout: 4000 })
    expect(screen.getByText('Calculated after weighing')).toBeInTheDocument()
    expect(screen.queryByText(`from ${currencyText(45)} + weight-based services`)).not.toBeInTheDocument()
  })
})

describe('CustomerBookingPage — regression: unresolved distance must never render as FREE delivery', () => {
  // Reproduces the reported screenshot bug: a real persisted address has no
  // `distanceKm` (there is no real geocoding/routing integration yet), so
  // delivery pricing for it is genuinely UNKNOWN — never "FREE".
  const profileWithoutDistanceData = {
    ...mockCustomerProfile,
    addresses: mockCustomerProfile.addresses.map(({ distanceKm: _distanceKm, ...address }) => address),
  }

  beforeEach(() => {
    window.localStorage.clear()
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(profileWithoutDistanceData))
  })

  it('Dry Only R35/kg + a persisted address without distanceKm: never shows "Delivery fee FREE", shows a pending state, and fabricates no free-delivery progress', async () => {
    const user = userEvent.setup()
    renderApp('/customer/services/everyday')

    const card = (await screen.findByText('Dry Only')).closest('article')!
    await user.click(within(card).getByRole('button', { name: 'Add service' }))
    await user.click(await screen.findByRole('link', { name: /continue to collection & delivery/i }))
    await waitFor(() => screen.getByText('Pickup address'))
    await fillCollectionDetails(user)

    await user.click(screen.getByRole('button', { name: /continue to review/i }))
    await waitFor(() => screen.getByText('Review your order'))

    // The per-kg laundry line renders honestly regardless of delivery pricing.
    expect((await screen.findAllByText(`${currencyText(35)}/kg`)).length).toBeGreaterThan(0)
    expect(screen.getAllByText('Calculated after weighing').length).toBeGreaterThan(0)

    // The critical assertions: an unresolved distance must never be
    // presented as free delivery, must show an honest pending state, and
    // must never fabricate free-delivery progress toward an unknown tier.
    expect(screen.queryByText('FREE')).not.toBeInTheDocument()
    expect(await screen.findAllByText('Delivery fee calculated from your address')).not.toHaveLength(0)
    expect(screen.queryByText('Free delivery progress')).not.toBeInTheDocument()
    expect(screen.queryByText(/to go$/)).not.toBeInTheDocument()
    expect(screen.queryByText('Free delivery unlocked')).not.toBeInTheDocument()
  })

  it('once a known distance is available (4km), the same basket resolves to the correct R49 fee and R265-to-go / ~11.67% progress', async () => {
    const user = userEvent.setup()
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
      ...mockCustomerProfile,
      addresses: mockCustomerProfile.addresses.map((address) =>
        address.id === mockCustomerProfile.addresses[0]!.id ? { ...address, distanceKm: 4 } : address),
    }))
    renderApp('/customer/services/everyday')

    const card = (await screen.findByText('Dry Only')).closest('article')!
    await user.click(within(card).getByRole('button', { name: 'Add service' }))
    await user.click(await screen.findByRole('link', { name: /continue to collection & delivery/i }))
    await waitFor(() => screen.getByText('Pickup address'))
    await fillCollectionDetails(user)

    await user.click(screen.getByRole('button', { name: /continue to review/i }))
    await waitFor(() => screen.getByText('Review your order'))

    expect((await screen.findAllByText(currencyText(49))).length).toBeGreaterThan(0)
    expect(screen.getAllByText(`${currencyText(265)} to go`).length).toBeGreaterThan(0)
    expect(screen.queryByText('FREE')).not.toBeInTheDocument()
  })

  it('12km (beyond the far tier) charges R99 and shows no free-delivery progress at all', async () => {
    const user = userEvent.setup()
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
      ...mockCustomerProfile,
      addresses: mockCustomerProfile.addresses.map((address) =>
        address.id === mockCustomerProfile.addresses[0]!.id ? { ...address, distanceKm: 12 } : address),
    }))
    renderApp('/customer/services/everyday')

    const card = (await screen.findByText('Dry Only')).closest('article')!
    await user.click(within(card).getByRole('button', { name: 'Add service' }))
    await user.click(await screen.findByRole('link', { name: /continue to collection & delivery/i }))
    await waitFor(() => screen.getByText('Pickup address'))
    await fillCollectionDetails(user)

    await user.click(screen.getByRole('button', { name: /continue to review/i }))
    await waitFor(() => screen.getByText('Review your order'))

    expect((await screen.findAllByText(currencyText(99))).length).toBeGreaterThan(0)
    expect(screen.queryByText('Free delivery progress')).not.toBeInTheDocument()
    expect(screen.queryByText(/to go$/)).not.toBeInTheDocument()
    expect(screen.queryByText('Free delivery unlocked')).not.toBeInTheDocument()
  })
})

describe('CustomerBookingPage — regression: customer-facing LD##### order reference (never a raw UUID)', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(mockCustomerProfile))
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('displays orderNumber (LD#####) on the confirmation screen, not the backend id (UUID)', async () => {
    const backendUuid = '11111111-2222-3333-4444-555555555555'
    vi.spyOn(mockCustomerOrderService, 'placeOrder').mockImplementation(async () => ({
      data: {
        id: backendUuid,
        orderNumber: 'LD90210',
        customerId: 'customer-1',
        status: 'BOOKING_RECEIVED',
        friendlyStatus: 'Booking received',
        pickupWindow: { date: '2026-01-01', windowLabel: '2026-01-01 | 08:00 - 12:00' },
        pickupAddress: mockCustomerProfile.addresses[0]!,
        services: [],
        estimatedTotal: 199,
        paymentStatus: 'NOT_REQUIRED',
        invoiceStatus: 'NOT_AVAILABLE',
        loyaltyPointsEarned: 0,
        promotionsApplied: [],
        internalNotes: [],
        canRepeat: false,
        fulfilmentType: 'STORE_COLLECTION',
      },
    }))

    const user = userEvent.setup()
    await selectFixedServiceAndContinue(user)
    await user.click(screen.getByRole('button', { name: /pickup & collect in store/i }))
    await fillCollectionDetails(user)
    await user.click(screen.getByRole('button', { name: /continue to review/i }))
    await waitFor(() => screen.getByText('Review your order'))
    await user.click(screen.getByRole('button', { name: 'Confirm Booking' }))

    await screen.findByText('Your booking is confirmed.', undefined, { timeout: 4000 })
    expect(screen.getByText('#LD90210')).toBeInTheDocument()
    expect(screen.queryByText(`#${backendUuid}`)).not.toBeInTheDocument()
  })
})

describe('CustomerBookingPage — pickup/delivery window scheduling (date picker, SAST, 24h production gap)', () => {
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

  it('replaces the old generated-button grid with a date picker offering only the 08:00–12:00 / 13:00–17:00 SAST slots', async () => {
    const user = userEvent.setup()
    await selectFixedServiceAndContinue(user)
    await selectAddresses(user)

    const pickupWindowSection = screen.getByText('Pickup window').closest('.rounded-panel')! as HTMLElement
    expect(within(pickupWindowSection).getByLabelText('Pickup date')).toHaveAttribute('type', 'date')

    // No slot buttons before a date is chosen.
    expect(within(pickupWindowSection).queryAllByRole('button')).toHaveLength(0)

    setDateInput(pickupWindowSection, 'Pickup date', minBookablePickupDate())
    const slotButtons = within(pickupWindowSection).getAllByRole('button')
    expect(slotButtons.map((button) => button.textContent)).toEqual(['08:00 - 12:00', '13:00 - 17:00'])
  })

  it("the pickup date picker's min never allows today — only tomorrow (SAST) or later", async () => {
    const user = userEvent.setup()
    await selectFixedServiceAndContinue(user)
    await selectAddresses(user)

    const pickupWindowSection = screen.getByText('Pickup window').closest('.rounded-panel')! as HTMLElement
    expect(within(pickupWindowSection).getByLabelText('Pickup date')).toHaveAttribute('min', minBookablePickupDate())
  })

  it('disables a delivery slot that is chronologically before or equal to the selected pickup slot', async () => {
    const user = userEvent.setup()
    await selectFixedServiceAndContinue(user)
    await selectAddresses(user)

    const pickupDate = minBookablePickupDate()
    const pickupWindowSection = screen.getByText('Pickup window').closest('.rounded-panel')! as HTMLElement
    setDateInput(pickupWindowSection, 'Pickup date', pickupDate)
    const pickupWindowButtons = within(pickupWindowSection).getAllByRole('button')
    await user.click(pickupWindowButtons[0]!) // 08:00 - 12:00

    const deliveryWindowSection = screen.getByText('Delivery window').closest('.rounded-panel')! as HTMLElement
    // Same-day delivery, same-day as pickup: both slots must be disabled —
    // same-slot is chronologically invalid, and even the later same-day slot
    // is far short of the mandatory 24h production gap.
    setDateInput(deliveryWindowSection, 'Delivery date', pickupDate)
    const deliveryButtons = within(deliveryWindowSection).getAllByRole('button')
    for (const button of deliveryButtons) {
      expect(button).toBeDisabled()
    }
    expect(screen.getByText(/no delivery windows are available on this date/i)).toBeInTheDocument()
  })

  it('rejects a delivery slot that falls short of the mandatory 24h production gap even on a later day', async () => {
    const user = userEvent.setup()
    await selectFixedServiceAndContinue(user)
    await selectAddresses(user)

    const pickupDate = minBookablePickupDate()
    const pickupWindowLabel = getWindowSlotsForDate(pickupDate)[0]! // 08:00-12:00, ends 12:00
    const pickupWindowSection = screen.getByText('Pickup window').closest('.rounded-panel')! as HTMLElement
    setDateInput(pickupWindowSection, 'Pickup date', pickupDate)
    await user.click(within(pickupWindowSection).getAllByRole('button')[0]!)

    // Pickup ends 12:00; +24h => next day 12:00. The very next day's morning
    // slot (08:00-12:00) starts BEFORE that threshold, so it must stay
    // disabled even though it is chronologically after pickup.
    const nextDay = new Date(`${pickupDate}T00:00:00Z`)
    nextDay.setUTCDate(nextDay.getUTCDate() + 1)
    const nextDayIso = nextDay.toISOString().slice(0, 10)
    const nextDayMorningWindow = getWindowSlotsForDate(nextDayIso)[0]!
    expect(evaluateDeliverySchedule(pickupWindowLabel, nextDayMorningWindow).feasible).toBe(false)

    const deliveryWindowSection = screen.getByText('Delivery window').closest('.rounded-panel')! as HTMLElement
    setDateInput(deliveryWindowSection, 'Delivery date', nextDayIso)
    const morningButton = within(deliveryWindowSection)
      .getAllByRole('button')
      .find((button) => button.textContent === '08:00 - 12:00')!
    expect(morningButton).toBeDisabled()
  })

  it('allows a delivery slot that clears the 24h production gap and proceeds to Review', async () => {
    const user = userEvent.setup()
    await selectFixedServiceAndContinue(user)
    await selectAddresses(user)
    await fillCollectionDetails(user)

    await user.click(screen.getByRole('button', { name: /continue to review/i }))
    await waitFor(() => screen.getByText('Review your order'))
  })

  it('clears an existing delivery selection when the pickup window changes and it becomes infeasible', async () => {
    const user = userEvent.setup()
    await selectFixedServiceAndContinue(user)
    await selectAddresses(user)

    const pickupDate = minBookablePickupDate()
    const pickupWindowSection = screen.getByText('Pickup window').closest('.rounded-panel')! as HTMLElement
    setDateInput(pickupWindowSection, 'Pickup date', pickupDate)
    const pickupWindowLabel = getWindowSlotsForDate(pickupDate)[0]!
    await user.click(within(pickupWindowSection).getAllByRole('button')[0]!) // 08:00 - 12:00

    const deliveryWindowLabel = findFeasibleDeliveryWindow(pickupWindowLabel)
    const [deliveryDate, deliveryTime] = deliveryWindowLabel.split('|').map((part) => part.trim())
    const deliveryWindowSection = screen.getByText('Delivery window').closest('.rounded-panel')! as HTMLElement
    setDateInput(deliveryWindowSection, 'Delivery date', deliveryDate!)
    const deliveryButton = within(deliveryWindowSection)
      .getAllByRole('button')
      .find((button) => button.textContent === deliveryTime)!
    await user.click(deliveryButton)
    expect(deliveryButton).toHaveClass('border-load-500')

    // Now move pickup to the later same-day slot — the previously chosen
    // delivery selection may no longer clear the 24h gap and must be cleared.
    await user.click(within(pickupWindowSection).getAllByRole('button')[1]!) // 13:00 - 17:00

    expect(screen.queryByText(deliveryTime!, { selector: 'p.border-load-500 *' })).not.toBeInTheDocument()
    expect(deliveryButton).not.toHaveClass('border-load-500')
  })

  it('blocks Continue to Review with a clear reason when no feasible delivery window has been selected', async () => {
    const user = userEvent.setup()
    await selectFixedServiceAndContinue(user)
    await selectAddresses(user)

    const pickupWindowSection = screen.getByText('Pickup window').closest('.rounded-panel')! as HTMLElement
    setDateInput(pickupWindowSection, 'Pickup date', minBookablePickupDate())
    await user.click(within(pickupWindowSection).getAllByRole('button')[0]!)

    await user.click(screen.getByRole('button', { name: /continue to review/i }))

    expect(await screen.findByText('Please select a delivery window.')).toBeInTheDocument()
    expect(screen.queryByText('Review your order')).not.toBeInTheDocument()
  })

  it('STORE_COLLECTION does not require or render a delivery window', async () => {
    const user = userEvent.setup()
    await selectFixedServiceAndContinue(user)
    await user.click(screen.getByRole('button', { name: /pickup & collect in store/i }))
    await selectAddresses(user)

    const pickupWindowSection = screen.getByText('Pickup window').closest('.rounded-panel')! as HTMLElement
    setDateInput(pickupWindowSection, 'Pickup date', minBookablePickupDate())
    await user.click(within(pickupWindowSection).getAllByRole('button')[0]!)

    expect(screen.queryByText('Delivery window')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /continue to review/i }))
    await waitFor(() => screen.getByText('Review your order'))
  })
})

describe('CustomerBookingPage — regression: persisted multi-address selection', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(mockCustomerProfile))
  })

  it('offers every persisted backend address (not just one) as a selectable pickup option', async () => {
    const user = userEvent.setup()
    await selectFixedServiceAndContinue(user)

    const pickupSection = screen.getByText('Pickup address').closest('.rounded-panel')! as HTMLElement
    for (const address of mockCustomerProfile.addresses) {
      expect(within(pickupSection).getByText(address.label)).toBeInTheDocument()
    }
  })

  it('"Add address" persists a new address via the backend-backed service and makes it selectable', async () => {
    const user = userEvent.setup()
    const createAddressSpy = vi.spyOn(apiAddressService, 'createAddress').mockResolvedValue({
      id: 'address-branch',
      label: 'Branch Office',
      line1: '42 Main Road',
      suburb: 'Sandton',
      city: 'Johannesburg',
      province: 'Gauteng',
      postalCode: '2196',
      isDefault: false,
    })
    await selectFixedServiceAndContinue(user)

    await user.click(screen.getByRole('button', { name: 'Add address' }))
    await user.click(screen.getByRole('button', { name: 'Custom' }))
    await user.type(await screen.findByLabelText('Custom label'), 'Branch Office')
    const streetInput = screen.getByLabelText('Street address')
    await user.clear(streetInput)
    await user.type(streetInput, '42 Main Road')
    const suburbInput = screen.getByLabelText('Suburb')
    await user.clear(suburbInput)
    await user.type(suburbInput, 'Sandton')
    const cityInput = screen.getByLabelText('City / Town')
    await user.clear(cityInput)
    await user.type(cityInput, 'Johannesburg')
    const postalInput = screen.getByLabelText('Postal code')
    await user.clear(postalInput)
    await user.type(postalInput, '2196')
    await user.click(screen.getByRole('button', { name: 'Save address' }))

    expect(createAddressSpy).toHaveBeenCalledWith(
      expect.objectContaining({ label: 'Branch Office', line1: '42 Main Road' }),
      false,
    )
    const pickupSection = screen.getByText('Pickup address').closest('.rounded-panel')! as HTMLElement
    expect(await within(pickupSection).findByText('Branch Office')).toBeInTheDocument()
    createAddressSpy.mockRestore()
  })
})

describe('CustomerBookingPage — regression: duplicate address protection', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(mockCustomerProfile))
  })

  it('"Add address" reuses the existing address instead of creating a duplicate row when it matches (ignoring case/whitespace/label)', async () => {
    const user = userEvent.setup()
    const createAddressSpy = vi.spyOn(apiAddressService, 'createAddress')
    const selectAddressSpy = vi.spyOn(apiAddressService, 'selectAddress').mockResolvedValue({
      ...mockCustomerProfile.addresses[1],
      lastUsedAt: new Date().toISOString(),
    })
    await selectFixedServiceAndContinue(user)

    await user.click(screen.getByRole('button', { name: 'Add address' }))
    await user.click(screen.getByRole('button', { name: 'Custom' }))
    // Same physical address as the existing "Office" (177 Oxford Road, Rosebank, Johannesburg, 2196),
    // just a different label, different case and extra whitespace.
    await user.type(await screen.findByLabelText('Custom label'), 'My Work Address')
    const streetInput = screen.getByLabelText('Street address')
    await user.clear(streetInput)
    await user.type(streetInput, '  177 OXFORD ROAD  ')
    const suburbInput = screen.getByLabelText('Suburb')
    await user.clear(suburbInput)
    await user.type(suburbInput, ' rosebank ')
    const cityInput = screen.getByLabelText('City / Town')
    await user.clear(cityInput)
    await user.type(cityInput, ' JOHANNESBURG ')
    const postalInput = screen.getByLabelText('Postal code')
    await user.clear(postalInput)
    await user.type(postalInput, '2196')
    await user.click(screen.getByRole('button', { name: 'Save address' }))

    await waitFor(() => expect(selectAddressSpy).toHaveBeenCalledWith(mockCustomerProfile.addresses[1].id, undefined))
    expect(createAddressSpy).not.toHaveBeenCalled()

    // Still exactly the original two addresses — no new "My Work Address" row, and the original label is untouched.
    const pickupSection = screen.getByText('Pickup address').closest('.rounded-panel')! as HTMLElement
    expect(within(pickupSection).queryByText('My Work Address')).not.toBeInTheDocument()
    expect(within(pickupSection).getAllByRole('button', { name: /Home|Office/ })).toHaveLength(2)

    createAddressSpy.mockRestore()
    selectAddressSpy.mockRestore()
  })
})

describe('CustomerBookingPage — regression: recency-based address ordering', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(mockCustomerProfile))
  })

  it('selecting an address bumps it to the front of the list (most recently used first)', async () => {
    const user = userEvent.setup()
    const selectAddressSpy = vi.spyOn(apiAddressService, 'selectAddress').mockResolvedValue({
      ...mockCustomerProfile.addresses[1],
      lastUsedAt: new Date().toISOString(),
    })
    await selectFixedServiceAndContinue(user)

    const pickupSection = () => screen.getByText('Pickup address').closest('.rounded-panel')! as HTMLElement
    const addressButtonLabels = () =>
      within(pickupSection())
        .getAllByRole('button')
        .map((button) => button.textContent ?? '')
        .filter((text) => text.includes('Home') || text.includes('Office'))

    // "Home" (addr-sandton-1) is first by default (array order, no usage recorded yet).
    expect(addressButtonLabels()[0]).toContain('Home')

    // Select "Office" (addr-rosebank-2) — it should now sort to the front.
    await user.click(within(pickupSection()).getByText('Office'))

    await waitFor(() => expect(selectAddressSpy).toHaveBeenCalledWith(mockCustomerProfile.addresses[1].id, undefined))
    await waitFor(() => expect(addressButtonLabels()[0]).toContain('Office'))

    selectAddressSpy.mockRestore()
  })
})

describe('CustomerBookingPage — regression: compact address picker beyond 3 saved addresses', () => {
  const manyAddressesProfile = {
    ...mockCustomerProfile,
    addresses: [
      mockCustomerProfile.addresses[0],
      mockCustomerProfile.addresses[1],
      { id: 'addr-extra-3', label: 'Gym', line1: '5 Fitness Ave', suburb: 'Bryanston', city: 'Sandton', province: 'Gauteng', postalCode: '2021' },
      { id: 'addr-extra-4', label: 'Parents', line1: '9 Family Road', suburb: 'Fourways', city: 'Sandton', province: 'Gauteng', postalCode: '2055' },
    ],
  }

  beforeEach(() => {
    window.localStorage.clear()
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(manyAddressesProfile))
  })

  it('shows only the 3 most recently used addresses by default, with a "View all" control to reveal the rest', async () => {
    const user = userEvent.setup()
    await selectFixedServiceAndContinue(user)

    const pickupSection = screen.getByText('Pickup address').closest('.rounded-panel')! as HTMLElement
    expect(within(pickupSection).getByText('Home')).toBeInTheDocument()
    expect(within(pickupSection).getByText('Office')).toBeInTheDocument()
    expect(within(pickupSection).getByText('Gym')).toBeInTheDocument()
    expect(within(pickupSection).queryByText('Parents')).not.toBeInTheDocument()

    const viewAllButton = within(pickupSection).getByRole('button', { name: 'View all addresses (4)' })
    await user.click(viewAllButton)

    expect(within(pickupSection).getByText('Parents')).toBeInTheDocument()
    expect(within(pickupSection).getByRole('button', { name: 'Show fewer addresses' })).toBeInTheDocument()
  })
})

describe('CustomerBookingPage — regression: pre-confirmation basket editing', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(mockCustomerProfile))
  })

  it('supports quantity +/- and explicit remove directly from the Collection & Delivery basket editor', async () => {
    const user = userEvent.setup()
    await selectFixedServiceAndContinue(user) // Shirt / Blouse (FIXED_SERVICE) × 1

    const basketSection = screen.getByText('Your basket').closest('.rounded-panel')! as HTMLElement
    expect(within(basketSection).getByTestId('basket-quantity-dc-shirt-blouse')).toHaveTextContent('1')

    await user.click(within(basketSection).getByRole('button', { name: /increase shirt \/ blouse/i }))
    expect(within(basketSection).getByTestId('basket-quantity-dc-shirt-blouse')).toHaveTextContent('2')

    await user.click(within(basketSection).getByRole('button', { name: /decrease shirt \/ blouse/i }))
    expect(within(basketSection).getByTestId('basket-quantity-dc-shirt-blouse')).toHaveTextContent('1')

    await user.click(within(basketSection).getByRole('button', { name: /remove shirt \/ blouse from basket/i }))
    expect(within(basketSection).queryByTestId('basket-quantity-dc-shirt-blouse')).not.toBeInTheDocument()
    expect(within(basketSection).getByTestId('basket-empty-state')).toBeInTheDocument()
  })

  it('supports Add/Remove for weight- and assessment-priced items from the basket editor (never a fabricated quantity)', async () => {
    const user = userEvent.setup()
    renderApp('/customer/services/everyday')
    const washCard = (await screen.findByText('Wash + Dry + Fold')).closest('article')!
    await user.click(within(washCard).getByRole('button', { name: 'Add service' })) // Wash + Dry + Fold, PER_KILOGRAM
    await user.click(await screen.findByRole('link', { name: /continue to collection & delivery/i }))
    await waitFor(() => screen.getByText('Pickup address'))

    const basketSection = screen.getByText('Your basket').closest('.rounded-panel')! as HTMLElement
    expect(within(basketSection).getByText('Wash + Dry + Fold')).toBeInTheDocument()
    expect(within(basketSection).queryByRole('button', { name: /increase wash/i })).not.toBeInTheDocument()

    await user.click(within(basketSection).getByRole('button', { name: /remove wash \+ dry \+ fold from basket/i }))
    expect(within(basketSection).queryByText('Wash + Dry + Fold')).not.toBeInTheDocument()
    expect(within(basketSection).getByTestId('basket-empty-state')).toBeInTheDocument()
  })

  it('recalculates the live estimate immediately after a basket quantity edit', async () => {
    const user = userEvent.setup()
    await selectFixedServiceAndContinue(user)

    const summaryAside = screen.getByText('Estimate').closest('aside')! as HTMLElement
    const estimateBefore = await waitFor(() => {
      const heading = within(summaryAside).getByRole('heading', { level: 2 })
      expect(heading.textContent).not.toBe('Select services')
      return heading.textContent
    })

    const basketSection = screen.getByText('Your basket').closest('.rounded-panel')! as HTMLElement
    await user.click(within(basketSection).getByRole('button', { name: /increase shirt \/ blouse/i }))

    await waitFor(() => {
      const heading = within(summaryAside).getByRole('heading', { level: 2 })
      expect(heading.textContent).not.toBe(estimateBefore)
    })
  })

  it('disables Continue to Review and shows an Add items CTA when the basket becomes empty on Collection & Delivery', async () => {
    const user = userEvent.setup()
    await selectFixedServiceAndContinue(user)

    const basketSection = screen.getByText('Your basket').closest('.rounded-panel')! as HTMLElement
    await user.click(within(basketSection).getByRole('button', { name: /remove shirt \/ blouse from basket/i }))

    expect(screen.getByRole('button', { name: /continue to review/i })).toBeDisabled()
    expect(within(within(basketSection).getByTestId('basket-empty-state')).getByRole('link', { name: 'Add items' })).toBeInTheDocument()
  })

  it('Add items → category flow → View order preserves the entire booking draft (basket, address, fulfilment, pickup window)', async () => {
    const user = userEvent.setup()
    await selectFixedServiceAndContinue(user)
    await user.click(screen.getByRole('button', { name: /pickup & collect in store/i }))
    await fillCollectionDetails(user)

    const basketSection = screen.getByText('Your basket').closest('.rounded-panel')! as HTMLElement
    await user.click(within(basketSection).getByRole('link', { name: 'Add items' }))

    await screen.findByRole('heading', { name: 'Services' })
    await user.click(await screen.findByRole('link', { name: /browse sneaker care/i }))
    const sneakerCard = (await screen.findByText('Fresh Clean')).closest('article')!
    await user.click(within(sneakerCard).getByRole('button', { name: /increase fresh clean/i }))

    await user.click(await screen.findByRole('link', { name: /continue to collection & delivery/i }))
    await screen.findByText('Pickup address')

    // Fulfilment, address and window selections survived the round trip.
    expect(screen.getByRole('button', { name: /pickup & collect in store/i })).toHaveAttribute('aria-pressed', 'true')

    // Basket now contains the original item plus the newly-added one.
    const basketSectionAfter = screen.getByText('Your basket').closest('.rounded-panel')! as HTMLElement
    expect(within(basketSectionAfter).getByText(/shirt \/ blouse/i)).toBeInTheDocument()
    expect(within(basketSectionAfter).getByText(/fresh clean/i)).toBeInTheDocument()

    // Continuing to Review requires no re-entry of pickup details, proving they were preserved.
    await user.click(screen.getByRole('button', { name: /continue to review/i }))
    await waitFor(() => screen.getByText('Review your order'))
    expect(screen.queryByText(/please select a pickup/i)).not.toBeInTheDocument()
  })

  it('Review → Edit items → Review preserves every selection and reflects basket edits made along the way', async () => {
    const user = userEvent.setup()
    await selectFixedServiceAndContinue(user)
    await fillCollectionDetails(user)
    await user.click(screen.getByRole('button', { name: /continue to review/i }))
    await waitFor(() => screen.getByText('Review your order'))

    const reviewBasketCard = screen.getByText('Selected services').closest('.rounded-card')! as HTMLElement
    expect(within(reviewBasketCard).getByTestId('basket-quantity-dc-shirt-blouse')).toHaveTextContent('1')

    await user.click(screen.getByRole('link', { name: 'Edit items' }))
    await screen.findByRole('heading', { name: 'Services' })

    await user.click(await screen.findByRole('link', { name: /browse dry cleaning/i }))
    await user.click(await screen.findByRole('button', { name: /increase shirt \/ blouse/i }))

    await user.click(await screen.findByRole('link', { name: /continue to collection & delivery/i }))
    await screen.findByText('Pickup address')
    await user.click(screen.getByRole('button', { name: /continue to review/i }))

    await waitFor(() => screen.getByText('Review your order'))
    const reviewBasketCardAfter = screen.getByText('Selected services').closest('.rounded-card')! as HTMLElement
    expect(within(reviewBasketCardAfter).getByTestId('basket-quantity-dc-shirt-blouse')).toHaveTextContent('2')
    expect(screen.getByRole('button', { name: 'Confirm Booking' })).not.toBeDisabled()
  })

  it('Review shows a clear Edit items action, and an emptied basket disables Confirm Booking with an Add items CTA', async () => {
    const user = userEvent.setup()
    await selectFixedServiceAndContinue(user)
    await fillCollectionDetails(user)
    await user.click(screen.getByRole('button', { name: /continue to review/i }))
    await waitFor(() => screen.getByText('Review your order'))

    expect(screen.getByRole('link', { name: 'Edit items' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirm Booking' })).not.toBeDisabled()

    const reviewBasketCard = screen.getByText('Selected services').closest('.rounded-card')! as HTMLElement
    await user.click(within(reviewBasketCard).getByRole('button', { name: /remove shirt \/ blouse from basket/i }))

    expect(within(reviewBasketCard).getByTestId('basket-empty-state')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirm Booking' })).toBeDisabled()
    expect(within(reviewBasketCard).getByRole('link', { name: 'Add items' })).toBeInTheDocument()
  })
})
