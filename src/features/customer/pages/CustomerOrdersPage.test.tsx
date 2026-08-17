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

  it('repeats an existing order', async () => {
    const user = userEvent.setup()
    renderPage()

    expect(await screen.findByText('Live order tracking')).toBeInTheDocument()

    await user.click(screen.getAllByRole('button', { name: 'Repeat order' })[0]!)

    await waitFor(() => {
      expect(screen.getByText('Repeat order created')).toBeInTheDocument()
    })
  })
})
