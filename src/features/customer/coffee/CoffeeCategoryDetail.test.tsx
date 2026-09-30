import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { appPaths } from '@/app/router/paths'
import { CustomerServicesPage } from '@/features/customer/pages/CustomerServicesPage'
import { CustomerServiceCategoryPage } from '@/features/customer/pages/CustomerServiceCategoryPage'
import { CoffeeCartProvider } from '@/features/customer/coffee/CoffeeCartContext'
import { CustomerOrderDraftProvider } from '@/features/customer/booking/CustomerOrderDraftContext'
import { formatCurrency } from '@/utils/format'

/** DOM text is whitespace-normalized (nbsp → space) by Testing Library queries. */
const priceText = (amount: number) => formatCurrency(amount).replace(/\u00a0/g, ' ')
/** Build a name-matcher regex tolerant of nbsp vs. regular space in accessible names. */
const pricePattern = (amount: number) => formatCurrency(amount).replace(/\u00a0/g, '\\s+')

const renderServices = (initialEntry: string) =>
  render(
    <CoffeeCartProvider>
      <CustomerOrderDraftProvider>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route path={appPaths.customerServices} element={<CustomerServicesPage />} />
            <Route path={appPaths.customerServiceCategory} element={<CustomerServiceCategoryPage />} />
          </Routes>
        </MemoryRouter>
      </CustomerOrderDraftProvider>
    </CoffeeCartProvider>,
  )

beforeEach(() => {
  window.localStorage.clear()
})

describe('LOAD Coffee category', () => {
  it('appears as a category card on the Services screen', async () => {
    renderServices(appPaths.customerServices)

    expect(await screen.findByRole('link', { name: /browse load coffee/i })).toBeInTheDocument()
    // The pending-menu disclaimer must be gone now that the menu is approved.
    expect(
      screen.queryByText('Coffee ordering will be available once the menu is finalised.'),
    ).not.toBeInTheDocument()
  })

  it('renders a compact catalogue: no permanently-rendered modifier lists', async () => {
    renderServices('/customer/services/coffee')

    expect(await screen.findByRole('heading', { name: 'LOAD Coffee' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Coffee' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Iced Coffee' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Matcha' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Pastries' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Mini Loaded Donuts' })).toBeInTheDocument()

    // The old always-visible modifier checkboxes must be gone from the catalogue view.
    expect(screen.queryByRole('checkbox', { name: /oat milk/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: /decaf/i })).not.toBeInTheDocument()
    expect(screen.queryByText('Extra espresso shot')).not.toBeInTheDocument()

    // Single-size drink shows a compact price, no size rows.
    const espresso = screen.getByRole('article', { name: 'Espresso' })
    expect(within(espresso).queryByText('Regular')).not.toBeInTheDocument()
    expect(within(espresso).getByText(priceText(28))).toBeInTheDocument()

    // REG/LRG drink shows both size price rows and a LOAD Favourite badge, but no modifiers yet.
    const iconicDrink = screen.getByRole('article', { name: /Iced Spanish Latte/ })
    expect(within(iconicDrink).getByText('Regular')).toBeInTheDocument()
    expect(within(iconicDrink).getByText('Large')).toBeInTheDocument()
    expect(within(iconicDrink).getByText(priceText(48))).toBeInTheDocument()
    expect(within(iconicDrink).getByText(priceText(55))).toBeInTheDocument()
    expect(within(iconicDrink).getByText('LOAD Favourite')).toBeInTheDocument()
    expect(within(iconicDrink).getByRole('button', { name: 'Customize & add' })).toBeInTheDocument()

    // Fixed-price food item, no size/modifiers, direct Add.
    const donutPack = screen.getByRole('article', { name: new RegExp(`^12 Loaded Donuts`) })
    expect(within(donutPack).getByText(priceText(259))).toBeInTheDocument()
    expect(within(donutPack).getByRole('button', { name: 'Add' })).toBeInTheDocument()
  })

  it('opens a customisation dialog for a configurable beverage with correct sizes/prices/modifiers', async () => {
    const user = userEvent.setup()
    renderServices('/customer/services/coffee')

    const latteCard = screen.getByRole('article', { name: 'Latte' })
    await user.click(within(latteCard).getByRole('button', { name: 'Customize & add' }))

    const dialog = await screen.findByRole('dialog', { name: 'Latte' })
    expect(within(dialog).getByRole('radio', { name: new RegExp(`Regular.*${pricePattern(40)}`, 's') })).toBeInTheDocument()
    expect(within(dialog).getByRole('radio', { name: new RegExp(`Large.*${pricePattern(46)}`, 's') })).toBeInTheDocument()

    // Applicable Coffee-section modifiers appear.
    expect(within(dialog).getByRole('checkbox', { name: /oat milk/i })).toBeInTheDocument()
    expect(within(dialog).getByRole('checkbox', { name: /decaf/i })).toBeInTheDocument()

    expect(within(dialog).getByText('Total')).toBeInTheDocument()
    expect(within(dialog).getAllByText(priceText(40)).length).toBeGreaterThan(0)
  })

  it('updates the calculated total when selecting size, modifiers and quantity', async () => {
    const user = userEvent.setup()
    renderServices('/customer/services/coffee')

    await user.click(
      within(screen.getByRole('article', { name: 'Latte' })).getByRole('button', { name: 'Customize & add' }),
    )
    const dialog = await screen.findByRole('dialog', { name: 'Latte' })

    await user.click(within(dialog).getByRole('radio', { name: /Large/ }))
    await user.click(within(dialog).getByRole('checkbox', { name: /oat milk/i }))
    // Large (46) + Oat milk (8) = 54
    expect(within(dialog).getByText(priceText(54))).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: /increase latte quantity/i }))
    // Quantity 2 x 54 = 108
    expect(within(dialog).getByText(priceText(108))).toBeInTheDocument()
  })

  it('adds the configured item to the basket and closes the dialog', async () => {
    const user = userEvent.setup()
    renderServices('/customer/services/coffee')

    await user.click(
      within(screen.getByRole('article', { name: 'Cappuccino' })).getByRole('button', { name: 'Customize & add' }),
    )
    const dialog = await screen.findByRole('dialog', { name: 'Cappuccino' })
    await user.click(within(dialog).getByRole('button', { name: 'Add to order' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(await screen.findByRole('status')).toHaveTextContent(`Added Cappuccino — ${priceText(38)}`)
  })

  it('confirms a direct addition with a toast for a product needing no customisation', async () => {
    const user = userEvent.setup()
    renderServices('/customer/services/coffee')

    const donutPack = screen.getByRole('article', { name: new RegExp(`^12 Loaded Donuts`) })
    await user.click(within(donutPack).getByRole('button', { name: 'Add' }))

    expect(await screen.findByRole('status')).toHaveTextContent(`Added 12 Loaded Donuts — ${priceText(259)}`)
  })

  it('closing the customisation dialog without adding does not mutate the basket', async () => {
    const user = userEvent.setup()
    renderServices('/customer/services/coffee')

    await user.click(
      within(screen.getByRole('article', { name: 'Latte' })).getByRole('button', { name: 'Customize & add' }),
    )
    const dialog = await screen.findByRole('dialog', { name: 'Latte' })
    await user.click(within(dialog).getByRole('checkbox', { name: /oat milk/i }))
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByText(/item.*in cart/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('preserves existing basket contents when a different product is customised afterwards', async () => {
    const user = userEvent.setup()
    renderServices('/customer/services/coffee')

    // Add a Cappuccino directly via its own customizer.
    await user.click(
      within(screen.getByRole('article', { name: 'Cappuccino' })).getByRole('button', { name: 'Customize & add' }),
    )
    await user.click(within(await screen.findByRole('dialog', { name: 'Cappuccino' })).getByRole('button', { name: 'Add to order' }))
    expect(await screen.findByText('1 item in cart')).toBeInTheDocument()

    // Open (and cancel) a second product's customizer — basket must remain at 1 item.
    await user.click(
      within(screen.getByRole('article', { name: 'Latte' })).getByRole('button', { name: 'Customize & add' }),
    )
    const latteDialog = await screen.findByRole('dialog', { name: 'Latte' })
    await user.click(within(latteDialog).getByRole('button', { name: 'Cancel' }))

    expect(await screen.findByText('1 item in cart')).toBeInTheDocument()
  })

  describe('modifier applicability by menu section', () => {
    it('does not expose Decaf/Extra espresso shot for a Refresher', async () => {
      const user = userEvent.setup()
      renderServices('/customer/services/coffee')

      const strawberryLemonade = screen.getByRole('article', { name: /Strawberry Lemonade/ })
      await user.click(within(strawberryLemonade).getByRole('button', { name: 'Customize & add' }))

      const dialog = await screen.findByRole('dialog', { name: 'Strawberry Lemonade' })
      expect(within(dialog).queryByRole('checkbox', { name: /decaf/i })).not.toBeInTheDocument()
      expect(within(dialog).queryByRole('checkbox', { name: /extra espresso/i })).not.toBeInTheDocument()
      expect(within(dialog).queryByText('Customise')).not.toBeInTheDocument()
      // Refresher still has a size choice, so the dialog is still used.
      expect(within(dialog).getByRole('radio', { name: /Regular/ })).toBeInTheDocument()
    })

    it('only shows milk/syrup/topping modifiers (no espresso extras) for Matcha', async () => {
      const user = userEvent.setup()
      renderServices('/customer/services/coffee')

      const matcha = screen.getByRole('article', { name: 'Matcha Latte' })
      await user.click(within(matcha).getByRole('button', { name: 'Customize & add' }))

      const dialog = await screen.findByRole('dialog', { name: 'Matcha Latte' })
      expect(within(dialog).getByRole('checkbox', { name: /oat milk/i })).toBeInTheDocument()
      expect(within(dialog).getByRole('checkbox', { name: /vanilla syrup/i })).toBeInTheDocument()
      expect(within(dialog).queryByRole('checkbox', { name: /decaf/i })).not.toBeInTheDocument()
      expect(within(dialog).queryByRole('checkbox', { name: /extra espresso/i })).not.toBeInTheDocument()
    })

    it('never exposes beverage modifiers for a Pastry, and adds it directly with no dialog', async () => {
      const user = userEvent.setup()
      renderServices('/customer/services/coffee')

      const croissant = screen.getByRole('article', { name: new RegExp('^Butter Croissant') })
      expect(within(croissant).queryByRole('button', { name: 'Customize & add' })).not.toBeInTheDocument()
      await user.click(within(croissant).getByRole('button', { name: 'Add' }))

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(await screen.findByRole('status')).toHaveTextContent(`Added Butter Croissant — ${priceText(35)}`)
    })
  })

  describe('category navigation', () => {
    it('renders a chip for every menu section with an obvious active state', async () => {
      renderServices('/customer/services/coffee')

      const nav = await screen.findByRole('navigation', { name: /coffee menu categories/i })
      expect(within(nav).getByRole('button', { name: 'Coffee' })).toHaveAttribute('aria-current', 'true')
      expect(within(nav).getByRole('button', { name: 'Refreshers' })).toBeInTheDocument()
      expect(within(nav).getByRole('button', { name: 'Pastries' })).toBeInTheDocument()
    })

    it('marks the clicked category as active', async () => {
      const user = userEvent.setup()
      renderServices('/customer/services/coffee')

      const nav = await screen.findByRole('navigation', { name: /coffee menu categories/i })
      const matchaChip = within(nav).getByRole('button', { name: 'Matcha' })
      expect(matchaChip).not.toHaveAttribute('aria-current')

      await user.click(matchaChip)
      expect(matchaChip).toHaveAttribute('aria-current', 'true')
      expect(within(nav).getByRole('button', { name: 'Coffee' })).not.toHaveAttribute('aria-current')
    })
  })

  it('existing Coffee catalogue pricing remains unchanged', async () => {
    renderServices('/customer/services/coffee')

    expect(await screen.findByRole('heading', { name: 'LOAD Coffee' })).toBeInTheDocument()
    expect(screen.getByRole('article', { name: 'Espresso' })).toHaveTextContent(priceText(28))
    expect(screen.getByRole('article', { name: 'Cappuccino' })).toHaveTextContent(priceText(38))
    expect(screen.getByRole('article', { name: new RegExp('^12 Loaded Donuts') })).toHaveTextContent(priceText(259))
    expect(screen.getByRole('article', { name: new RegExp('^1 Original Glazed') })).toHaveTextContent(priceText(17))
  })
})
