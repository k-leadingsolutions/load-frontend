import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/app/providers/AuthProvider'
import { RequireCustomerAuth } from '@/app/router/RequireCustomerAuth'
import { appPaths } from '@/app/router/paths'
import { CustomerOrdersPage } from '@/features/customer/pages/CustomerOrdersPage'
import { mockCustomerProfile } from '@/services/mock/data'
import { AUTH_STORAGE_KEY } from '@/services/mock/sessionStore'

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
