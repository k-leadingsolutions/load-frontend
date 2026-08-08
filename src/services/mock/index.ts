import type { PricingQuote } from '@/domain/models'
import {
  mockAddOns,
  mockBasketSizes,
  mockCategories,
  mockCustomerProfile,
  mockDashboardMetrics,
  mockDriverAssignments,
  mockLoyaltyRules,
  mockOrders,
  mockProductionOrders,
  mockPromotions,
  mockServices,
} from '@/services/mock/data'
import { errorResponse, successResponse } from '@/services/mock/mockApi'
import type {
  AdminService,
  AuthService,
  CatalogueService,
  CustomerOrderService,
  DriverService,
  OperationsService,
} from '@/services/interfaces'
import type { LoginRequest, PlaceOrderRequest, QuoteRequest, RegisterRequest } from '@/services/contracts'

const DEMO_PASSWORD = 'Load@1234'

const createRegisteredProfile = (request: RegisterRequest) => ({
  id: `cust-${request.firstName.toLowerCase()}-${request.lastName.toLowerCase()}-${crypto.randomUUID().slice(0, 6)}`,
  firstName: request.firstName,
  lastName: request.lastName,
  mobileNumber: request.mobileNumber,
  email: request.email,
  role: 'CUSTOMER' as const,
  defaultAddressId: '',
  addresses: [],
  loyalty: {
    tier: 'Silver' as const,
    points: 0,
    availableRewards: 0,
    loadBalance: 0,
  },
})

const buildQuote = (request: QuoteRequest): PricingQuote => {
  const basket = request.basketSizeId
    ? mockBasketSizes.find((item) => item.id === request.basketSizeId)
    : undefined

  const serviceItems = request.serviceSelections.flatMap((selection) => {
    const service = mockServices.find((item) => item.id === selection.serviceId)
    if (!service) {
      return []
    }

    return [{
      id: service.id,
      label: service.name,
      pricingType: 'SERVICE' as const,
      quantity: selection.quantity,
      unitPrice: service.basePrice,
      totalPrice: selection.quantity * service.basePrice,
    }]
  })

  const addOnItems = request.addOnSelections.flatMap((selection) => {
    const addOn = mockAddOns.find((item) => item.id === selection.addOnId)
    if (!addOn) {
      return []
    }

    return [{
      id: addOn.id,
      label: addOn.name,
      pricingType: 'ADD_ON' as const,
      quantity: selection.quantity,
      unitPrice: addOn.price,
      totalPrice: selection.quantity * addOn.price,
    }]
  })

  const basketItem = basket
    ? [{
        id: basket.id,
        label: `${basket.name} ${basket.capacityLabel}`,
        pricingType: 'SERVICE' as const,
        quantity: request.basketQuantity ?? 1,
        unitPrice: basket.price,
        totalPrice: (request.basketQuantity ?? 1) * basket.price,
      }]
    : []

  const expressFee = request.expressRequested ? 79 : 0
  const subtotal = [...basketItem, ...serviceItems, ...addOnItems].reduce(
    (sum, item) => sum + item.totalPrice,
    0,
  )
  const deliveryFee = subtotal >= 300 ? 0 : 45
  const discountTotal = request.promotionCode === 'FIRSTLOAD' ? subtotal * 0.15 : 0

  return {
    ...(basket
      ? {
          basketPlan: {
            basketSizeId: basket.id,
            quantity: request.basketQuantity ?? 1,
          },
        }
      : {}),
    itemisedServices: request.serviceSelections,
    addOns: request.addOnSelections,
    deliveryFee,
    expressFee,
    promotions: request.promotionCode
      ? mockPromotions.filter((item) => item.code === request.promotionCode)
      : [],
    subtotal,
    discountTotal,
    estimatedTotal: subtotal + deliveryFee + expressFee - discountTotal,
    loyaltyPreviewPoints: Math.round((subtotal + expressFee) * 5),
    freeDeliveryThreshold: 300,
    freeDeliveryGap: Math.max(0, 300 - subtotal),
    lineItems: [
      ...basketItem,
      ...serviceItems,
      ...addOnItems,
      {
        id: 'delivery',
        label: 'Delivery fee',
        pricingType: 'DELIVERY',
        quantity: 1,
        unitPrice: deliveryFee,
        totalPrice: deliveryFee,
      },
      ...(discountTotal > 0
        ? [{
            id: 'discount',
            label: 'Promotion',
            pricingType: 'DISCOUNT' as const,
            quantity: 1,
            unitPrice: -discountTotal,
            totalPrice: -discountTotal,
          }]
        : []),
    ],
  }
}

export const mockAuthService: AuthService = {
  async login(request: LoginRequest) {
    const isKnownCustomer = request.mobileNumber === mockCustomerProfile.mobileNumber

    if (!isKnownCustomer || request.password !== DEMO_PASSWORD) {
      return errorResponse({ code: 'INVALID_CREDENTIALS', message: 'Use the demo mobile number and password to sign in.' }, 450)
    }

    return successResponse(mockCustomerProfile, 450)
  },
  async register(request: RegisterRequest) {
    if (request.email === mockCustomerProfile.email || request.mobileNumber === mockCustomerProfile.mobileNumber) {
      return errorResponse({ code: 'ACCOUNT_EXISTS', message: 'An account already exists with those details.' }, 550)
    }

    return successResponse(createRegisteredProfile(request), 550)
  },
  async getProfile() {
    return successResponse(mockCustomerProfile, 350)
  },
}

export const mockCatalogueService: CatalogueService = {
  async getCatalogue() {
    return successResponse(
      {
        categories: mockCategories,
        services: mockServices,
        addOns: mockAddOns,
        basketSizes: mockBasketSizes,
        promotions: mockPromotions,
        loyaltyRules: mockLoyaltyRules,
      },
      450,
    )
  },
  async getQuote(request: QuoteRequest) {
    return successResponse(buildQuote(request), 500)
  },
}

export const mockCustomerOrderService: CustomerOrderService = {
  async listOrders(customerId: string) {
    return successResponse(mockOrders.filter((order) => order.customerId === customerId), 380)
  },
  async getOrder(orderId: string) {
    const order = mockOrders.find((item) => item.id === orderId)
    return order
      ? successResponse(order, 340)
      : errorResponse({ code: 'ORDER_NOT_FOUND', message: 'Order could not be located.' }, 340)
  },
  async placeOrder(_request: PlaceOrderRequest) {
    return successResponse(mockOrders[0]!, 700)
  },
}

export const mockOperationsService: OperationsService = {
  async listProductionOrders() {
    return successResponse(mockProductionOrders, 420)
  },
}

export const mockDriverService: DriverService = {
  async listAssignments() {
    return successResponse(mockDriverAssignments, 360)
  },
}

export const mockAdminService: AdminService = {
  async getMetrics() {
    return successResponse(mockDashboardMetrics, 390)
  },
}
