import { ORDER_STATUS_MODEL } from '@/domain/orderStatus'
import type { LaundryOrder, ProductionOrder } from '@/domain/models'
import { mockProductionOrders } from '@/services/mock/data'

const OPERATIONS_STORAGE_KEY = 'load.operations.orders.v1'

let memoryOrders: ProductionOrder[] = mockProductionOrders

const canUseStorage = () => typeof window !== 'undefined' && 'localStorage' in window

const readOrders = () => {
  if (!canUseStorage()) {
    return memoryOrders
  }

  const rawOrders = window.localStorage.getItem(OPERATIONS_STORAGE_KEY)

  if (!rawOrders) {
    window.localStorage.setItem(OPERATIONS_STORAGE_KEY, JSON.stringify(mockProductionOrders))
    return mockProductionOrders
  }

  try {
    return JSON.parse(rawOrders) as ProductionOrder[]
  } catch {
    window.localStorage.removeItem(OPERATIONS_STORAGE_KEY)
    window.localStorage.setItem(OPERATIONS_STORAGE_KEY, JSON.stringify(mockProductionOrders))
    return mockProductionOrders
  }
}

const writeOrders = (orders: ProductionOrder[]) => {
  memoryOrders = orders

  if (!canUseStorage()) {
    return
  }

  window.localStorage.setItem(OPERATIONS_STORAGE_KEY, JSON.stringify(orders))
}

export const listStoredProductionOrders = () => readOrders()

export const updateStoredProductionOrder = (orderId: string, updater: (order: ProductionOrder) => ProductionOrder) => {
  const orders = readOrders()
  const targetOrder = orders.find((order) => order.id === orderId)

  if (!targetOrder) {
    return null
  }

  const updatedOrder = updater(targetOrder)
  writeOrders(orders.map((order) => (order.id === orderId ? updatedOrder : order)))
  return updatedOrder
}

export const prependStoredProductionOrder = (order: LaundryOrder) => {
  const productionOrder: ProductionOrder = {
    id: order.id,
    customerName: order.customerId === 'cust-thando-001' ? 'Thando Mokoena' : `${order.pickupAddress.label} customer`,
    suburb: order.pickupAddress.suburb,
    status: 'BOOKING_RECEIVED',
    stageLabel: ORDER_STATUS_MODEL.BOOKING_RECEIVED.label,
    qualityCheckPending: false,
    internalNotes: [],
    itemsSummary: order.services.map((service) => `${service.quantity} × ${service.unitLabel}`),
    quantityReviewStatus: 'PENDING',
    receivedAtStore: false,
    authorisedAdjustmentAllowed: true,
  }

  const existingOrders = readOrders()
  writeOrders([productionOrder, ...existingOrders.filter((item) => item.id !== order.id)])
  return productionOrder
}

const productionStages: ProductionOrder['status'][] = [
  'RECEIVED_AT_STORE',
  'SORTING',
  'WASHING',
  'DRYING',
  'IRONING',
  'QUALITY_CHECK',
  'PACKING',
  'READY_FOR_DISPATCH',
]

export const getNextProductionStatus = (currentStatus: ProductionOrder['status']) => {
  const currentIndex = productionStages.indexOf(currentStatus)

  if (currentIndex === -1) {
    return 'RECEIVED_AT_STORE'
  }

  return productionStages[Math.min(currentIndex + 1, productionStages.length - 1)]!
}
