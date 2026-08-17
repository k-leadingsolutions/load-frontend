import type { LaundryOrder } from '@/domain/models'
import { mockOrders } from '@/services/mock/data'

const ORDER_STORAGE_KEY = 'load.customer.orders.v1'

let memoryOrders: LaundryOrder[] = mockOrders

const canUseStorage = () => typeof window !== 'undefined' && 'localStorage' in window

const readOrdersFromStorage = () => {
  if (!canUseStorage()) {
    return memoryOrders
  }

  const rawOrders = window.localStorage.getItem(ORDER_STORAGE_KEY)

  if (!rawOrders) {
    window.localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(mockOrders))
    return mockOrders
  }

  try {
    return JSON.parse(rawOrders) as LaundryOrder[]
  } catch {
    window.localStorage.removeItem(ORDER_STORAGE_KEY)
    window.localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(mockOrders))
    return mockOrders
  }
}

const writeOrders = (orders: LaundryOrder[]) => {
  memoryOrders = orders

  if (!canUseStorage()) {
    return
  }

  window.localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(orders))
}

export const listStoredOrders = (customerId: string) =>
  readOrdersFromStorage().filter((order) => order.customerId === customerId)

export const listAllStoredOrders = () => readOrdersFromStorage()

export const getStoredOrder = (orderId: string) =>
  readOrdersFromStorage().find((order) => order.id === orderId)

export const prependStoredOrder = (order: LaundryOrder) => {
  const orders = readOrdersFromStorage()
  const nextOrders = [order, ...orders.filter((item) => item.id !== order.id)]
  writeOrders(nextOrders)
  return order
}
