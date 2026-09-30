import { useLocation } from 'react-router-dom'
import { ActiveBasketBar } from '@/components/ui/ActiveBasketBar'
import { appPaths } from '@/app/router/paths'
import { useCoffeeCart } from '@/features/customer/coffee/CoffeeCartContext'

/**
 * Wires the shared, basket-agnostic `ActiveBasketBar` presentation to the
 * Coffee cart — today's only customer basket with a persistent floating CTA.
 * Kept outside `ActiveBasketBar` itself (and outside any Coffee page) so the
 * shared component stays reusable for a future Laundry basket bar without
 * duplicating pricing/basket logic: `CoffeeCartContext`'s own
 * `itemCount`/`subtotal` remain the single source of truth here, exactly as
 * they already are on the Coffee cart page itself.
 *
 * Suppressed on the Coffee cart route itself, since a "View cart" CTA
 * pointing at the page the customer is already on adds no value there.
 */
export const CoffeeActiveBasketBar = () => {
  const { itemCount, subtotal } = useCoffeeCart()
  const location = useLocation()

  if (location.pathname === appPaths.customerCoffeeCart) {
    return null
  }

  return <ActiveBasketBar itemCount={itemCount} subtotal={subtotal} to={appPaths.customerCoffeeCart} />
}
