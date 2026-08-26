import { getFriendlyOrderStatus } from '@/domain/orderStatus'
import type {
  BasketSize,
  CustomerProfile,
  DashboardMetric,
  DeliveryZone,
  DriverAssignment,
  LaundryOrder,
  LoyaltyRule,
  ManagedUser,
  ProductionOrder,
  Promotion,
} from '@/domain/models'
import type { CatalogService, ServiceCategory } from '@/domain/models/service'
import {
  approvedAddOns,
  approvedCategories,
  approvedLaundryServices,
} from '@/services/mock/approvedLaundryCatalogue'

const primaryAddress = {
  id: 'addr-sandton-1',
  label: 'Home',
  line1: '18 West Road South',
  suburb: 'Morningside',
  city: 'Sandton',
  province: 'Gauteng',
  postalCode: '2057',
  deliveryInstructions: 'Security desk will call on arrival.',
  isDefault: true,
} as const

export const mockCustomerProfile: CustomerProfile = {
  id: 'cust-thando-001',
  firstName: 'Thando',
  lastName: 'Mokoena',
  mobileNumber: '+27 82 555 0142',
  email: 'thando.mokoena@load.co.za',
  role: 'CUSTOMER',
  defaultAddressId: primaryAddress.id,
  addresses: [
    primaryAddress,
    {
      id: 'addr-rosebank-2',
      label: 'Office',
      line1: '177 Oxford Road',
      suburb: 'Rosebank',
      city: 'Johannesburg',
      province: 'Gauteng',
      postalCode: '2196',
    },
  ],
  loyalty: {
    tier: 'Silver',
    points: 1240,
    availableRewards: 3,
    loadBalance: 250,
  },
}

export const mockCategories: ServiceCategory[] = [
  // ── Approved laundry categories ──────────────────────────────────────────
  ...approvedCategories,
  // ── Coffee category — PLACEHOLDER, pricing not yet approved ─────────────
  // Keep isolated so laundry module sign-off is not blocked by pending coffee menu.
  {
    id: 'coffee',
    name: 'LOAD Coffee',
    description: 'Freshly roasted single-origin beans delivered to your door.',
    tagline: 'Coming soon',
    startingPriceLabel: 'Pending',
    accent: 'bg-amber-100 text-amber-800',
    icon: '☕',
    isFeatured: false,
  },
]

export const mockServices: CatalogService[] = [
  // ── Approved laundry services (sourced from approvedLaundryCatalogue.ts) ──
  ...approvedLaundryServices,
  // ── Coffee services — PLACEHOLDER ONLY, pricing not yet approved ──────────
  // These items must NOT be treated as production-ready pricing.
  // Do not use these prices in customer-facing laundry totals.
  { id: 'svc-coffee-espresso', categoryId: 'coffee', name: 'Espresso Blend', shortDescription: 'Bold, rich South African roast', turnaroundLabel: 'Same-day delivery', pricingMode: 'PAY_PER_ITEM', pricingModel: 'FIXED_SERVICE', basePrice: 0, unitLabel: '250g bag', isStartingPrice: false, loadPassEligible: false, featured: false },
  { id: 'svc-coffee-filter', categoryId: 'coffee', name: 'Filter Roast', shortDescription: 'Light, fruity single-origin', turnaroundLabel: 'Same-day delivery', pricingMode: 'PAY_PER_ITEM', pricingModel: 'FIXED_SERVICE', basePrice: 0, unitLabel: '250g bag', isStartingPrice: false, loadPassEligible: false, featured: false },
  { id: 'svc-coffee-capsules', categoryId: 'coffee', name: 'Coffee Capsules', shortDescription: 'Compatible with Nespresso machines', turnaroundLabel: 'Same-day delivery', pricingMode: 'PAY_PER_ITEM', pricingModel: 'FIXED_SERVICE', basePrice: 0, unitLabel: '10-pack', isStartingPrice: false, loadPassEligible: false, featured: false },
]

// ─── Re-export approved add-ons as mockAddOns for backward-compat consumers ───
export { approvedAddOns as mockAddOns }

// ─── Basket sizes — preserved as future-ready infrastructure, NOT used in ─────
// the active customer booking flow.  Do not expose to customers.           ─────
export const mockBasketSizes: BasketSize[] = [
  { id: 'basket-8kg', name: 'Small Basket', capacityLabel: '8kg', price: 0, recommendedFor: 'Future use only — not active' },
  { id: 'basket-12kg', name: 'Standard Basket', capacityLabel: '12kg', price: 0, recommendedFor: 'Future use only — not active' },
  { id: 'basket-18kg', name: 'Large Basket', capacityLabel: '18kg', price: 0, recommendedFor: 'Future use only — not active' },
]

export const mockPromotions: Promotion[] = [
  { code: 'FIRSTLOAD', name: 'First Order Offer', description: 'Save 15% on your first order.', discountType: 'PERCENTAGE', value: 15, firstOrderOnly: true },
  { code: 'FREEDROP', name: 'Free Delivery', description: 'Free delivery on orders above R300.', discountType: 'FREE_DELIVERY', value: 0, minimumOrderAmount: 300 },
]

export const mockLoyaltyRules: LoyaltyRule[] = [
  { id: 'loyalty-standard', description: 'Earn 5 points for every R1 spent.', earnRate: 5, redemptionValue: 1 },
]

export const mockOrders: LaundryOrder[] = [
  {
    id: 'LD10235',
    customerId: mockCustomerProfile.id,
    status: 'WASHING',
    friendlyStatus: getFriendlyOrderStatus('WASHING'),
    pickupWindow: { date: '2026-08-08', windowLabel: 'Today, 09:00 - 11:00' },
    deliveryWindow: { date: '2026-08-08', windowLabel: 'Today, 14:00 - 16:00' },
    pickupAddress: { ...primaryAddress },
    deliveryAddress: { ...primaryAddress },
    services: [{ serviceId: 'ev-wash-dry-fold', quantity: 9, unitLabel: 'kg' }],
    estimatedTotal: 420,
    confirmedTotal: 420,
    confirmedWeightKg: 9.4,
    paymentStatus: 'CONFIRMED',
    invoiceId: 'inv-LD10235',
    loyaltyPointsEarned: 1240,
    promotionsApplied: ['FIRSTLOAD'],
    internalNotes: ['Handle white shirts separately.'],
    canRepeat: false,
  },
  {
    id: 'LD10234',
    customerId: mockCustomerProfile.id,
    status: 'DELIVERED',
    friendlyStatus: getFriendlyOrderStatus('DELIVERED'),
    pickupWindow: { date: '2026-08-01', windowLabel: 'Fri, 09:00 - 11:00' },
    deliveryWindow: { date: '2026-08-01', windowLabel: 'Fri, 14:00 - 16:00' },
    pickupAddress: { ...primaryAddress },
    deliveryAddress: { ...primaryAddress },
    services: [{ serviceId: 'dc-shirt-blouse', quantity: 3, unitLabel: 'items' }],
    estimatedTotal: 420,
    paymentStatus: 'CONFIRMED',
    loyaltyPointsEarned: 120,
    promotionsApplied: [],
    internalNotes: [],
    canRepeat: true,
  },
]

export const mockProductionOrders: ProductionOrder[] = [
  {
    id: 'LD10235',
    customerName: 'Thando Mokoena',
    suburb: 'Morningside',
    status: 'WASHING',
    stageLabel: 'Washing',
    qualityCheckPending: false,
    internalNotes: ['Handle white shirts separately.'],
    itemsSummary: ['9 kg × Wash + Dry + Fold', '1 × Express turnaround'],
    quantityReviewStatus: 'CONFIRMED',
    receivedAtStore: true,
    authorisedAdjustmentAllowed: true,
  },
  {
    id: 'LD10233',
    customerName: 'Anele Dlamini',
    suburb: 'Parkhurst',
    status: 'QUALITY_CHECK',
    stageLabel: 'Quality check',
    qualityCheckPending: true,
    internalNotes: ['Customer requested extra stain care on cuffs.'],
    itemsSummary: ['3 × Dry Clean Shirts', '6 × Ironing'],
    quantityReviewStatus: 'ADJUSTED',
    receivedAtStore: true,
    authorisedAdjustmentAllowed: true,
  },
  {
    id: 'LD10231',
    customerName: 'Kea Ndlovu',
    suburb: 'Bryanston',
    status: 'BOOKING_RECEIVED',
    stageLabel: 'Booking received',
    qualityCheckPending: false,
    internalNotes: ['Dispatch after 16:00 gate access opens.'],
    itemsSummary: ['1 × Rug Cleaning'],
    quantityReviewStatus: 'PENDING',
    receivedAtStore: false,
    authorisedAdjustmentAllowed: false,
  },
]

export const mockDriverAssignments: DriverAssignment[] = [
  {
    id: 'run-01',
    driverName: 'Sipho Khumalo',
    area: 'Sandton North',
    scheduledWindow: '09:00 - 11:00',
    stopType: 'PICKUP',
    stopStatus: 'ASSIGNED',
    verificationMethod: 'OTP',
    verificationStatus: 'AWAITING',
    paymentStatus: 'AWAITING_PAYMENT',
    requiresWeightCapture: true,
    orderId: 'LD10236',
    customerName: 'Naledi Molefe',
    addressLine: '7 Gwen Lane, Sandown',
    customerInstructions: 'Please call from the gate on arrival.',
  },
  {
    id: 'run-02',
    driverName: 'Sipho Khumalo',
    area: 'Rosebank Loop',
    scheduledWindow: '14:00 - 16:00',
    stopType: 'DELIVERY',
    stopStatus: 'ARRIVED',
    verificationMethod: 'QR_CODE',
    verificationStatus: 'AWAITING',
    paymentStatus: 'PAYMENT_CONFIRMED',
    requiresWeightCapture: false,
    orderId: 'LD10235',
    customerName: 'Thando Mokoena',
    addressLine: '18 West Road South, Morningside',
    customerInstructions: 'Leave with security desk if customer is in a meeting.',
  },
]

export const mockDashboardMetrics: DashboardMetric[] = [
  { id: 'rev', label: 'Today revenue', value: 'R18,420.00', changeLabel: '+12% vs yesterday' },
  { id: 'orders', label: 'Active orders', value: '84', changeLabel: '12 in production' },
  { id: 'sla', label: 'On-time delivery', value: '97.4%', changeLabel: 'Premium service target' },
]

export const mockCustomerProfiles: CustomerProfile[] = [
  mockCustomerProfile,
  {
    id: 'cust-zanele-002',
    firstName: 'Zanele',
    lastName: 'Pillay',
    mobileNumber: '+27 83 444 0188',
    email: 'zanele.pillay@load.co.za',
    role: 'CUSTOMER',
    defaultAddressId: 'addr-umhlanga-1',
    addresses: [
      {
        id: 'addr-umhlanga-1',
        label: 'Home',
        line1: '8 Lighthouse Road',
        suburb: 'Umhlanga',
        city: 'Durban',
        province: 'KwaZulu-Natal',
        postalCode: '4319',
        isDefault: true,
      },
    ],
    loyalty: {
      tier: 'Gold',
      points: 2860,
      availableRewards: 2,
      loadBalance: 420,
    },
  },
  {
    id: 'cust-ayabonga-003',
    firstName: 'Ayabonga',
    lastName: 'Jacobs',
    mobileNumber: '+27 84 333 0191',
    email: 'ayabonga.jacobs@load.co.za',
    role: 'CUSTOMER',
    defaultAddressId: 'addr-claremont-1',
    addresses: [
      {
        id: 'addr-claremont-1',
        label: 'Apartment',
        line1: '33 Main Road',
        suburb: 'Claremont',
        city: 'Cape Town',
        province: 'Western Cape',
        postalCode: '7708',
        isDefault: true,
      },
    ],
    loyalty: {
      tier: 'Silver',
      points: 840,
      availableRewards: 1,
      loadBalance: 95,
    },
  },
]

export const mockManagedUsers: ManagedUser[] = [
  { id: 'admin-01', name: 'Lebo Nkosi', role: 'ADMIN', status: 'ACTIVE', detail: 'Head of operations' },
  { id: 'driver-01', name: 'Sipho Khumalo', role: 'DRIVER', status: 'ACTIVE', detail: 'Sandton North route' },
  { id: 'driver-02', name: 'Aisha Peters', role: 'DRIVER', status: 'OFF_SHIFT', detail: 'Southern suburbs route' },
  { id: 'employee-01', name: 'Anele Dlamini', role: 'EMPLOYEE', status: 'ACTIVE', detail: 'Quality control lead' },
  { id: 'employee-02', name: 'Kea Ndlovu', role: 'EMPLOYEE', status: 'INVITED', detail: 'Dispatch coordinator' },
]

export const mockDeliveryZones: DeliveryZone[] = [
  { id: 'zone-sandton', name: 'Sandton Core', fee: 45, freeDeliveryThreshold: 300, active: true },
  { id: 'zone-rosebank', name: 'Rosebank & Parkhurst', fee: 55, freeDeliveryThreshold: 320, active: true },
  { id: 'zone-durban-north', name: 'Durban North', fee: 75, freeDeliveryThreshold: 450, active: false },
]
