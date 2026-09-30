import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { RoleLayout } from '@/app/layouts/RoleLayout'
import { CoffeeCartProvider, useCoffeeCart } from '@/features/customer/coffee/CoffeeCartContext'
import { CoffeeActiveBasketBar } from '@/features/customer/coffee/CoffeeActiveBasketBar'
import { appPaths } from '@/app/router/paths'

/**
 * Test-only harness that mimics a Coffee catalogue page: exposes Add/Remove
 * controls wired straight to the real `CoffeeCartContext`, so these tests
 * exercise the actual basket source of truth rather than a mock.
 */
const CoffeeCatalogueHarness = () => {
  const { addItem, lines, removeItem } = useCoffeeCart()

  return (
    <div>
      <h1>Coffee catalogue</h1>
      <button type="button" onClick={() => addItem({ productId: 'latte', name: 'Latte', modifierIds: [], unitPrice: 52 })}>
        Add Latte
      </button>
      {lines.map((line) => (
        <button key={line.id} type="button" onClick={() => removeItem(line.id)}>
          Remove {line.name}
        </button>
      ))}
    </div>
  )
}

const renderApp = (initialEntry = appPaths.customerServices) =>
  render(
    <CoffeeCartProvider>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route
            element={
              <RoleLayout
                roleLabel="Customer"
                greetingMode
                mobileNavLinks={[
                  { to: appPaths.customerHome, label: 'Home', icon: '⌂' },
                  { to: appPaths.customerServices, label: 'New Order', icon: '+', emphasis: true },
                ]}
                basketBar={<CoffeeActiveBasketBar />}
              />
            }
          >
            <Route path={appPaths.customerHome} element={<div>Home page</div>} />
            <Route path={appPaths.customerServices} element={<CoffeeCatalogueHarness />} />
            <Route path={appPaths.customerCoffeeCart} element={<div>Cart page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </CoffeeCartProvider>,
  )

describe('CoffeeActiveBasketBar inside the shared customer shell (RoleLayout)', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('is hidden while the basket is empty, and the bottom navigation remains rendered', () => {
    renderApp()

    expect(screen.queryByRole('link', { name: /view cart/i })).not.toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Customer navigation' })).toBeInTheDocument()
  })

  it('appears with the correct count and total after the first item is added, alongside a still-functional nav', async () => {
    const user = userEvent.setup()
    renderApp()

    await user.click(screen.getByRole('button', { name: 'Add Latte' }))

    const basketLink = await screen.findByRole('link', { name: /view cart: 1 item, R\s?52,00/i })
    expect(basketLink).toBeInTheDocument()

    // Bottom nav is still present and functional (not displaced/hidden by the basket bar).
    const homeLink = screen.getByRole('link', { name: /Home/i })
    expect(homeLink).toBeInTheDocument()
    await user.click(homeLink)
    expect(await screen.findByText('Home page')).toBeInTheDocument()
  })

  it('updates the count/total when a second item is added', async () => {
    const user = userEvent.setup()
    renderApp()

    await user.click(screen.getByRole('button', { name: 'Add Latte' }))
    await user.click(screen.getByRole('button', { name: 'Add Latte' }))

    expect(await screen.findByRole('link', { name: /view cart: 2 items, R\s?104,00/i })).toBeInTheDocument()
  })

  it('navigates to the Coffee cart when the CTA is activated', async () => {
    const user = userEvent.setup()
    renderApp()

    await user.click(screen.getByRole('button', { name: 'Add Latte' }))
    await user.click(await screen.findByRole('link', { name: /view cart/i }))

    expect(await screen.findByText('Cart page')).toBeInTheDocument()
  })

  it('disappears once the final item is removed, returning cleanly to the empty-basket state', async () => {
    const user = userEvent.setup()
    renderApp()

    await user.click(screen.getByRole('button', { name: 'Add Latte' }))
    expect(await screen.findByRole('link', { name: /view cart/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Remove Latte' }))

    expect(screen.queryByRole('link', { name: /view cart/i })).not.toBeInTheDocument()
  })

  it('survives customer route navigation (basket state is not reset by navigating away and back)', async () => {
    const user = userEvent.setup()
    renderApp()

    await user.click(screen.getByRole('button', { name: 'Add Latte' }))
    expect(await screen.findByRole('link', { name: /view cart/i })).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: /Home/i }))
    expect(await screen.findByText('Home page')).toBeInTheDocument()
    // Basket bar (backed by the same CoffeeCartContext) remains visible on another route.
    expect(screen.getByRole('link', { name: /view cart: 1 item/i })).toBeInTheDocument()
  })

  it('is suppressed on the Coffee cart route itself (no redundant self-referential CTA)', async () => {
    const user = userEvent.setup()
    renderApp()

    await user.click(screen.getByRole('button', { name: 'Add Latte' }))
    await user.click(await screen.findByRole('link', { name: /view cart/i }))

    expect(await screen.findByText('Cart page')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /view cart/i })).not.toBeInTheDocument()
  })
})
