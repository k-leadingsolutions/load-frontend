import type {
  DashboardMetricsResponse,
  DriverAssignmentResponse,
  ProductionOrderResponse,
  DriverAssignmentsResponse,
  DriverProfileResponse,
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
import type {
  AppNotification,
  ApplePayPaymentRequest,
  CardPaymentRequest,
  CreatePaymentRequest,
  DriverMessage,
  Invoice,
  MessageChannel,
  Route,
  RouteStop,
  RescheduleReason,
  VerificationMethod,
  VerificationAttempt,
  WeightMeasurement,
  Reward,
  LoyaltyAccount,
  LoyaltyTransaction,
  DomainEvent,
  DomainEventType,
  PaymentResult,
} from '@/domain/models'

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthService {
  login(request: LoginRequest): Promise<CustomerProfileResponse>
  register(request: RegisterRequest): Promise<CustomerProfileResponse>
  getProfile(): Promise<CustomerProfileResponse>
  sendOtp(mobileNumber: string): Promise<{ success: boolean }>
  verifyOtp(mobileNumber: string, code: string): Promise<{ valid: boolean }>
  forgotPassword(emailOrMobile: string): Promise<{ sent: boolean }>
  resetPassword(token: string, newPassword: string): Promise<{ success: boolean }>
  biometricLogin(credential: string): Promise<CustomerProfileResponse>
}

// ─── Catalogue ────────────────────────────────────────────────────────────────

export interface CatalogueService {
  getCatalogue(): Promise<ServiceCatalogueResponse>
  getQuote(request: QuoteRequest): Promise<PricingQuoteResponse>
}

// ─── Customer orders ──────────────────────────────────────────────────────────

export interface CustomerOrderService {
  listOrders(customerId: string): Promise<CustomerOrdersResponse>
  getOrder(orderId: string): Promise<CustomerOrderResponse>
  placeOrder(request: PlaceOrderRequest): Promise<CustomerOrderResponse>
}

export interface PaymentService {
  createPayment(request: CreatePaymentRequest): Promise<PaymentResult>
  processApplePay(request: ApplePayPaymentRequest): Promise<PaymentResult>
  processCardPayment(request: CardPaymentRequest): Promise<PaymentResult>
  getPaymentStatus(paymentId: string): Promise<PaymentResult>
}

// ─── Weight pricing ───────────────────────────────────────────────────────────

export interface WeightPricingService {
  calculateWeightPrice(serviceId: string, weightKg: number): Promise<{ total: number; unitPrice: number }>
  confirmWeight(orderId: string, measurement: Omit<WeightMeasurement, 'id'>): Promise<WeightMeasurement>
}

// ─── POS (read-only integration boundary — API contract pending) ─────────────

/**
 * Strictly READ-ONLY boundary onto the store-side POS system.
 *
 * HARD ARCHITECTURAL RULE: LOAD never creates, updates, or deletes POS
 * records. Store staff own the commercial transaction, physical tag, and
 * final invoice inside the POS after physical intake. This interface must
 * never gain a create-, update-, delete-, confirm-, or sync-style mutation
 * method — see the PosReadService contract test in
 * `src/services/pos/posReadService.test.ts`.
 *
 * @note POS vendor API contract pending. Production implementation blocked
 * until the vendor provides a spec; this is a mock-only read boundary that
 * the future Spring Boot backend will implement for real.
 */
export interface PosReadService {
  getOrderIntakeStatus(loadOrderId: string): Promise<import('@/services/pos/posContracts').PosVendorOrderRecord | null>
  getInvoiceForOrder(loadOrderId: string): Promise<import('@/services/pos/posContracts').PosVendorInvoiceRecord | null>
  getCustomerRewards(customerId: string): Promise<import('@/services/pos/posContracts').PosVendorRewardsSummary | null>
}

// ─── Invoice ─────────────────────────────────────────────────────────────────

export interface InvoiceService {
  getInvoice(invoiceId: string): Promise<Invoice>
  listInvoicesForOrder(orderId: string): Promise<Invoice[]>
  applyAdjustment(invoiceId: string, amount: number, reason: string): Promise<Invoice>
  /**
   * Marks a LOAD-owned invoice record as paid after a successful online
   * payment. This mutates LOAD's own cached Invoice representation only —
   * it never calls the POS system, which remains authoritative for the
   * store-side commercial transaction and is never written to by LOAD.
   */
  markPaid(invoiceId: string): Promise<Invoice>
}

// ─── Operations ───────────────────────────────────────────────────────────────

export interface OperationsService {
  listProductionOrders(): Promise<ProductionOrdersResponse>
  getProductionOrder(orderId: string): Promise<ProductionOrderResponse>
  confirmLaundryReceived(orderId: string): Promise<ProductionOrderResponse>
  /**
   * Records LOAD-owned physical intake information (actual weight, item
   * count, inspection notes). This is operational visibility only — it is
   * never used to calculate or finalise the commercial invoice, which
   * remains POS-owned.
   */
  recordStoreIntake(orderId: string, intake: StoreIntakeInput): Promise<ProductionOrderResponse>
  /**
   * Refreshes LOAD's invoice projection for this order from the read-only
   * POS boundary. Never fabricates a total: if POS has no invoice yet, the
   * order's existing `NOT_AVAILABLE` projection is left untouched; a POS
   * outage never blocks or corrupts the rest of the operational workflow.
   */
  refreshInvoice(orderId: string): Promise<ProductionOrderResponse>
  updateQuantityReview(orderId: string, status: 'CONFIRMED' | 'ADJUSTED'): Promise<ProductionOrderResponse>
  addInternalNote(orderId: string, note: string): Promise<ProductionOrderResponse>
  advanceProductionStage(orderId: string): Promise<ProductionOrderResponse>
  getMetrics(): Promise<DashboardMetricsResponse>
  assignDriver(orderId: string, driverId: string): Promise<ProductionOrderResponse>
  /** Read-only visibility into ordered Driver stops for Operations coordination (reschedule review, failed-attempt handling). */
  listDriverAssignments(): Promise<DriverAssignmentsResponse>
  performQC(orderId: string, result: QCResult): Promise<ProductionOrderResponse>
  /**
   * Moves a READY_FOR_DISPATCH DELIVERY order out for delivery. Enforces
   * `isEligibleForDispatch()` (invoice READY + payment CONFIRMED) — Operations
   * cannot override financial truth to force an ineligible dispatch.
   */
  dispatchForDelivery(orderId: string): Promise<ProductionOrderResponse>
  /** Marks a READY_FOR_DISPATCH STORE_COLLECTION order as collected/completed. No Driver delivery assignment is involved. */
  completeStoreCollection(orderId: string): Promise<ProductionOrderResponse>
  /** Operations retains final scheduling authority over a Driver reschedule request. */
  reviewRescheduleRequest(assignmentId: string, decision: 'APPROVED' | 'REJECTED', note?: string): Promise<DriverAssignmentResponse>
  /** Re-dispatches a FAILED stop through the normal ASSIGNED entry point — never bypasses Driver transition guards. */
  retryFailedAttempt(assignmentId: string): Promise<DriverAssignmentResponse>
}

export interface StoreIntakeInput {
  weightKg?: number
  itemCount?: number
  notes?: string
}

export interface QCResult {
  passed: boolean
  notes?: string
  requiresRewash?: boolean
  requiresReironing?: boolean
  damageNote?: string
  stainNote?: string
  packingIssue?: boolean
}

// ─── Driver ───────────────────────────────────────────────────────────────────

export interface DriverAuthService {
  login(request: LoginRequest): Promise<DriverProfileResponse>
}

export interface DriverService {
  listAssignments(): Promise<DriverAssignmentsResponse>
  confirmEnRoute(assignmentId: string): Promise<DriverAssignmentResponse>
  confirmArrival(assignmentId: string): Promise<DriverAssignmentResponse>
  confirmCollection(assignmentId: string): Promise<DriverAssignmentResponse>
  confirmDelivery(assignmentId: string, proofOfDelivery: string): Promise<DriverAssignmentResponse>
  recordFailure(assignmentId: string, reason: RescheduleReason, note?: string): Promise<DriverAssignmentResponse>
  requestReschedule(stopId: string, reason: RescheduleReason, note?: string): Promise<DriverAssignmentResponse>
  verifyStop(stopId: string, method: VerificationMethod, code?: string): Promise<VerificationAttempt>
}

// ─── Driver messaging (smallest viable Driver <-> Customer / Operations) ──────

export interface DriverMessageService {
  listMessages(stopId: string): Promise<DriverMessage[]>
  sendMessage(input: { stopId: string; orderId: string; channel: MessageChannel; body: string }): Promise<DriverMessage>
}

// ─── Delivery ─────────────────────────────────────────────────────────────────

export interface DeliveryService {
  getUpcomingDeliveries(): Promise<RouteStop[]>
  scheduleDelivery(orderId: string, window: string): Promise<{ scheduled: boolean }>
  rescheduleDelivery(orderId: string, newWindow: string, reason: RescheduleReason): Promise<{ rescheduled: boolean }>
  recordFailedDelivery(orderId: string, reason: string): Promise<{ recorded: boolean }>
}

// ─── Route ────────────────────────────────────────────────────────────────────

/** @note Production maps / route optimisation not integrated yet. Mock only. */
export interface RouteService {
  getRoute(driverId: string): Promise<Route>
  getStop(stopId: string): Promise<RouteStop>
  updateStopStatus(stopId: string, status: RouteStop['stopStatus']): Promise<RouteStop>
  optimiseRoute(stops: RouteStop[]): Promise<RouteStop[]>
}

// ─── Verification ─────────────────────────────────────────────────────────────

export interface VerificationService {
  initVerification(orderId: string, method: VerificationMethod): Promise<VerificationAttempt>
  submitVerification(attemptId: string, code: string): Promise<VerificationAttempt>
  requestManualOverride(attemptId: string, reason: string): Promise<VerificationAttempt>
}

// ─── Notifications ────────────────────────────────────────────────────────────

export interface NotificationService {
  listNotifications(role: AppNotification['targetRole']): Promise<AppNotification[]>
  markRead(notificationId: string): Promise<void>
  markAllRead(role: AppNotification['targetRole']): Promise<void>
}

// ─── Loyalty ──────────────────────────────────────────────────────────────────

export interface LoyaltyService {
  getAccount(customerId: string): Promise<LoyaltyAccount>
  getTransactions(customerId: string): Promise<LoyaltyTransaction[]>
  getRewards(): Promise<Reward[]>
  redeemReward(customerId: string, rewardId: string): Promise<{ success: boolean; newBalance: number }>
}

// ─── Coffee ───────────────────────────────────────────────────────────────────

export interface CoffeeService {
  getOffers(): Promise<import('@/domain/models').CoffeeOffer[]>
}

export interface DomainEventService {
  emit(type: DomainEventType, orderId: string, payload?: Record<string, unknown>): Promise<DomainEvent>
  listByOrder(orderId: string): Promise<DomainEvent[]>
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export interface AdminService {
  getMetrics(): Promise<DashboardMetricsResponse>
}
