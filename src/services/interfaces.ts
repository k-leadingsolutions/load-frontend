import type {
  DashboardMetricsResponse,
  DriverAssignmentsResponse,
  LoginRequest,
  PlaceOrderRequest,
  PricingQuoteResponse,
  ProductionOrdersResponse,
  QuoteRequest,
  RegisterRequest,
  ServiceCatalogueResponse,
  CustomerOrderResponse,
  CustomerOrdersResponse,
  CustomerProfileResponse,
} from '@/services/contracts'

export interface AuthService {
  login(request: LoginRequest): Promise<CustomerProfileResponse>
  register(request: RegisterRequest): Promise<CustomerProfileResponse>
  getProfile(): Promise<CustomerProfileResponse>
}

export interface CatalogueService {
  getCatalogue(): Promise<ServiceCatalogueResponse>
  getQuote(request: QuoteRequest): Promise<PricingQuoteResponse>
}

export interface CustomerOrderService {
  listOrders(customerId: string): Promise<CustomerOrdersResponse>
  getOrder(orderId: string): Promise<CustomerOrderResponse>
  placeOrder(request: PlaceOrderRequest): Promise<CustomerOrderResponse>
}

export interface OperationsService {
  listProductionOrders(): Promise<ProductionOrdersResponse>
}

export interface DriverService {
  listAssignments(): Promise<DriverAssignmentsResponse>
}

export interface AdminService {
  getMetrics(): Promise<DashboardMetricsResponse>
}
