import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { appPaths } from '@/app/router/paths'
import { CustomerServicesPage } from '@/features/customer/pages/CustomerServicesPage'
import { CustomerServiceCategoryPage } from '@/features/customer/pages/CustomerServiceCategoryPage'
import { CoffeeCartProvider } from '@/features/customer/coffee/CoffeeCartContext'
import { formatCurrency } from '@/utils/format'

/** DOM text is whitespace-normalized (nbsp → space) by Testing Library queries. */
const priceText = (amount: number) => formatCurrency(amount).replace(/\u00a0/g, ' ')
/** Build a name-matcher regex tolerant of nbsp vs. regular space in accessible names. */
const pricePattern = (amount: number) => formatCurrency(amount).replace(/\u00a0/g, '\\s+')

const renderServices = (initialEntry: string) =>
  render(
    <CoffeeCartProvider>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path={appPaths.customerServices} element={<CustomerServicesPage />} />
          <Route path={appPaths.customerServiceCategory} element={<CustomerServiceCategoryPage />} />
        </Routes>
      </MemoryRouter>
    </CoffeeCartProvider>,
  )

describe('LOAD Coffee category', () => {
  it('appears as a category card on the Services screen', async () => {
    renderServices(appPaths.customerServices)

    expect(await screen.findByRole('link', { name: /browse load coffee/i })).toBeInTheDocument()
    // The pending-menu disclaimer must be gone now that the menu is approved.
    expect(
      screen.queryByText('Coffee ordering will be available once the menu is finalised.'),
    ).not.toBeInTheDocument()
  })

  it('renders coffee menu sections with LOAD Favourite badges and pricing', async () => {
    renderServices('/customer/services/coffee')

    expect(await screen.findByRole('heading', { name: 'LOAD Coffee' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Coffee' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Iced Coffee' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Matcha' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Pastries' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Mini Loaded Donuts' })).toBeInTheDocument()

    // Single-size drink shows no size toggle
    const espresso = screen.getByRole('article', { name: new RegExp(`^Espresso — ${pricePattern(28)}`) })
    expect(within(espresso).queryByRole('button', { name: 'Regular' })).not.toBeInTheDocument()
    expect(within(espresso).getByText(priceText(28))).toBeInTheDocument()

    // REG/LRG drink shows both sizes and a LOAD Favourite badge
    const iconicDrink = screen.getByText('Iced Spanish Latte').closest('article')!
    expect(within(iconicDrink).getByRole('button', { name: 'Regular' })).toBeInTheDocument()
    expect(within(iconicDrink).getByRole('button', { name: 'Large' })).toBeInTheDocument()
    expect(within(iconicDrink).getByText('LOAD Favourite')).toBeInTheDocument()

    // Fixed-price food item, no size/modifiers
    const donutPack = screen.getByText('12 Loaded Donuts').closest('article')!
    expect(within(donutPack).getByText(priceText(259))).toBeInTheDocument()
  })

  it('updates the displayed price when selecting a Large size and modifiers', async () => {
    const user = userEvent.setup()
    renderServices('/customer/services/coffee')

    const latte = (await screen.findByText('Latte')).closest('article')!
    expect(within(latte).getByText(priceText(40))).toBeInTheDocument()

    await user.click(within(latte).getByRole('button', { name: 'Large' }))
    expect(within(latte).getByText(priceText(46))).toBeInTheDocument()

    await user.click(within(latte).getByRole('checkbox', { name: /oat milk/i }))
    expect(within(latte).getByText(priceText(54))).toBeInTheDocument()
  })

  it('confirms an addition with a toast when "Add" is clicked', async () => {
    const user = userEvent.setup()
    renderServices('/customer/services/coffee')

    const cappuccino = (await screen.findByText('Cappuccino')).closest('article')!
    await user.click(within(cappuccino).getByRole('button', { name: 'Add' }))

    expect(await screen.findByRole('status')).toHaveTextContent(`Added Cappuccino — ${priceText(38)}`)
  })
})
