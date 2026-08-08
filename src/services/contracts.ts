import type { ApiResponse } from '@/domain/api'
import type {
  CustomerProfile,
  DashboardMetric,
  DriverAssignment,
  LaundryOrder,
  PricingQuote,
  ProductionOrder,
  ServiceCategory,
  CatalogService,
  AddOnOption,
  BasketSize,
  Promotion,
  LoyaltyRule,
} from '@/domain/models'

export interface LoginRequest {
  mobileNumber: string
  password: string
}

export interface RegisterRequest {
  firstName: string
  lastName: string
  mobileNumber: string
  email: string
  password: string
}

export interface PlaceOrderRequest {
  customerId: string
  basketSizeId?: string
  serviceSelections: Array<{ serviceId: string; quantity: number }>
  addOnSelections: Array<{ addOnId: string; quantity: number }>
  pickupAddressId: string
  deliveryAddressId: string
  pickupWindow: string
  deliveryWindow: string
  promotionCode?: string
  useLoyaltyPoints?: boolean
}

export interface QuoteRequest {
  basketSizeId?: string
  basketQuantity?: number
  serviceSelections: Array<{ serviceId: string; quantity: number }>
  addOnSelections: Array<{ addOnId: string; quantity: number }>
  promotionCode?: string
  expressRequested: boolean
  useLoyaltyPoints?: boolean
}

export type CustomerProfileResponse = ApiResponse<CustomerProfile>
export type CustomerOrdersResponse = ApiResponse<LaundryOrder[]>
export type CustomerOrderResponse = ApiResponse<LaundryOrder>
export type PricingQuoteResponse = ApiResponse<PricingQuote>
export type ServiceCatalogueResponse = ApiResponse<{
  categories: ServiceCategory[]
  services: CatalogService[]
  addOns: AddOnOption[]
  basketSizes: BasketSize[]
  promotions: Promotion[]
  loyaltyRules: LoyaltyRule[]
}>
export type ProductionOrdersResponse = ApiResponse<ProductionOrder[]>
export type DriverAssignmentsResponse = ApiResponse<DriverAssignment[]>
export type DashboardMetricsResponse = ApiResponse<DashboardMetric[]>
