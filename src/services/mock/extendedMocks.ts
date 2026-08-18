/**
 * Mock implementations for new service interfaces.
 * All async delays simulate realistic network latency.
 */
import type {
  AppNotification,
  CoffeeOffer,
  DomainEvent,
  DomainEventType,
  Invoice,
  LoyaltyAccount,
  LoyaltyTransaction,
  Reward,
  Route,
  RouteStop,
  VerificationAttempt,
  WeightMeasurement,
} from '@/domain/models'
import type {
  CoffeeService,
  InvoiceService,
  LoyaltyService,
  NotificationService,
  PosService,
  RouteService,
  VerificationService,
  WeightPricingService,
  DomainEventService,
} from '@/services/interfaces'

// ─── Shared in-memory stores ──────────────────────────────────────────────────

const notificationStore: AppNotification[] = [
  {
    id: 'notif-01',
    type: 'DRIVER_ASSIGNED',
    targetRole: 'CUSTOMER',
    title: 'Driver assigned',
    body: 'Sipho will collect your laundry between 09:00 – 11:00.',
    orderId: 'LD10235',
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    id: 'notif-02',
    type: 'WASHING_STARTED',
    targetRole: 'CUSTOMER',
    title: 'Washing started',
    body: 'Your laundry is in the wash. We’ll keep you posted.',
    orderId: 'LD10235',
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
  },
  {
    id: 'notif-03',
    type: 'COFFEE_OFFER',
    targetRole: 'CUSTOMER',
    title: 'Free coffee offer',
    body: 'Add any wash order today and get a free coffee — LOAD Pass exclusive.',
    isRead: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  // Driver notifications
  {
    id: 'notif-d01',
    type: 'NEW_JOB_ASSIGNED',
    targetRole: 'DRIVER',
    title: 'New job assigned',
    body: 'Pickup at 7 Gwen Lane, Sandown — 09:00-11:00.',
    orderId: 'LD10236',
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    id: 'notif-d02',
    type: 'DRIVER_PAYMENT_CONFIRMED',
    targetRole: 'DRIVER',
    title: 'Payment confirmed',
    body: 'Order #LD10235 payment received. Proceed with collection.',
    orderId: 'LD10235',
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
  // Operations notifications
  {
    id: 'notif-o01',
    type: 'OPS_WEIGHT_CAPTURED',
    targetRole: 'OPERATIONS',
    title: 'Weight captured',
    body: 'Driver captured 9.4 kg for order #LD10235.',
    orderId: 'LD10235',
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
  },
  {
    id: 'notif-o02',
    type: 'OPS_PAYMENT_CONFIRMED',
    targetRole: 'OPERATIONS',
    title: 'Payment received',
    body: '#LD10235 — R248.00 confirmed via in-app.',
    orderId: 'LD10235',
    isRead: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  },
]

let notifMem = [...notificationStore]
let eventMem: DomainEvent[] = []

// ─── Mock invoice store ───────────────────────────────────────────────────────

const invoiceStore: Invoice[] = [
  {
    id: 'inv-LD10235',
    invoiceNumber: 'INV-2026-10235',
    orderId: 'LD10235',
    customerId: 'cust-thando-001',
    customerName: 'Thando Mokoena',
    serviceLabel: 'Wash & Fold – Standard Basket',
    confirmedWeightKg: 9.4,
    unitPricePerKg: 22,
    pickupFee: 0,
    deliveryFee: 0,
    subtotal: 169,
    adjustmentTotal: 0,
    discountTotal: 21.13, // FIRSTLOAD 15%
    loyaltyRedemptionTotal: 0,
    taxTotal: 0,
    finalTotal: 248,
    status: 'PAID',
    paymentStatus: 'CONFIRMED',
    posSyncStatus: 'SYNCED',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    lines: [
      {
        id: 'il-01',
        description: 'Wash & Fold – Standard Basket (12 kg)',
        quantity: 1,
        unitPrice: 169,
        total: 169,
        lineType: 'SERVICE',
      },
      {
        id: 'il-02',
        description: 'First Order Offer (15%)',
        quantity: 1,
        unitPrice: -21.13,
        total: -21.13,
        lineType: 'DISCOUNT',
      },
      {
        id: 'il-03',
        description: 'Express turnaround',
        quantity: 1,
        unitPrice: 79,
        total: 79,
        lineType: 'ADD_ON',
      },
      {
        id: 'il-04',
        description: 'Free delivery (order ≥ R300)',
        quantity: 1,
        unitPrice: 0,
        total: 0,
        lineType: 'DELIVERY_FEE',
      },
    ],
  },
]

let invoiceMem = [...invoiceStore]

// ─── Loyalty mock data ────────────────────────────────────────────────────────

const loyaltyTransactions: LoyaltyTransaction[] = [
  { id: 'lt-01', customerId: 'cust-thando-001', type: 'EARNED_ORDER', points: 1240, description: 'Order #LD10235 completed', orderId: 'LD10235', occurredAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString() },
  { id: 'lt-02', customerId: 'cust-thando-001', type: 'EARNED_ORDER', points: 120, description: 'Order #LD10234 completed', orderId: 'LD10234', occurredAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString() },
  { id: 'lt-03', customerId: 'cust-thando-001', type: 'EARNED_REFERRAL', points: 200, description: 'Referral reward – Zanele joined', occurredAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString() },
  { id: 'lt-04', customerId: 'cust-thando-001', type: 'REDEEMED', points: -320, description: 'Redeemed – $5 Off voucher', occurredAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString() },
]

const availableRewards: Reward[] = [
  { id: 'rwd-01', name: 'R5 Off Any Order', description: 'Discount on your next laundry order.', pointsCost: 500, value: 'R5', category: 'DISCOUNT', isAvailable: true },
  { id: 'rwd-02', name: 'Free Delivery', description: 'Free delivery on your next order.', pointsCost: 800, value: 'Free', category: 'FREE_DELIVERY', isAvailable: true },
  { id: 'rwd-03', name: 'Free Coffee', description: 'Complimentary LOAD coffee with your wash.', pointsCost: 300, value: '1 coffee', category: 'COFFEE', isAvailable: true },
  { id: 'rwd-04', name: 'Free Wash + Coffee', description: 'Full wash basket + a coffee, on us.', pointsCost: 1000, value: 'Combo', category: 'UPGRADE', isAvailable: false },
]

// ─── Mock route data ──────────────────────────────────────────────────────────

const mockRoute: Route = {
  id: 'route-2026-08-17',
  driverId: 'driver-01',
  driverName: 'Sipho Khumalo',
  date: '2026-08-17',
  totalStops: 12,
  totalOrders: 18,
  totalDistanceKm: 42.7,
  onTimePercent: 92,
  rating: 4.9,
  stops: [
    { id: 'stop-01', stopIndex: 1, orderId: 'LD10236', customerName: 'Sarah Johnson', addressLine: '123 Lynnwood Rd', suburb: 'Lynnwood, Pretoria', stopType: 'PICKUP', stopStatus: 'EN_ROUTE', distanceKm: 2.4, etaMinutes: 15, scheduledWindow: '09:00 – 11:00', customerInstructions: 'Please ring the bell and leave the order at the front door.', customerNotes: 'Gate code: 1234#. Please call if you can\'t find the house.', stopLabel: 'Next' },
    { id: 'stop-02', stopIndex: 2, orderId: 'LD10237', customerName: 'Michael Brown', addressLine: '456 Main Street', suburb: 'Hatfield', stopType: 'DELIVERY', stopStatus: 'PENDING', distanceKm: 4.1, etaMinutes: 18, scheduledWindow: '09:30 – 10:30' },
    { id: 'stop-03', stopIndex: 3, orderId: 'LD10238', customerName: 'The Green House (Hotel)', addressLine: '789 Justice Mahomed St', suburb: 'Arcadia', stopType: 'DELIVERY', stopStatus: 'PENDING', distanceKm: 6.3, etaMinutes: 22, scheduledWindow: '10:00 – 11:00' },
    { id: 'stop-04', stopIndex: 4, orderId: 'LD10239', customerName: 'Jessica Williams', addressLine: '321 Leyds St', suburb: 'Sunnyside', stopType: 'PICKUP', stopStatus: 'PENDING', distanceKm: 8.7, etaMinutes: 19, scheduledWindow: '10:30 – 12:00' },
    { id: 'stop-05', stopIndex: 5, orderId: 'LD10240', customerName: 'David Mokoena', addressLine: '55 Jorissen St', suburb: 'Braamfontein', stopType: 'DELIVERY', stopStatus: 'COMPLETED', distanceKm: 11.2, etaMinutes: 24, scheduledWindow: '11:00 – 12:00' },
    { id: 'stop-12', stopIndex: 12, orderId: 'LD10247', customerName: 'Emily Davis', addressLine: '900 Rivonia Rd', suburb: 'Sandton', stopType: 'PICKUP', stopStatus: 'PENDING', distanceKm: 42.7, etaMinutes: 50, scheduledWindow: '15:00 – 16:00' },
  ],
}

let routeMem = { ...mockRoute, stops: [...mockRoute.stops] }

// ─── Coffee offers ────────────────────────────────────────────────────────────

const coffeeOffers: CoffeeOffer[] = [
  { id: 'coffee-01', title: 'Free Coffee on Us', description: 'Add any wash order today and get a complimentary LOAD coffee.', ctaLabel: 'View Offer', ctaTarget: 'VIEW_OFFER', imageEmoji: '☕', isMemberOnly: false },
  { id: 'coffee-02', title: 'LOAD Pass Coffee Perk', description: 'Members get a free coffee with every Wash & Fold order.', ctaLabel: 'Explore Benefits', ctaTarget: 'EXPLORE_BENEFITS', imageEmoji: '🎁', isMemberOnly: true },
  { id: 'coffee-03', title: 'Free Coffee with Any Wash', description: 'Today only – redeem your loyalty points for a freshly brewed coffee.', ctaLabel: 'Redeem Reward', ctaTarget: 'REDEEM_REWARD', imageEmoji: '⭐', expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 8).toISOString(), isMemberOnly: false },
]

// ─── Helper ───────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

const notificationTemplates: Partial<Record<DomainEventType, Array<Omit<AppNotification, 'id' | 'createdAt' | 'isRead'>>>> = {
  DRIVER_ASSIGNED: [{ targetRole: 'CUSTOMER', type: 'DRIVER_ASSIGNED', title: 'Driver assigned', body: 'A driver has been assigned to your order.' }],
  DRIVER_EN_ROUTE: [{ targetRole: 'CUSTOMER', type: 'DRIVER_APPROACHING', title: 'Driver approaching', body: 'Your driver is en route.' }],
  DRIVER_ARRIVED: [{ targetRole: 'CUSTOMER', type: 'DRIVER_ARRIVED', title: 'Driver arrived', body: 'Your driver has arrived.' }],
  LAUNDRY_WEIGHT_CAPTURED: [{ targetRole: 'OPERATIONS', type: 'OPS_WEIGHT_CAPTURED', title: 'Weight captured', body: 'A weight capture has been recorded.' }],
  PRICE_RECALCULATED: [{ targetRole: 'CUSTOMER', type: 'PRICE_UPDATED', title: 'Price updated', body: 'Your final price has been recalculated from measured weight.' }],
  PAYMENT_REQUIRED: [{ targetRole: 'CUSTOMER', type: 'PAYMENT_REQUIRED', title: 'Payment required', body: 'Please complete payment to continue collection.' }],
  PAYMENT_CONFIRMED: [
    { targetRole: 'CUSTOMER', type: 'PAYMENT_CONFIRMED', title: 'Payment confirmed', body: 'Payment is complete.' },
    { targetRole: 'DRIVER', type: 'DRIVER_PAYMENT_CONFIRMED', title: 'Payment confirmed', body: 'Customer payment is confirmed. Proceed with collection.' },
    { targetRole: 'OPERATIONS', type: 'OPS_PAYMENT_CONFIRMED', title: 'Payment confirmed', body: 'Customer payment has been confirmed.' },
  ],
  ORDER_COLLECTED: [{ targetRole: 'OPERATIONS', type: 'OPS_WEIGHT_CAPTURED', title: 'Collection update', body: 'Driver marked order as collected.' }],
  DELIVERY_COMPLETED: [{ targetRole: 'CUSTOMER', type: 'DELIVERED', title: 'Delivered', body: 'Your order has been delivered.' }],
  DELIVERY_RESCHEDULED: [
    { targetRole: 'CUSTOMER', type: 'DELIVERY_RESCHEDULED', title: 'Delivery rescheduled', body: 'A new schedule will be shared shortly.' },
    { targetRole: 'OPERATIONS', type: 'OPS_DELIVERY_RESCHEDULED', title: 'Delivery rescheduled', body: 'A delivery stop was rescheduled.' },
  ],
}

const appendNotificationsForEvent = (eventType: DomainEventType, orderId: string) => {
  const templates = notificationTemplates[eventType]
  if (!templates) return
  const createdAt = new Date().toISOString()
  const next = templates.map((template, index) => ({
    id: `notif-${eventType}-${Date.now()}-${index}`,
    createdAt,
    isRead: false,
    orderId,
    ...template,
  })) as AppNotification[]
  notifMem = [...next, ...notifMem]
}

// ─── Notification service mock ────────────────────────────────────────────────

export const mockNotificationService: NotificationService = {
  async listNotifications(role) {
    await sleep(300)
    return notifMem.filter((n) => n.targetRole === role)
  },
  async markRead(notificationId) {
    await sleep(200)
    notifMem = notifMem.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
  },
  async markAllRead(role) {
    await sleep(250)
    notifMem = notifMem.map((n) => (n.targetRole === role ? { ...n, isRead: true } : n))
  },
}

export const mockDomainEventService: DomainEventService = {
  async emit(type, orderId, payload) {
    await sleep(120)
    const event: DomainEvent = {
      id: `evt-${type}-${Date.now()}`,
      type,
      orderId,
      occurredAt: new Date().toISOString(),
      payload,
      acknowledgedBy: [],
    }
    eventMem = [event, ...eventMem]
    appendNotificationsForEvent(type, orderId)
    return event
  },
  async listByOrder(orderId) {
    await sleep(100)
    return eventMem.filter((event) => event.orderId === orderId)
  },
}

// ─── Invoice service mock ─────────────────────────────────────────────────────

export const mockInvoiceService: InvoiceService = {
  async getInvoice(invoiceId) {
    await sleep(350)
    const inv = invoiceMem.find((i) => i.id === invoiceId)
    if (!inv) throw new Error(`Invoice ${invoiceId} not found.`)
    return inv
  },
  async listInvoicesForOrder(orderId) {
    await sleep(320)
    return invoiceMem.filter((i) => i.orderId === orderId)
  },
  async applyAdjustment(invoiceId, amount, reason) {
    await sleep(400)
    invoiceMem = invoiceMem.map((i) => {
      if (i.id !== invoiceId) return i
      const updated: Invoice = {
        ...i,
        adjustmentTotal: i.adjustmentTotal + amount,
        finalTotal: i.finalTotal + amount,
        status: 'ADJUSTED',
        updatedAt: new Date().toISOString(),
        lines: [
          ...i.lines,
          { id: `il-adj-${Date.now()}`, description: `Adjustment: ${reason}`, quantity: 1, unitPrice: amount, total: amount, lineType: 'ADJUSTMENT' },
        ],
      }
      return updated
    })
    const inv = invoiceMem.find((i) => i.id === invoiceId)
    if (!inv) throw new Error('Invoice not found.')
    return inv
  },
}

// ─── POS service mock (API contract pending) ──────────────────────────────────

/** @note POS API contract pending. This is a mock-only implementation. */
export const mockPosService: PosService = {
  async getQuote(orderId) {
    await sleep(400)
    return { quoteId: `quote-${orderId}`, amount: 248 }
  },
  async updateQuote(_quoteId, _amount) {
    await sleep(350)
    return { updated: true }
  },
  async createInvoice(orderId) {
    await sleep(500)
    const existing = invoiceMem.find((i) => i.orderId === orderId)
    if (existing) return existing
    const newInv: Invoice = {
      id: `inv-${orderId}`,
      invoiceNumber: `INV-2026-${orderId.replace('LD', '')}`,
      orderId,
      customerId: 'cust-thando-001',
      customerName: 'Customer',
      serviceLabel: 'Laundry service',
      lines: [],
      pickupFee: 0,
      deliveryFee: 45,
      subtotal: 169,
      adjustmentTotal: 0,
      discountTotal: 0,
      loyaltyRedemptionTotal: 0,
      taxTotal: 0,
      finalTotal: 214,
      status: 'ISSUED',
      paymentStatus: 'PENDING',
      posSyncStatus: 'SYNCED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    invoiceMem = [...invoiceMem, newInv]
    return newInv
  },
  async updateInvoice(invoiceId, updates) {
    await sleep(350)
    invoiceMem = invoiceMem.map((i) => i.id === invoiceId ? { ...i, ...updates, updatedAt: new Date().toISOString() } : i)
    const inv = invoiceMem.find((i) => i.id === invoiceId)
    if (!inv) throw new Error('Invoice not found.')
    return inv
  },
  async getInvoice(invoiceId) {
    await sleep(320)
    const inv = invoiceMem.find((i) => i.id === invoiceId)
    if (!inv) throw new Error(`Invoice ${invoiceId} not found.`)
    return inv
  },
  async getPaymentStatus(invoiceId) {
    await sleep(280)
    const inv = invoiceMem.find((i) => i.id === invoiceId)
    return { status: inv?.paymentStatus ?? 'UNKNOWN' }
  },
  async confirmPayment(invoiceId) {
    await sleep(500)
    const existing = invoiceMem.find((i) => i.id === invoiceId)
    invoiceMem = invoiceMem.map((i) =>
      i.id === invoiceId
        ? { ...i, status: 'PAID', paymentStatus: 'CONFIRMED', posSyncStatus: 'SYNCED', updatedAt: new Date().toISOString() }
        : i
    )
    if (existing) {
      await mockDomainEventService.emit('PAYMENT_CONFIRMED', existing.orderId, { invoiceId })
    }
    return { confirmed: true }
  },
  async syncOrderCharges(_orderId) {
    await sleep(600)
    return { synced: true, posSyncStatus: 'SYNCED' }
  },
}

// ─── Weight pricing service mock ──────────────────────────────────────────────

const PRICE_PER_KG = 22 // R22 / kg

export const mockWeightPricingService: WeightPricingService = {
  async calculateWeightPrice(_serviceId, weightKg) {
    await sleep(350)
    return { total: Math.round(weightKg * PRICE_PER_KG), unitPrice: PRICE_PER_KG }
  },
  async confirmWeight(orderId, measurement) {
    await sleep(400)
    const confirmed: WeightMeasurement = {
      ...measurement,
      id: `wm-${orderId}-${Date.now()}`,
      status: 'CONFIRMED',
    }
    return confirmed
  },
}

// ─── Route service mock ───────────────────────────────────────────────────────

export const mockRouteService: RouteService = {
  async getRoute(_driverId) {
    await sleep(380)
    return routeMem
  },
  async getStop(stopId) {
    await sleep(300)
    const stop = routeMem.stops.find((s) => s.id === stopId)
    if (!stop) throw new Error(`Stop ${stopId} not found.`)
    return stop
  },
  async updateStopStatus(stopId, status) {
    await sleep(300)
    routeMem = {
      ...routeMem,
      stops: routeMem.stops.map((s) =>
        s.id === stopId ? { ...s, stopStatus: status } : s
      ),
    }
    const stop = routeMem.stops.find((s) => s.id === stopId)
    if (!stop) throw new Error('Stop not found.')
    return stop
  },
  async optimiseRoute(stops) {
    await sleep(500)
    return stops
  },
}

// ─── Verification service mock ────────────────────────────────────────────────

export const mockVerificationService: VerificationService = {
  async initVerification(orderId, method) {
    await sleep(350)
    const attempt: VerificationAttempt = {
      id: `va-${orderId}-${Date.now()}`,
      orderId,
      method,
      status: 'AWAITING',
    }
    return attempt
  },
  async submitVerification(attemptId, code) {
    await sleep(600)
    const valid = code === '123456' || code.length === 6
    const attempt: VerificationAttempt = {
      id: attemptId,
      orderId: 'mock',
      method: 'OTP',
      status: valid ? 'VERIFIED' : 'INVALID',
    }
    return valid ? { ...attempt, verifiedAt: new Date().toISOString() } : attempt
  },
  async requestManualOverride(attemptId, _reason) {
    await sleep(300)
    const attempt: VerificationAttempt = {
      id: attemptId,
      orderId: 'mock',
      method: 'MANUAL_OVERRIDE',
      status: 'MANUAL_OVERRIDE_REQUESTED',
    }
    return attempt
  },
}

// ─── Loyalty service mock ─────────────────────────────────────────────────────

export const mockLoyaltyService: LoyaltyService = {
  async getAccount(customerId) {
    await sleep(320)
    const account: LoyaltyAccount = {
      customerId,
      tier: 'Silver',
      points: 1240,
      availableRewards: 3,
      loadBalance: 250,
      nextRewardThreshold: 1500,
      pointsToNextReward: 260,
    }
    return account
  },
  async getTransactions(customerId) {
    await sleep(340)
    return loyaltyTransactions.filter((t) => t.customerId === customerId)
  },
  async getRewards() {
    await sleep(300)
    return availableRewards
  },
  async redeemReward(_customerId, _rewardId) {
    await sleep(500)
    return { success: true, newBalance: 940 }
  },
}

// ─── Coffee service mock ──────────────────────────────────────────────────────

export const mockCoffeeService: CoffeeService = {
  async getOffers() {
    await sleep(280)
    return coffeeOffers
  },
}

// Re-export the mockRoute for direct access
export { mockRoute, routeMem }
export type { RouteStop }
