import type { PricingQuote } from '@/domain/models'
import { getFriendlyOrderStatus, ORDER_STATUS_MODEL } from '@/domain/orderStatus'
import { approvedAddOns } from '@/services/mock/approvedLaundryCatalogue'
import {
  mockAddOns,
  mockBasketSizes,
  mockCategories,
  mockCustomerProfile,
  mockDashboardMetrics,
  mockLoyaltyRules,
  mockPromotions,
  mockServices,
} from '@/services/mock/data'
import { getStoredOrder, listStoredOrders, prependStoredOrder } from '@/services/mock/orderStore'
import {
  listStoredDriverAssignments,
  updateStoredDriverAssignment,
} from '@/services/mock/driverStore'
import {
  getNextProductionStatus,
  listStoredProductionOrders,
  prependStoredProductionOrder,
  updateStoredProductionOrder,
} from '@/services/mock/operationsStore'
import { errorResponse, successResponse } from '@/services/mock/mockApi'
import { readStoredCustomerSession } from '@/services/mock/sessionStore'
import {
  mockDomainEventService,
  mockRouteService,
  mockWeightPricingService,
} from '@/services/mock/extendedMocks'
import { mockPaymentService } from '@/services/mock/mockPaymentService'
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
  const hasWeightPricedService = request.serviceSelections.some((selection) => {
    const service = mockServices.find((item) => item.id === selection.serviceId)
    return service?.pricingModel === 'PER_KILOGRAM'
  })
  const estimatedWeightKg = hasWeightPricedService
    ? request.serviceSelections
    .filter((selection) => mockServices.find((item) => item.id === selection.serviceId)?.pricingModel === 'PER_KILOGRAM')
    .reduce((sum, selection) => sum + selection.quantity, 0)
    : undefined

  const addOnItems = request.addOnSelections.flatMap((selection) => {
    const addOn = mockAddOns.find((item) => item.id === selection.addOnId)
    if (!addOn || addOn.id === 'addon-express') {
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

  const expressAddOn = approvedAddOns.find((item) => item.id === 'addon-express')
  const expressFee = request.expressRequested ? (expressAddOn?.price ?? 79) : 0
  const subtotal = [...basketItem, ...serviceItems, ...addOnItems].reduce(
    (sum, item) => sum + item.totalPrice,
    0,
  )
  const promotion = request.promotionCode
    ? mockPromotions.find((item) => item.code === request.promotionCode)
    : undefined
  const baseDeliveryFee = subtotal >= 300 ? 0 : 45
  const deliveryFee = promotion?.discountType === 'FREE_DELIVERY' && subtotal >= (promotion.minimumOrderAmount ?? 0)
    ? 0
    : baseDeliveryFee
  const promotionDiscount = promotion?.discountType === 'PERCENTAGE'
    ? subtotal * (promotion.value / 100)
    : promotion?.discountType === 'FIXED'
      ? promotion.value
      : 0
  const loyaltyRedemptionTotal = request.useLoyaltyPoints
    ? Math.min(75, (readStoredCustomerSession()?.loyalty.availableRewards ?? 0) * 25)
    : 0
  const discountTotal = promotionDiscount + loyaltyRedemptionTotal

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
    loyaltyRedemptionTotal,
    estimatedTotal: Math.max(0, subtotal + deliveryFee + expressFee - discountTotal),
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
            id: 'promotion-discount',
            label: promotion?.name ?? 'Promotion',
            pricingType: 'DISCOUNT' as const,
            quantity: 1,
            unitPrice: -promotionDiscount,
            totalPrice: -promotionDiscount,
          }]
        : []),
      ...(loyaltyRedemptionTotal > 0
        ? [{
            id: 'loyalty-redemption',
            label: 'Loyalty rewards',
            pricingType: 'DISCOUNT' as const,
            quantity: 1,
            unitPrice: -loyaltyRedemptionTotal,
            totalPrice: -loyaltyRedemptionTotal,
          }]
        : []),
    ],
    ...(estimatedWeightKg
      ? {
          estimatedWeightKg,
          weightDisclaimer: 'Estimated price. Final amount will be confirmed after collection and weighing.',
        }
      : {}),
  }
}

export const mockAuthService: AuthService = {
  async login(request: LoginRequest) {
    const isKnownCustomer =
      (request.mobileNumber && request.mobileNumber === mockCustomerProfile.mobileNumber)
      || (request.email && request.email.toLowerCase() === mockCustomerProfile.email.toLowerCase())

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
  async sendOtp(_mobileNumber) {
    await new Promise((r) => setTimeout(r, 600))
    return { success: true }
  },
  async verifyOtp(_mobileNumber, code) {
    await new Promise((r) => setTimeout(r, 700))
    // Accept '123456' or any 6-digit code in mock
    return { valid: code === '123456' || (code.length === 6 && /^\d{6}$/.test(code)) }
  },
  async forgotPassword(_emailOrMobile) {
    await new Promise((r) => setTimeout(r, 500))
    return { sent: true }
  },
  async resetPassword(_token, _newPassword) {
    await new Promise((r) => setTimeout(r, 500))
    return { success: true }
  },
  async biometricLogin(_credential) {
    await new Promise((r) => setTimeout(r, 400))
    return successResponse(mockCustomerProfile, 0)
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
    return successResponse(listStoredOrders(customerId), 380)
  },
  async getOrder(orderId: string) {
    const order = getStoredOrder(orderId)
    return order
      ? successResponse(order, 340)
      : errorResponse({ code: 'ORDER_NOT_FOUND', message: 'Order could not be located.' }, 340)
  },
  async placeOrder(request: PlaceOrderRequest) {
    const customer = readStoredCustomerSession() ?? mockCustomerProfile
    const quote = buildQuote({
      ...(request.basketSizeId ? { basketSizeId: request.basketSizeId } : {}),
      basketQuantity: 1,
      serviceSelections: request.serviceSelections,
      addOnSelections: request.addOnSelections,
      ...(request.promotionCode ? { promotionCode: request.promotionCode } : {}),
      expressRequested: request.addOnSelections.some((selection) => selection.addOnId === 'addon-express'),
      ...(request.useLoyaltyPoints ? { useLoyaltyPoints: request.useLoyaltyPoints } : {}),
    })
    const pickupAddress = customer.addresses.find((address) => address.id === request.pickupAddressId)
    const deliveryAddress = customer.addresses.find((address) => address.id === request.deliveryAddressId)
    const basket = request.basketSizeId
      ? mockBasketSizes.find((item) => item.id === request.basketSizeId)
      : undefined

    if (!pickupAddress || !deliveryAddress) {
      return errorResponse({ code: 'ADDRESS_NOT_FOUND', message: 'Select valid pickup and delivery addresses.' }, 700)
    }

    const nextOrderId = `LD${Math.floor(Math.random() * 90000) + 10000}`
    const nextOrder = prependStoredOrder({
      id: nextOrderId,
      customerId: request.customerId,
      status: 'BOOKING_RECEIVED',
      friendlyStatus: getFriendlyOrderStatus('BOOKING_RECEIVED'),
      pickupWindow: {
        date: request.pickupWindow.split('|')[0] ?? request.pickupWindow,
        windowLabel: request.pickupWindow,
      },
      deliveryWindow: {
        date: request.deliveryWindow.split('|')[0] ?? request.deliveryWindow,
        windowLabel: request.deliveryWindow,
      },
      pickupAddress,
      deliveryAddress,
      services: [
        ...(basket
          ? [{
              serviceId: basket.id,
              quantity: 1,
              unitLabel: basket.capacityLabel,
            }]
          : []),
        ...request.serviceSelections.map((selection) => ({
          serviceId: selection.serviceId,
          quantity: selection.quantity,
          unitLabel: mockServices.find((service) => service.id === selection.serviceId)?.unitLabel ?? 'item',
        })),
      ],
      estimatedTotal: quote.estimatedTotal,
      paymentStatus: 'PENDING',
      loyaltyPointsEarned: quote.loyaltyPreviewPoints,
      promotionsApplied: request.promotionCode ? [request.promotionCode] : [],
      internalNotes: [],
      canRepeat: false,
    })
    prependStoredProductionOrder(nextOrder)

    return successResponse(nextOrder, 700)
  },
}

export const mockOperationsService: OperationsService = {
  async listProductionOrders() {
    return successResponse(listStoredProductionOrders(), 420)
  },
  async confirmLaundryReceived(orderId: string) {
    const order = updateStoredProductionOrder(orderId, (current) => ({
      ...current,
      receivedAtStore: true,
      status: 'RECEIVED_AT_STORE',
      stageLabel: 'Received at store',
    }))

    return order
      ? successResponse(order, 300)
      : errorResponse({ code: 'ORDER_NOT_FOUND', message: 'Production order could not be located.' }, 300)
  },
  async updateQuantityReview(orderId: string, status: 'CONFIRMED' | 'ADJUSTED') {
    const order = updateStoredProductionOrder(orderId, (current) => ({
      ...current,
      quantityReviewStatus: status,
    }))

    return order
      ? successResponse(order, 260)
      : errorResponse({ code: 'ORDER_NOT_FOUND', message: 'Production order could not be located.' }, 260)
  },
  async addInternalNote(orderId: string, note: string) {
    const order = updateStoredProductionOrder(orderId, (current) => ({
      ...current,
      internalNotes: [note, ...current.internalNotes],
    }))

    return order
      ? successResponse(order, 260)
      : errorResponse({ code: 'ORDER_NOT_FOUND', message: 'Production order could not be located.' }, 260)
  },
  async advanceProductionStage(orderId: string) {
    const order = updateStoredProductionOrder(orderId, (current) => {
      const nextStatus = getNextProductionStatus(current.status)

      return {
        ...current,
        status: nextStatus,
        stageLabel: ORDER_STATUS_MODEL[nextStatus].label,
        qualityCheckPending: nextStatus === 'QUALITY_CHECK',
      }
    })

    return order
      ? successResponse(order, 320)
      : errorResponse({ code: 'ORDER_NOT_FOUND', message: 'Production order could not be located.' }, 320)
  },
  async getMetrics() {
    return successResponse(mockDashboardMetrics, 350)
  },
  async assignDriver(orderId: string, driverId: string) {
    await new Promise((r) => setTimeout(r, 400))
    await mockDomainEventService.emit('DRIVER_ASSIGNED', orderId, { driverId })
    void orderId
    void driverId
    return { success: true }
  },
  async performQC(orderId: string, result) {
    const order = updateStoredProductionOrder(orderId, (current) => ({
      ...current,
      qualityCheckPending: false,
      status: result.passed ? 'PACKING' : 'SORTING',
      stageLabel: result.passed ? 'Packing' : 'Returned to production',
      internalNotes: result.notes
        ? [result.notes, ...current.internalNotes]
        : current.internalNotes,
    }))

    return order
      ? await (async () => {
        if (!result.passed) {
          await mockDomainEventService.emit('QUALITY_ISSUE_FOUND', orderId, { notes: result.notes })
        }
        return successResponse(order, 320)
      })()
      : errorResponse({ code: 'ORDER_NOT_FOUND', message: 'Production order could not be located.' }, 320)
  },
  async adjustPrice(orderId: string, amount: number, reason: string) {
    const order = updateStoredProductionOrder(orderId, (current) => ({
      ...current,
      internalNotes: [`Price adjustment R${amount}: ${reason}`, ...current.internalNotes],
    }))

    return order
      ? await (async () => {
        await mockDomainEventService.emit('PRICE_ADJUSTED', orderId, { amount, reason })
        await mockDomainEventService.emit('PAYMENT_REQUIRED', orderId)
        return successResponse(order, 320)
      })()
      : errorResponse({ code: 'ORDER_NOT_FOUND', message: 'Production order could not be located.' }, 320)
  },
}

export const mockDriverService: DriverService = {
  async listAssignments() {
    return successResponse(listStoredDriverAssignments(), 360)
  },
  async confirmArrival(assignmentId: string) {
    const assignment = updateStoredDriverAssignment(assignmentId, (current) => ({
      ...current,
      stopStatus: 'ARRIVED',
      verificationStatus: 'AWAITING',
    }))
    if (assignment) {
      await mockDomainEventService.emit('DRIVER_ARRIVED', assignment.orderId)
    }

    return assignment
      ? successResponse(assignment, 260)
      : errorResponse({ code: 'ASSIGNMENT_NOT_FOUND', message: 'Driver assignment could not be located.' }, 260)
  },
  async confirmCollection(assignmentId: string) {
    const assignment = updateStoredDriverAssignment(assignmentId, (current) => ({
      ...current,
      stopStatus: 'COLLECTED',
      ...(current.paymentStatus
        ? {
            paymentStatus: current.paymentStatus === 'AWAITING_PAYMENT'
              ? 'PAYMENT_CONFIRMED'
              : current.paymentStatus,
          }
        : {}),
    }))
    if (assignment) {
      await mockDomainEventService.emit('ORDER_COLLECTED', assignment.orderId)
    }

    return assignment
      ? successResponse(assignment, 260)
      : errorResponse({ code: 'ASSIGNMENT_NOT_FOUND', message: 'Driver assignment could not be located.' }, 260)
  },
  async confirmDelivery(assignmentId: string, proofOfDelivery: string) {
    const assignment = updateStoredDriverAssignment(assignmentId, (current) => ({
      ...current,
      stopStatus: 'DELIVERED',
      proofOfDelivery,
    }))
    if (assignment) {
      await mockDomainEventService.emit('DELIVERY_COMPLETED', assignment.orderId, { proofOfDelivery })
    }

    return assignment
      ? successResponse(assignment, 280)
      : errorResponse({ code: 'ASSIGNMENT_NOT_FOUND', message: 'Driver assignment could not be located.' }, 280)
  },
  async recordFailure(assignmentId: string, reason: string) {
    const assignment = updateStoredDriverAssignment(assignmentId, (current) => ({
      ...current,
      stopStatus: 'FAILED',
      failureReason: reason,
    }))

    return assignment
      ? successResponse(assignment, 280)
      : errorResponse({ code: 'ASSIGNMENT_NOT_FOUND', message: 'Driver assignment could not be located.' }, 280)
  },
  async getRoute() {
    return mockRouteService.getRoute('driver-01')
  },
  async captureWeight(stopId, weightKg) {
    const assignment = updateStoredDriverAssignment(stopId, (current) => ({
      ...current,
      paymentStatus: 'AWAITING_PAYMENT',
    }))
    const result = await mockWeightPricingService.confirmWeight(stopId, {
      orderId: assignment?.orderId ?? stopId,
      measuredKg: weightKg,
      measuredBy: 'driver-01',
      measuredAt: new Date().toISOString(),
      status: 'CONFIRMED',
    })
    const orderId = assignment?.orderId ?? stopId
    await mockDomainEventService.emit('LAUNDRY_WEIGHT_CAPTURED', orderId, { measuredKg: weightKg })
    await mockDomainEventService.emit('PRICE_RECALCULATED', orderId, { measuredKg: weightKg })
    await mockDomainEventService.emit('PAYMENT_REQUIRED', orderId)
    return result
  },
  async requestReschedule(stopId, reason, note) {
    await new Promise((r) => setTimeout(r, 400))
    const assignment = updateStoredDriverAssignment(stopId, (current) => ({
      ...current,
      stopStatus: 'FAILED',
      rescheduleReason: reason,
      ...(note ? { failureReason: note } : {}),
    }))
    await mockDomainEventService.emit('DELIVERY_RESCHEDULED', assignment?.orderId ?? stopId, { reason, note })
    return { success: true }
  },
  async verifyStop(stopId, method, code) {
    const attempt = await import('@/services/mock/extendedMocks').then((m) =>
      m.mockVerificationService.initVerification(stopId, method)
    )
    const verification = code
      ? await import('@/services/mock/extendedMocks').then((m) =>
        m.mockVerificationService.submitVerification(attempt.id, code)
      )
      : attempt
    updateStoredDriverAssignment(stopId, (current) => ({
      ...current,
      verificationMethod: method,
      verificationStatus: verification.status,
    }))
    if (verification.status === 'VERIFIED') {
      const current = listStoredDriverAssignments().find((item) => item.id === stopId)
      if (current) {
        await mockDomainEventService.emit('COLLECTION_VERIFIED', current.orderId, { method })
      }
    }
    return verification
  },
}

export const mockAdminService: AdminService = {
  async getMetrics() {
    return successResponse(mockDashboardMetrics, 390)
  },
}

export { mockPaymentService }

// Re-export extended mocks for convenience
export {
  mockCoffeeService,
  mockDomainEventService,
  mockInvoiceService,
  mockLoyaltyService,
  mockNotificationService,
  mockPosService,
  mockRouteService,
  mockVerificationService,
  mockWeightPricingService,
} from '@/services/mock/extendedMocks'
