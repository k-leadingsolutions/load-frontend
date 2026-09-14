import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, type ReactNode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/app/providers/AuthProvider'
import { RequireCustomerAuth } from '@/app/router/RequireCustomerAuth'
import { appPaths } from '@/app/router/paths'
import { CoffeeCartPage } from '@/features/customer/coffee/CoffeeCartPage'
import { CoffeeCartProvider, useCoffeeCart } from '@/features/customer/coffee/CoffeeCartContext'
import { mockCustomerProfile } from '@/services/mock/data'
import { AUTH_STORAGE_KEY } from '@/services/mock/sessionStore'
import { formatCurrency } from '@/utils/format'

/** DOM text is whitespace-normalized (nbsp → space) by Testing Library queries. */
const priceText = (amount: number) => formatCurrency(amount).replace(/\u00a0/g, ' ')

/** Seeds the cart via the real provider so CoffeeCartPage exercises actual state, not mocks. */
const CartSeeder = ({ children }: { children: ReactNode }) => {
  const { addItem } = useCoffeeCart()
  useEffect(() => {
    addItem({
      productId: 'latte',
      name: 'Latte',
      size: 'REGULAR',
      modifierIds: [],
      unitPrice: 40,
      quantity: 2,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return <>{children}</>
}

const renderPage = ({ seeded }: { seeded: boolean }) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AuthProvider>
        <CoffeeCartProvider>
          <MemoryRouter initialEntries={[appPaths.customerCoffeeCart]}>
            <Routes>
              <Route element={<RequireCustomerAuth />}>
                <Route
                  path={appPaths.customerCoffeeCart}
                  element={seeded ? <CartSeeder><CoffeeCartPage /></CartSeeder> : <CoffeeCartPage />}
                />
              </Route>
            </Routes>
          </MemoryRouter>
        </CoffeeCartProvider>
      </AuthProvider>
    </QueryClientProvider>,
  )

describe('CoffeeCartPage', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(mockCustomerProfile))
  })

  it('shows an empty state when the cart has no items', async () => {
    renderPage({ seeded: false })
    expect(await screen.findByText('Your coffee cart is empty')).toBeInTheDocument()
  })

  it('renders seeded cart lines with quantity controls and subtotal', async () => {
    renderPage({ seeded: true })

    expect(await screen.findByText('Latte')).toBeInTheDocument()
    expect(screen.getByText(priceText(80))).toBeInTheDocument() // subtotal for qty 2 @ R40
  })

  it('increments quantity and updates the subtotal', async () => {
    const user = userEvent.setup()
    renderPage({ seeded: true })

    await screen.findByText('Latte')
    await user.click(screen.getByRole('button', { name: /increase latte quantity/i }))

    expect(await screen.findByText(priceText(120))).toBeInTheDocument() // 3 x R40
  })

  it('removes a line item entirely', async () => {
    const user = userEvent.setup()
    renderPage({ seeded: true })

    await screen.findByText('Latte')
    await user.click(screen.getByRole('button', { name: 'Remove' }))

    expect(await screen.findByText('Your coffee cart is empty')).toBeInTheDocument()
  })

  it('places an order, clears the cart and shows confirmation', async () => {
    const user = userEvent.setup()
    renderPage({ seeded: true })

    await screen.findByText('Latte')
    await user.click(screen.getByRole('button', { name: 'Place order' }))

    await waitFor(() => {
      expect(screen.getByText('Order confirmed')).toBeInTheDocument()
    })
    expect(screen.getByText(new RegExp(priceText(80)))).toBeInTheDocument()
  })
})
