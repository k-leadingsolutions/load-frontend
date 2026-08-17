import { getFriendlyOrderStatus } from '@/domain/orderStatus'
import type {
  AddOnOption,
  BasketSize,
  CatalogService,
  CustomerProfile,
  DashboardMetric,
  DeliveryZone,
  DriverAssignment,
  LaundryOrder,
  LoyaltyRule,
  ManagedUser,
  ProductionOrder,
  Promotion,
  ServiceCategory,
} from '@/domain/models'

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
  { id: 'wash-fold', name: 'Wash & Fold', description: 'Clean, fresh, and folded everyday laundry.', accent: 'bg-load-100 text-load-700', isFeatured: true },
  { id: 'dry-clean', name: 'Dry Cleaning', description: 'Premium garment care for delicate fabrics.', accent: 'bg-slate-100 text-slate-700', isFeatured: true },
  { id: 'home-care', name: 'Home Care', description: 'Rugs, linens, duvets, and specialty home items.', accent: 'bg-cyan-100 text-cyan-700', isFeatured: false },
  { id: 'coffee', name: 'LOAD Coffee', description: 'Freshly roasted single-origin beans delivered to your door.', accent: 'bg-amber-100 text-amber-800', isFeatured: true },
]

export const mockServices: CatalogService[] = [
  { id: 'svc-basket-12kg', categoryId: 'wash-fold', name: 'Wash & Fold', shortDescription: 'Fast everyday laundry', turnaroundLabel: '24-hour standard', pricingMode: 'PAY_PER_BASKET', basePrice: 169, unitLabel: '12kg basket', featured: true },
  { id: 'svc-dry-clean-shirt', categoryId: 'dry-clean', name: 'Dry Clean Shirts', shortDescription: 'Pressed and ready for work', turnaroundLabel: '48-hour premium', pricingMode: 'PAY_PER_ITEM', basePrice: 45, unitLabel: 'shirt', featured: true },
  { id: 'svc-iron-only', categoryId: 'wash-fold', name: 'Ironing', shortDescription: 'Crisp finishing service', turnaroundLabel: 'Next-day', pricingMode: 'PAY_PER_ITEM', basePrice: 18, unitLabel: 'item', featured: true },
  { id: 'svc-rug-clean', categoryId: 'home-care', name: 'Rug Cleaning', shortDescription: 'Deep clean for rugs and runners', turnaroundLabel: '3-day specialty', pricingMode: 'PAY_PER_ITEM', basePrice: 220, unitLabel: 'rug', featured: false },
  { id: 'svc-coffee-espresso', categoryId: 'coffee', name: 'Espresso Blend', shortDescription: 'Bold, rich South African roast', turnaroundLabel: 'Same-day delivery', pricingMode: 'PAY_PER_ITEM', basePrice: 120, unitLabel: '250g bag', featured: true },
  { id: 'svc-coffee-filter', categoryId: 'coffee', name: 'Filter Roast', shortDescription: 'Light, fruity single-origin', turnaroundLabel: 'Same-day delivery', pricingMode: 'PAY_PER_ITEM', basePrice: 135, unitLabel: '250g bag', featured: true },
  { id: 'svc-coffee-capsules', categoryId: 'coffee', name: 'Coffee Capsules', shortDescription: 'Compatible with Nespresso machines', turnaroundLabel: 'Same-day delivery', pricingMode: 'PAY_PER_ITEM', basePrice: 85, unitLabel: '10-pack', featured: true },
]

export const mockAddOns: AddOnOption[] = [
  { id: 'addon-express', name: 'Express turnaround', description: 'Priority same-day processing where available.', price: 79, suggestionTag: 'Top seller' },
  { id: 'addon-fragrance-free', name: 'Fragrance-free wash', description: 'Sensitive-care detergent selection.', price: 25 },
  { id: 'addon-stain-care', name: 'Stain treatment', description: 'Targeted pre-treatment for marks and spills.', price: 35, suggestionTag: 'Suggested add-on' },
]

export const mockBasketSizes: BasketSize[] = [
  { id: 'basket-8kg', name: 'Small Basket', capacityLabel: '8kg', price: 129, recommendedFor: '1-2 people' },
  { id: 'basket-12kg', name: 'Standard Basket', capacityLabel: '12kg', price: 169, recommendedFor: 'Family weekly load' },
  { id: 'basket-18kg', name: 'Large Basket', capacityLabel: '18kg', price: 239, recommendedFor: 'Bulk household loads' },
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
    services: [{ serviceId: 'svc-basket-12kg', quantity: 1, unitLabel: '12kg basket' }],
    estimatedTotal: 248,
    confirmedTotal: 248,
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
    services: [{ serviceId: 'svc-dry-clean-shirt', quantity: 3, unitLabel: 'shirts' }],
    estimatedTotal: 180,
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
    itemsSummary: ['1 × Standard basket', '1 × Express turnaround'],
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
