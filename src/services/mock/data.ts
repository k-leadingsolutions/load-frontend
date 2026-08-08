import { getFriendlyOrderStatus } from '@/domain/orderStatus'
import type {
  AddOnOption,
  BasketSize,
  CatalogService,
  CustomerProfile,
  DashboardMetric,
  DriverAssignment,
  LaundryOrder,
  LoyaltyRule,
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
]

export const mockServices: CatalogService[] = [
  { id: 'svc-basket-12kg', categoryId: 'wash-fold', name: 'Wash & Fold', shortDescription: 'Fast everyday laundry', turnaroundLabel: '24-hour standard', pricingMode: 'PAY_PER_BASKET', basePrice: 169, unitLabel: '12kg basket', featured: true },
  { id: 'svc-dry-clean-shirt', categoryId: 'dry-clean', name: 'Dry Clean Shirts', shortDescription: 'Pressed and ready for work', turnaroundLabel: '48-hour premium', pricingMode: 'PAY_PER_ITEM', basePrice: 45, unitLabel: 'shirt', featured: true },
  { id: 'svc-iron-only', categoryId: 'wash-fold', name: 'Ironing', shortDescription: 'Crisp finishing service', turnaroundLabel: 'Next-day', pricingMode: 'PAY_PER_ITEM', basePrice: 18, unitLabel: 'item', featured: true },
  { id: 'svc-rug-clean', categoryId: 'home-care', name: 'Rug Cleaning', shortDescription: 'Deep clean for rugs and runners', turnaroundLabel: '3-day specialty', pricingMode: 'PAY_PER_ITEM', basePrice: 220, unitLabel: 'rug', featured: false },
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
    loyaltyPointsEarned: 120,
    promotionsApplied: [],
    internalNotes: [],
    canRepeat: true,
  },
]

export const mockProductionOrders: ProductionOrder[] = [
  { id: 'LD10235', customerName: 'Thando Mokoena', suburb: 'Morningside', status: 'WASHING', stageLabel: 'Washing', qualityCheckPending: false },
  { id: 'LD10233', customerName: 'Anele Dlamini', suburb: 'Parkhurst', status: 'QUALITY_CHECK', stageLabel: 'Quality check', qualityCheckPending: true },
  { id: 'LD10231', customerName: 'Kea Ndlovu', suburb: 'Bryanston', status: 'READY_FOR_DISPATCH', stageLabel: 'Ready for dispatch', qualityCheckPending: false },
]

export const mockDriverAssignments: DriverAssignment[] = [
  { id: 'run-01', driverName: 'Sipho Khumalo', area: 'Sandton North', scheduledWindow: '09:00 - 11:00', stopType: 'PICKUP', orderId: 'LD10236', customerName: 'Naledi Molefe', addressLine: '7 Gwen Lane, Sandown' },
  { id: 'run-02', driverName: 'Sipho Khumalo', area: 'Rosebank Loop', scheduledWindow: '14:00 - 16:00', stopType: 'DELIVERY', orderId: 'LD10235', customerName: 'Thando Mokoena', addressLine: '18 West Road South, Morningside' },
]

export const mockDashboardMetrics: DashboardMetric[] = [
  { id: 'rev', label: 'Today revenue', value: 'R18,420.00', changeLabel: '+12% vs yesterday' },
  { id: 'orders', label: 'Active orders', value: '84', changeLabel: '12 in production' },
  { id: 'sla', label: 'On-time delivery', value: '97.4%', changeLabel: 'Premium service target' },
]
