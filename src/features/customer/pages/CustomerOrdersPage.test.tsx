import { render, screen, waitFor, within } from '@testing-library/react'
import { vi } from 'vitest'

vi.mock('@/services/api/customerOrderService', async () => {
  const { mockCustomerOrderService } = await import('@/services/mock')
  return { apiCustomerOrderService: mockCustomerOrderService }
})
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/app/providers/AuthProvider'
import { RequireCustomerAuth } from '@/app/router/RequireCustomerAuth'
import { appPaths } from '@/app/router/paths'
import { CustomerOrdersPage } from '@/features/customer/pages/CustomerOrdersPage'
import { mockCustomerProfile, mockOrders } from '@/services/mock/data'
import { AUTH_STORAGE_KEY } from '@/services/mock/sessionStore'
import { ORDER_STORAGE_KEY } from '@/services/mock/orderStore'
import { getFriendlyOrderStatus } from '@/domain/orderStatus'
import type { LaundryOrder } from '@/domain/models/order'

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AuthProvider>
        <MemoryRouter initialEntries={[appPaths.customerOrders]}>
          <Routes>
            <Route element={<RequireCustomerAuth />}>
              <Route path={appPaths.customerOrders} element={<CustomerOrdersPage />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  )

const setStoredOrders = (orders: LaundryOrder[]) => {
  window.localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(orders))
}

/** Builds a valid LaundryOrder fixture from the base mock order, overriding only what a test cares about. */
const buildOrder = (overrides: Partial<LaundryOrder> & Pick<LaundryOrder, 'id' | 'status'>): LaundryOrder => ({
  ...mockOrders[0]!,
  orderNumber: overrides.id,
  friendlyStatus: getFriendlyOrderStatus(overrides.status),
  ...overrides,
})

/** Returns a copy of the order with no delivery leg — e.g. a booking still awaiting a delivery window. */
const withoutDeliveryWindow = (order: LaundryOrder): LaundryOrder => {
  const { deliveryWindow: _deliveryWindow, ...rest } = order
  return rest
}

/** Returns the row containing the timeline's "current step" dot, so its label text can be asserted in isolation. */
const getCurrentTimelineRowText = () => {
  const currentDot = screen.getByLabelText('current step')
  const row = currentDot.parentElement?.parentElement
  return row?.textContent ?? ''
}

describe('CustomerOrdersPage', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(mockCustomerProfile))
  })

  it('renders the live order tracking and order history sections', async () => {
    renderPage()
    expect(await screen.findByText('Live order tracking')).toBeInTheDocument()
    expect(screen.getByText('Order history and quick reorder')).toBeInTheDocument()
  })

  it('shows the stage progress bar for the active order', async () => {
    renderPage()
    await screen.findByText('Live order tracking')
    // The active order (LD10235) is in WASHING → Production stage
    expect(screen.getByLabelText('Order stage progress')).toBeInTheDocument()
    expect(screen.getAllByText('Production').length).toBeGreaterThan(0)
  })

  it('shows a payment status badge on the active order card', async () => {
    renderPage()
    await screen.findByText('Live order tracking')
    // Active order has paymentStatus: 'CONFIRMED' → badge text 'Paid'
    expect(screen.getAllByText('Paid').length).toBeGreaterThan(0)
  })

  it('shows stage badges on history order cards', async () => {
    renderPage()
    await screen.findByText('Order history and quick reorder')
    // LD10234 is DELIVERED → Delivery stage badge
    expect(screen.getAllByText('Delivery').length).toBeGreaterThan(0)
  })

  it('repeats an existing order', async () => {
    const user = userEvent.setup()
    renderPage()

    expect(await screen.findByText('Live order tracking'))

    await user.click(screen.getAllByRole('button', { name: 'Repeat order' })[0]!)

    await waitFor(() => {
      expect(screen.getByText('Repeat order created')).toBeInTheDocument()
    })
  })
})

// ── Multi-order live tracking regression tests ────────────────────────────────

describe('CustomerOrdersPage — multi-order Live order tracking selector', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(mockCustomerProfile))
  })

  const productionOrder = buildOrder({
    id: 'LD20001',
    status: 'WASHING',
    pickupWindow: { date: '2026-09-01', windowLabel: 'Mon, 09:00 - 11:00' },
    deliveryWindow: { date: '2026-09-01', windowLabel: 'Mon, 14:00 - 16:00' },
  })
  const deliveryOrder = buildOrder({
    id: 'LD20002',
    status: 'READY_FOR_DISPATCH',
    pickupWindow: { date: '2026-09-02', windowLabel: 'Tue, 09:00 - 11:00' },
    deliveryWindow: { date: '2026-09-02', windowLabel: 'Tue, 15:00 - 17:00' },
  })
  const bookingOrder = withoutDeliveryWindow(buildOrder({
    id: 'LD20003',
    status: 'BOOKING_RECEIVED',
    pickupWindow: { date: '2026-09-03', windowLabel: 'Wed, 10:00 - 12:00' },
  }))
  const completedOrder = buildOrder({
    id: 'LD20004',
    status: 'COMPLETED',
    pickupWindow: { date: '2026-08-20', windowLabel: 'Thu, 09:00 - 11:00' },
    deliveryWindow: { date: '2026-08-20', windowLabel: 'Thu, 14:00 - 16:00' },
  })
  const cancelledOrder = withoutDeliveryWindow(buildOrder({
    id: 'LD20005',
    status: 'CANCELLED',
    pickupWindow: { date: '2026-08-19', windowLabel: 'Wed, 09:00 - 11:00' },
  }))

  it('lists every active order as a selectable tab and defaults to the first active order', async () => {
    setStoredOrders([productionOrder, deliveryOrder, bookingOrder])
    renderPage()

    await screen.findByText('Live order tracking')

    const tablist = screen.getByRole('tablist', { name: 'Your active orders' })
    const tabs = within(tablist).getAllByRole('tab')
    expect(tabs).toHaveLength(3)
    expect(within(tablist).getByText('#LD20001')).toBeInTheDocument()
    expect(within(tablist).getByText('#LD20002')).toBeInTheDocument()
    expect(within(tablist).getByText('#LD20003')).toBeInTheDocument()

    // Default selection: first active order in stable API order (Production/LD20001).
    const defaultTab = screen.getByRole('tab', { name: /LD20001/ })
    expect(defaultTab).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: /LD20002/ })).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByRole('tab', { name: /LD20003/ })).toHaveAttribute('aria-selected', 'false')

    const panel = screen.getByRole('tabpanel')
    expect(within(panel).getByText('Order #LD20001')).toBeInTheDocument()
    expect(within(panel).getByText('Mon, 14:00 - 16:00', { exact: false })).toBeInTheDocument()
  })

  it('switches ALL tracking content when a different order tab is selected (data isolation)', async () => {
    const user = userEvent.setup()
    setStoredOrders([productionOrder, deliveryOrder, bookingOrder])
    renderPage()

    await screen.findByText('Live order tracking')

    // Sanity: default panel reflects the production order's own data.
    expect(screen.getByRole('tabpanel').textContent).toContain('LD20001')
    expect(getCurrentTimelineRowText()).toContain('Washing')

    await user.click(screen.getByRole('tab', { name: /LD20002/ }))

    expect(screen.getByRole('tab', { name: /LD20002/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: /LD20001/ })).toHaveAttribute('aria-selected', 'false')

    const panelAfterFirstClick = screen.getByRole('tabpanel')
    // orderNumber, status, delivery window all now belong to LD20002 — not LD20001.
    expect(within(panelAfterFirstClick).getByText('Order #LD20002')).toBeInTheDocument()
    expect(within(panelAfterFirstClick).queryByText('Order #LD20001')).not.toBeInTheDocument()
    expect(within(panelAfterFirstClick).getByText('Tue, 15:00 - 17:00', { exact: false })).toBeInTheDocument()
    expect(within(panelAfterFirstClick).queryByText('Mon, 14:00 - 16:00', { exact: false })).not.toBeInTheDocument()
    // Timeline (progress/stage) must also have switched, not just the heading.
    expect(getCurrentTimelineRowText()).toContain('Ready for delivery')

    await user.click(screen.getByRole('tab', { name: /LD20003/ }))

    expect(screen.getByRole('tab', { name: /LD20003/ })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: /LD20002/ })).toHaveAttribute('aria-selected', 'false')

    const panelAfterSecondClick = screen.getByRole('tabpanel')
    expect(within(panelAfterSecondClick).getByText('Order #LD20003')).toBeInTheDocument()
    expect(within(panelAfterSecondClick).getAllByText('Order confirmed').length).toBeGreaterThan(0)
    expect(within(panelAfterSecondClick).getByText('Delivery: To be confirmed')).toBeInTheDocument()
    expect(getCurrentTimelineRowText()).toContain('Order confirmed')
  })

  it('works normally with exactly one active order and does not render a redundant selector', async () => {
    setStoredOrders([productionOrder, completedOrder])
    renderPage()

    await screen.findByText('Live order tracking')

    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
    const panel = screen.getByRole('tabpanel')
    expect(within(panel).getByText('Order #LD20001')).toBeInTheDocument()
  })

  it('shows an appropriate empty state when there are no active orders', async () => {
    setStoredOrders([completedOrder, cancelledOrder])
    renderPage()

    await screen.findByText('Live order tracking')

    expect(screen.getByText('No active order')).toBeInTheDocument()
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
    expect(screen.queryByRole('tabpanel')).not.toBeInTheDocument()
    // History remains available.
    expect(screen.getByText('#LD20004')).toBeInTheDocument()
  })

  it('excludes completed/cancelled orders from the live tracking selector but keeps them in history with Repeat order', async () => {
    setStoredOrders([productionOrder, deliveryOrder, completedOrder, cancelledOrder])
    renderPage()

    await screen.findByText('Live order tracking')

    const tablist = screen.getByRole('tablist')
    expect(within(tablist).queryByText('#LD20004')).not.toBeInTheDocument()
    expect(within(tablist).queryByText('#LD20005')).not.toBeInTheDocument()

    const historySection = screen.getByText('Order history and quick reorder').closest('section')!
    expect(within(historySection).getByText('#LD20004')).toBeInTheDocument()
    expect(within(historySection).getByText('#LD20005')).toBeInTheDocument()

    // Completed order card retains Repeat order and has no Track order action.
    const completedCard = within(historySection).getByText('#LD20004').closest('[class*="rounded"]') as HTMLElement
    expect(within(completedCard).getByRole('button', { name: 'Repeat order' })).toBeInTheDocument()
    expect(within(completedCard).queryByRole('button', { name: 'Track order' })).not.toBeInTheDocument()
  })

  it('clicking "Track order" on a history card selects that same order in Live order tracking', async () => {
    const user = userEvent.setup()
    setStoredOrders([productionOrder, deliveryOrder, bookingOrder])
    renderPage()

    await screen.findByText('Live order tracking')

    // Default tracking panel starts on LD20001; use the history card's Track order
    // action for LD20003 (Booking) and confirm the SAME order becomes selected.
    const historySection = screen.getByText('Order history and quick reorder').closest('section')!
    const bookingCard = within(historySection).getByText('#LD20003').closest('[class*="rounded"]') as HTMLElement
    await user.click(within(bookingCard).getByRole('button', { name: 'Track order' }))

    expect(screen.getByRole('tab', { name: /LD20003/ })).toHaveAttribute('aria-selected', 'true')
    const panel = screen.getByRole('tabpanel')
    expect(within(panel).getByText('Order #LD20003')).toBeInTheDocument()
  })
})
