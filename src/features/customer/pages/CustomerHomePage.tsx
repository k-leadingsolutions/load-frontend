import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { appPaths, buildPath } from '@/app/router/paths'
import { useAuth } from '@/app/providers/useAuth'
import { Badge } from '@/components/ui/Badge'
import { Collapsible } from '@/components/ui/Collapsible'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { SkeletonCard } from '@/components/ui/LoadingState'
import { mockCustomerOrderService, mockNotificationService } from '@/services/mock'
import { mockPromotions } from '@/services/mock/data'
import { approvedCategories } from '@/services/mock/approvedLaundryCatalogue'
import { formatCurrency, formatPoints } from '@/utils/format'

/* ── Helpers ─────────────────────────────────────────────────────── */

const getGreeting = () => {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning,'
  if (h < 17) return 'Good afternoon,'
  return 'Good evening,'
}

const ORDER_PROGRESS: Record<string, number> = {
  BOOKING_RECEIVED: 5,   PICKUP_SCHEDULED: 10,  DRIVER_ASSIGNED: 15,
  DRIVER_EN_ROUTE: 20,   DRIVER_ARRIVED: 25,    COLLECTION_VERIFIED: 30,
  COLLECTED: 35,         WEIGHT_CONFIRMED: 40,  AWAITING_PAYMENT: 42,
  PAYMENT_CONFIRMED: 45, RECEIVED_AT_STORE: 50, SORTING: 58,
  WASHING: 65,           DRYING: 72,            IRONING: 78,
  QUALITY_CHECK: 84,     PACKING: 90,           READY_FOR_DISPATCH: 93,
  DELIVERY_SCHEDULED: 95, OUT_FOR_DELIVERY: 98, DELIVERED: 100, COMPLETED: 100,
}

const STAGES = ['Picked Up', 'Washing', 'Ready', 'Delivered'] as const
const getStageIndex = (progress: number) => {
  if (progress <= 35) return 0
  if (progress <= 78) return 1
  if (progress <= 93) return 2
  return 3
}

/* ── Sub-components ──────────────────────────────────────────────── */

const QuickActions = () => {
  const actions = [
    { to: appPaths.customerBooking, label: 'New Order',   icon: '🧺' },
    { to: appPaths.customerOrders,  label: 'My Orders',   icon: '📦' },
    { to: appPaths.customerRewards, label: 'Rewards',     icon: '⭐' },
    { to: appPaths.customerProfile, label: 'Profile',     icon: '👤' },
  ]
  return (
    <div className="grid grid-cols-4 gap-2">
      {actions.map(({ to, label, icon }) => (
        <Link
          key={label}
          to={to}
          className="flex flex-col items-center gap-2 rounded-card border border-card-border bg-white p-3 text-center shadow-card transition hover:border-load-300 hover:shadow-panel"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-load-50 text-xl" aria-hidden="true">
            {icon}
          </div>
          <span className="text-[11px] font-semibold text-ink leading-tight">{label}</span>
        </Link>
      ))}
    </div>
  )
}

const ActiveOrderCard = ({ order }: { order: NonNullable<ReturnType<typeof useActiveOrder>> }) => {
  const progress = ORDER_PROGRESS[order.status] ?? 0
  const stageIdx = getStageIndex(progress)

  return (
    <section aria-labelledby="active-order-heading" className="rounded-panel border border-card-border bg-white p-5 shadow-panel">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p id="active-order-heading" className="text-caption text-muted">Order in progress</p>
          <p className="text-title text-load-700">#{order.id}</p>
        </div>
        <Badge tone="primary">{order.friendlyStatus}</Badge>
      </div>

      {/* Stage dots */}
      <div className="mt-4 flex items-center gap-1" role="list" aria-label="Order stages">
        {STAGES.map((stage, i) => {
          const done = i <= stageIdx
          const current = i === stageIdx
          return (
            <div key={stage} role="listitem" className="flex flex-1 flex-col items-center gap-1">
              <div className={`h-2 w-full rounded-full transition ${done ? 'bg-load-500' : 'bg-load-100'} ${current ? 'ring-2 ring-load-300' : ''}`} />
              <p className={`text-[9px] text-center leading-tight ${done ? 'text-load-700 font-semibold' : 'text-muted'}`}>{stage}</p>
            </div>
          )
        })}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-caption text-muted border-t border-divider pt-4">
        <div><span className="font-medium text-ink">Pickup</span><br />{order.pickupWindow.windowLabel}</div>
        <div><span className="font-medium text-ink">Delivery</span><br />{order.deliveryWindow.windowLabel}</div>
      </div>

      <div className="mt-4 flex gap-2">
        <Link
          to={appPaths.customerOrders}
          className="flex-1 flex h-10 items-center justify-center rounded-pill border-2 border-load-600 text-sm font-semibold text-load-600 transition hover:bg-load-50"
        >
          Track Order
        </Link>
        {order.invoiceId ? (
          <Link
            to={buildPath.customerInvoice(order.invoiceId)}
            className="flex-1 flex h-10 items-center justify-center rounded-pill bg-load-600 text-sm font-semibold text-white transition hover:bg-load-700"
          >
            View Invoice
          </Link>
        ) : null}
      </div>
    </section>
  )
}

const LoyaltySummary = ({ points, balance, tier, rewards }: { points: number; balance: number; tier: string; rewards: number }) => (
  <div className="grid grid-cols-3 gap-2">
    {[
      { label: 'Balance',   value: formatCurrency(balance) },
      { label: 'Points',    value: formatPoints(points) },
      { label: 'Rewards',   value: String(rewards) },
    ].map((stat) => (
      <div key={stat.label} className="rounded-card border border-card-border bg-white p-3 text-center shadow-card">
        <p className="text-caption text-muted">{stat.label}</p>
        <p className="mt-0.5 text-sm font-semibold text-ink">{stat.value}</p>
      </div>
    ))}
    <div className="col-span-3">
      <p className="text-caption text-muted text-center">
        <Badge tone="info" size="sm">{tier} Member</Badge>
      </p>
    </div>
  </div>
)

const QuickServices = () => {
  // Show 4 featured laundry categories (no coffee — pending menu approval)
  const featured = approvedCategories.filter((c) => c.isFeatured).slice(0, 4)
  return (
    <div className="space-y-2">
      {featured.map((cat) => (
        <Link
          key={cat.id}
          to={buildPath.customerServiceCategory(cat.id)}
          className="flex items-center gap-3 rounded-card border border-card-border bg-white p-3 shadow-card transition hover:border-load-300"
          aria-label={`Browse ${cat.name} — ${cat.tagline}`}
        >
          <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-xl ${cat.accent}`} aria-hidden="true">
            {cat.icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-ink">{cat.name}</p>
            <p className="text-caption text-muted">{cat.tagline}</p>
          </div>
          <p className="flex-shrink-0 text-sm font-semibold text-load-700">{cat.startingPriceLabel}</p>
        </Link>
      ))}
      <Link
        to={appPaths.customerServices}
        className="flex w-full items-center justify-center rounded-card border border-dashed border-load-300 py-3 text-sm font-semibold text-load-600 hover:bg-load-50 transition"
      >
        View all services →
      </Link>
    </div>
  )
}

const PromotionsSection = () => (
  <div className="space-y-2">
    {mockPromotions.map((promo) => (
      <div key={promo.code} className="flex items-start gap-3 rounded-card border border-card-border bg-white p-3 shadow-card">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-load-100 text-lg" aria-hidden="true">🏷️</div>
        <div>
          <p className="text-sm font-semibold text-ink">{promo.name}</p>
          <p className="text-caption text-muted">{promo.description}</p>
          <Badge tone="primary" size="sm">{promo.code}</Badge>
        </div>
      </div>
    ))}
  </div>
)

const CoffeeCollapsible = () => (
  <div className="space-y-2">
    <div className="flex items-center gap-3 rounded-card border border-card-border bg-white p-3 shadow-card">
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-amber-50 text-lg" aria-hidden="true">☕</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-ink">LOAD Coffee</p>
        <p className="text-caption text-muted">Freshly roasted single-origin beans.</p>
      </div>
    </div>
    <p className="text-caption text-muted text-center">Coffee ordering available once the menu is finalised.</p>
  </div>
)

const LoadPassTeaser = () => (
  <section aria-label="LOAD Pass">
    <div className="rounded-panel bg-load-pass p-5 text-white">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-white/70">Coming Soon</p>
          <h2 className="mt-1 text-title">LOAD Pass</h2>
          <p className="mt-1 text-caption text-white/80">Exclusive benefits. Free pickups. Priority service.</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-2xl" aria-hidden="true">🎫</div>
      </div>
      <Link
        to={appPaths.customerLoadPass}
        className="mt-4 inline-flex h-9 items-center rounded-pill border border-white/40 bg-white/15 px-5 text-sm font-semibold text-white transition hover:bg-white/25"
      >
        Learn more
      </Link>
    </div>
  </section>
)

/* ── Hook ─────────────────────────────────────────────────────────── */

const useActiveOrder = (userId: string | undefined) => {
  const { data } = useQuery({
    queryKey: ['customer-orders', userId],
    queryFn: () => mockCustomerOrderService.listOrders(userId!),
    enabled: Boolean(userId),
  })
  return data?.data?.find((o) => o.status !== 'DELIVERED' && o.status !== 'COMPLETED' && o.status !== 'CANCELLED') ?? null
}

/* ── Page ─────────────────────────────────────────────────────────── */

export const CustomerHomePage = () => {
  const { user } = useAuth()

  const ordersQuery = useQuery({
    queryKey: ['customer-orders', user?.id],
    queryFn: () => mockCustomerOrderService.listOrders(user!.id),
    enabled: Boolean(user?.id),
  })

  const notificationsQuery = useQuery({
    queryKey: ['notifications', 'CUSTOMER'],
    queryFn: () => mockNotificationService.listNotifications('CUSTOMER'),
  })

  if (!user) {
    return <ErrorState title="Account unavailable" message="Please sign in again to continue." />
  }

  const orders       = ordersQuery.data?.data ?? []
  const activeOrder  = orders.find((o) => o.status !== 'DELIVERED' && o.status !== 'COMPLETED' && o.status !== 'CANCELLED') ?? null
  const recentOrders = orders.slice(0, 3)
  const unreadCount  = (notificationsQuery.data ?? []).filter((n) => !n.isRead).length

  return (
    <div className="mx-auto max-w-lg space-y-4 pb-28 animate-fade-in">

      {/* ── Header ─────────────────────────────────────────────── */}
      <section aria-label="Welcome header" className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full bg-load-300 text-base font-bold text-load-900"
            aria-hidden="true"
          >
            {user.firstName[0]}
          </div>
          <div>
            <p className="text-caption text-muted">{getGreeting()}</p>
            <h1 className="text-title text-ink">{user.firstName}</h1>
          </div>
        </div>
        <Link
          to={appPaths.customerNotifications}
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
          className="relative flex h-10 w-10 items-center justify-center rounded-full border border-card-border bg-white shadow-card"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-muted">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {unreadCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-status-error text-[9px] font-bold text-white ring-2 ring-white" aria-hidden="true">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          ) : null}
        </Link>
      </section>

      {/* ── Loyalty summary ─────────────────────────────────────── */}
      <section aria-label="Loyalty summary">
        <LoyaltySummary
          points={user.loyalty.points}
          balance={user.loyalty.loadBalance}
          tier={user.loyalty.tier}
          rewards={user.loyalty.availableRewards}
        />
      </section>

      {/* ── Active order or primary CTA ─────────────────────────── */}
      {ordersQuery.isLoading ? <SkeletonCard /> : null}
      {ordersQuery.isError ? (
        <ErrorState title="Unable to load orders" message={ordersQuery.error instanceof Error ? ordersQuery.error.message : 'Unknown error'} />
      ) : null}

      {!ordersQuery.isLoading && !ordersQuery.isError && activeOrder ? (
        <ActiveOrderCard order={activeOrder} />
      ) : null}

      {!ordersQuery.isLoading && !ordersQuery.isError && !activeOrder ? (
        <div className="rounded-panel border border-load-200 bg-load-card p-5">
          <p className="text-caption text-muted">Ready for a fresh start?</p>
          <p className="mt-1 text-title text-ink">Book your next pickup</p>
          <p className="mt-1 text-caption text-muted">Fast pickup. Fresh delivery. Every time.</p>
          <div className="mt-4">
            <Link
              to={appPaths.customerBooking}
              className="flex h-control w-full items-center justify-center rounded-pill bg-load-600 text-sm font-semibold text-white transition hover:bg-load-700 active:bg-load-800"
            >
              New Order
            </Link>
          </div>
        </div>
      ) : null}

      {/* ── Quick actions (4 max) ────────────────────────────────── */}
      <section aria-labelledby="quick-actions-heading">
        <h2 id="quick-actions-heading" className="mb-3 text-title text-ink">Quick Actions</h2>
        <QuickActions />
      </section>

      {/* ── Collapsible: Services ────────────────────────────────── */}
      <Collapsible title="Services" defaultOpen={true} badge={<Badge tone="info" size="sm">3 available</Badge>}>
        <QuickServices />
      </Collapsible>

      {/* ── Collapsible: Promotions ──────────────────────────────── */}
      <Collapsible title="Promotions &amp; Offers" badge={<Badge tone="success" size="sm">{mockPromotions.length} active</Badge>}>
        <PromotionsSection />
      </Collapsible>

      {/* ── LOAD Pass teaser ─────────────────────────────────────── */}
      <LoadPassTeaser />

      {/* ── Collapsible: Coffee ──────────────────────────────────── */}
      <Collapsible title="LOAD Coffee" badge={<Badge tone="muted" size="sm">Explore</Badge>}>
        <CoffeeCollapsible />
      </Collapsible>

      {/* ── Recent orders ────────────────────────────────────────── */}
      <section aria-labelledby="recent-orders-heading">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="recent-orders-heading" className="text-title text-ink">Recent Orders</h2>
          <Link to={appPaths.customerOrders} className="text-sm font-semibold text-load-600 hover:text-load-700">
            View all
          </Link>
        </div>

        {!ordersQuery.isLoading && !ordersQuery.isError && recentOrders.length === 0 ? (
          <EmptyState title="No orders yet" description="Book your first pickup to get started." />
        ) : null}

        {!ordersQuery.isLoading && !ordersQuery.isError && recentOrders.length > 0 ? (
          <ul className="divide-y divide-divider rounded-panel border border-card-border bg-white shadow-card" aria-label="Recent orders">
            {recentOrders.map((order) => (
              <li key={order.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-load-100 text-sm" aria-hidden="true">🧺</div>
                  <div>
                    <p className="text-sm font-semibold text-ink">#{order.id}</p>
                    <p className="text-caption text-muted">{order.deliveryWindow.windowLabel}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-ink">{formatCurrency(order.estimatedTotal)}</p>
                  <p className="text-caption text-load-600">{order.friendlyStatus}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

    </div>
  )
}

