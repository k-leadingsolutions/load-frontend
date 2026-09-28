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

describe('CustomerBookingPage — regression: estimate continuity (never R0.00 when a valid estimate exists)', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(mockCustomerProfile))
  })

  it('shows the honest non-zero estimate (delivery fee) on Review when the only selected service has unknown/weight-based pricing (subtotal is 0)', async () => {
    const user = userEvent.setup()
    renderApp('/customer/services/everyday')

    // "Wash + Dry + Fold" is PER_KILOGRAM — it contributes 0 to `subtotal`
    // (only weight-based/assessment items do), but with the default DELIVERY
    // fulfilment and no free-delivery threshold met, `estimatedTotal` still
    // includes a non-zero delivery fee. The Review estimate must reflect
    // that non-zero total, never fall back to the R0.00 subtotal.
    const card = (await screen.findByText('Wash + Dry + Fold')).closest('article')!
    await user.click(within(card).getByRole('button', { name: 'Add service' }))
    await user.click(await screen.findByRole('link', { name: /continue to collection & delivery/i }))
    await waitFor(() => screen.getByText('Pickup address'))
    await fillCollectionDetails(user)

    await user.click(screen.getByRole('button', { name: /continue to review/i }))
    await waitFor(() => screen.getByText('Review your order'))

    const estimateMatches = await screen.findAllByText(currencyText(45))
    expect(estimateMatches.length).toBeGreaterThan(0)
    expect(screen.queryByText(currencyText(0))).not.toBeInTheDocument()
  })

  it('preserves the same non-zero estimate through to the confirmation screen', async () => {
    const user = userEvent.setup()
    renderApp('/customer/services/everyday')

    const card = (await screen.findByText('Wash + Dry + Fold')).closest('article')!
    await user.click(within(card).getByRole('button', { name: 'Add service' }))
    await user.click(await screen.findByRole('link', { name: /continue to collection & delivery/i }))
    await waitFor(() => screen.getByText('Pickup address'))
    await fillCollectionDetails(user)

    await user.click(screen.getByRole('button', { name: /continue to review/i }))
    await waitFor(() => screen.getByText('Review your order'))
    await user.click(screen.getByRole('button', { name: 'Confirm Booking' }))

    await screen.findByText('Your booking is confirmed.', undefined, { timeout: 4000 })
    expect(screen.getByText(currencyText(45))).toBeInTheDocument()
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
