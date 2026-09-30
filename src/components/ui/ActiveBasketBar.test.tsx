import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ActiveBasketBar } from '@/components/ui/ActiveBasketBar'

/**
 * Unit tests for the shared, basket-source-agnostic `ActiveBasketBar`
 * presentation. Deliberately exercised with plain props (no Coffee cart, no
 * Laundry draft) to prove the component itself has no dependency on any
 * specific basket implementation — it is safe to reuse for any future
 * customer basket (regression coverage for "shared shell renders basket CTA
 * outside Coffee-specific implementation").
 */
describe('ActiveBasketBar (shared, basket-agnostic)', () => {
  it('renders nothing when the basket is empty', () => {
    const { container } = render(
      <MemoryRouter>
        <ActiveBasketBar itemCount={0} subtotal={0} to="/customer/anywhere" />
      </MemoryRouter>,
    )

    expect(container).toBeEmptyDOMElement()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('shows the correct singular item count and formatted total for one item', () => {
    render(
      <MemoryRouter>
        <ActiveBasketBar itemCount={1} subtotal={52} to="/customer/anywhere" />
      </MemoryRouter>,
    )

    const link = screen.getByRole('link', { name: /view cart/i })
    expect(link).toHaveTextContent(/1 item/i)
    expect(link).not.toHaveTextContent(/1 items/i)
    expect(link).toHaveTextContent(/R\s?52,00/)
  })

  it('shows the correct plural item count and total for multiple items', () => {
    render(
      <MemoryRouter>
        <ActiveBasketBar itemCount={3} subtotal={146} to="/customer/anywhere" />
      </MemoryRouter>,
    )

    const link = screen.getByRole('link', { name: /view cart/i })
    expect(link).toHaveTextContent(/3 items/i)
    expect(link).toHaveTextContent(/R\s?146,00/)
  })

  it('is a single semantic link covering the entire CTA — no nested interactive controls', () => {
    render(
      <MemoryRouter>
        <ActiveBasketBar itemCount={2} subtotal={100} to="/customer/somewhere" />
      </MemoryRouter>,
    )

    const link = screen.getByRole('link', { name: /view cart/i })
    expect(link).toHaveAttribute('href', '/customer/somewhere')
    // No nested buttons/links inside the CTA.
    expect(link.querySelectorAll('a, button')).toHaveLength(0)
  })

  it('exposes a clear accessible label describing count and total together', () => {
    render(
      <MemoryRouter>
        <ActiveBasketBar itemCount={2} subtotal={100} to="/customer/somewhere" />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: /view cart: 2 items, R\s?100,00/i })).toBeInTheDocument()
  })

  it('supports a custom item noun for a non-Coffee basket without any code changes to the component', () => {
    render(
      <MemoryRouter>
        <ActiveBasketBar itemCount={2} subtotal={60} to="/customer/laundry-basket" itemNoun="load" />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: /2 loads/i })).toBeInTheDocument()
  })
})
