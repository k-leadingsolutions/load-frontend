import { SectionCard } from '@/components/ui/SectionCard'
import { ProductRouteTable } from '@/features/foundation/components/ProductRouteTable'
import {
  BacklogList,
  DesignSystemList,
  FolderStructureList,
  ScreenInventoryList,
} from '@/features/foundation/components/BlueprintLists'
import { ORDER_STATUS_MODEL, ORDER_STATUS_SEQUENCE } from '@/domain/orderStatus'
import { formatCurrency } from '@/utils/format'

const serviceInterfaces = [
  'AuthService: login, register, getProfile',
  'CatalogueService: getCatalogue, getQuote',
  'CustomerOrderService: listOrders, getOrder, placeOrder',
  'OperationsService: listProductionOrders',
  'DriverService: listAssignments',
  'AdminService: getMetrics',
]

const domainModelGroups = [
  'CustomerProfile, Address, LoyaltyWallet, UserRole',
  'CatalogService, ServiceCategory, AddOnOption, BasketSize',
  'LaundryOrder, PickupDeliveryWindow, OrderStatusTimelineEntry',
  'PricingQuote, PricingQuoteItem, Promotion, LoyaltyRule',
  'DashboardMetric, DriverAssignment, ProductionOrder',
]

const pricingStructure = [
  `Basket pricing (example standard basket ${formatCurrency(169)})`,
  `Item pricing (example shirt dry clean ${formatCurrency(45)})`,
  `Add-on pricing (example express service ${formatCurrency(79)})`,
  'Delivery fee with free-delivery threshold progress',
  'Promotions and loyalty redemption hooks for future backend validation',
]

const mockApiShape = `{
  status: 'success' | 'error',
  meta: { requestId, timestamp, version, pagination? },
  data: T,
  error?: { code, message, details? }
}`

export const FoundationPage = () => (
  <div className="space-y-8">
    <SectionCard
      title="Product route map"
      description="Focused MVP paths plus clearly marked roadmap placeholders."
    >
      <ProductRouteTable />
    </SectionCard>

    <SectionCard title="MVP screen inventory" description="Prioritised screens to hit the eight-week launch window.">
      <ScreenInventoryList />
    </SectionCard>

    <div className="grid gap-8 xl:grid-cols-2">
      <SectionCard title="Feature-based folder structure" description="Keeps roles modular while preserving a single React app.">
        <FolderStructureList />
      </SectionCard>

      <SectionCard title="Design-system specification" description="Blue-and-white premium direction anchored for mobile-first execution.">
        <DesignSystemList />
      </SectionCard>
    </div>

    <div className="grid gap-8 xl:grid-cols-2">
      <SectionCard title="TypeScript domain models" description="Backend-ready contracts for core business entities.">
        <ul className="space-y-3 text-sm text-slate-600">
          {domainModelGroups.map((item) => (
            <li key={item} className="rounded-2xl bg-load-50 px-4 py-3">
              {item}
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard title="Service interfaces" description="Mock async services now, Spring Boot integration later.">
        <ul className="space-y-3 text-sm text-slate-600">
          {serviceInterfaces.map((item) => (
            <li key={item} className="rounded-2xl bg-load-50 px-4 py-3">
              {item}
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>

    <div className="grid gap-8 xl:grid-cols-2">
      <SectionCard title="Mock API response format" description="Uniform success and error payloads prepared for Spring Boot.">
        <pre className="overflow-x-auto rounded-3xl bg-slate-950 p-5 text-sm text-slate-100">{mockApiShape}</pre>
      </SectionCard>

      <SectionCard title="Order-status model" description="System status values and customer-friendly labels.">
        <div className="grid gap-3 md:grid-cols-2">
          {ORDER_STATUS_SEQUENCE.map((status) => (
            <article key={status} className="rounded-2xl border border-load-100 bg-white px-4 py-3 text-sm">
              <p className="font-semibold text-ink">{status}</p>
              <p className="mt-1 text-load-700">{ORDER_STATUS_MODEL[status].customerLabel}</p>
              <p className="mt-1 text-slate-500">{ORDER_STATUS_MODEL[status].description}</p>
            </article>
          ))}
        </div>
      </SectionCard>
    </div>

    <div className="grid gap-8 xl:grid-cols-2">
      <SectionCard title="Pricing-model structure" description="Supports basket, item, add-on, delivery, promotion, and loyalty logic.">
        <ul className="space-y-3 text-sm text-slate-600">
          {pricingStructure.map((item) => (
            <li key={item} className="rounded-2xl bg-load-50 px-4 py-3">
              {item}
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard title="Eight-week implementation backlog" description="Feature-by-feature delivery plan for the launch window.">
        <BacklogList />
      </SectionCard>
    </div>
  </div>
)
