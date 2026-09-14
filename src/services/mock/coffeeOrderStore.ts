import type { CoffeeCartLine, CoffeeOrder } from '@/domain/models/coffee'

/**
 * Persisted store for placed LOAD Coffee orders — intentionally separate from
 * `orderStore.ts` (LaundryOrder). Coffee orders have no pickup/delivery
 * lifecycle, so they use a minimal status model and are not surfaced on the
 * laundry CustomerOrdersPage.
 */

const COFFEE_ORDER_STORAGE_KEY = 'load.customer.coffeeOrders.v1'

let memoryOrders: CoffeeOrder[] = []

const canUseStorage = () => typeof window !== 'undefined' && 'localStorage' in window

const readOrdersFromStorage = (): CoffeeOrder[] => {
  if (!canUseStorage()) {
    return memoryOrders
  }

  const raw = window.localStorage.getItem(COFFEE_ORDER_STORAGE_KEY)

  if (!raw) {
    return []
  }

  try {
    return JSON.parse(raw) as CoffeeOrder[]
  } catch {
    window.localStorage.removeItem(COFFEE_ORDER_STORAGE_KEY)
    return []
  }
}

const writeOrders = (orders: CoffeeOrder[]) => {
  memoryOrders = orders

  if (!canUseStorage()) {
    return
  }

  window.localStorage.setItem(COFFEE_ORDER_STORAGE_KEY, JSON.stringify(orders))
}

export const listStoredCoffeeOrders = (customerId: string): CoffeeOrder[] =>
  readOrdersFromStorage().filter((order) => order.customerId === customerId)

export const prependStoredCoffeeOrder = (order: CoffeeOrder): CoffeeOrder => {
  const orders = readOrdersFromStorage()
  writeOrders([order, ...orders])
  return order
}

export const placeCoffeeOrder = (customerId: string, items: CoffeeCartLine[]): CoffeeOrder => {
  const total = items.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0)

  const order: CoffeeOrder = {
    id: `coffee-order-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    customerId,
    status: 'RECEIVED',
    items,
    total,
    placedAt: new Date().toISOString(),
  }

  return prependStoredCoffeeOrder(order)
}
