import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { appPaths } from '@/app/router/paths'
import { useAuth } from '@/app/providers/useAuth'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { LoadingState } from '@/components/ui/LoadingState'
import { CoffeeSection } from '@/features/customer/components/CoffeeSection'
import { QuickServicesSection } from '@/features/customer/components/QuickServicesSection'
import { mockCustomerOrderService } from '@/services/mock'
import { formatCurrency, formatPoints } from '@/utils/format'

const getGreeting = () => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning,'
  if (hour < 17) return 'Good afternoon,'
  return 'Good evening,'
}

const QUICK_ACTIONS = [
  { to: appPaths.customerBooking, label: 'New Order',      emoji: '🧺' },
  { to: appPaths.customerOrders,  label: 'Track Order',    emoji: '🔍' },
  { to: appPaths.customerRewards, label: 'Rewards',        emoji: '⭐' },
  { to: appPaths.customerLoadPass,label: 'LOAD Pass',      emoji: '🎫' },
  { to: appPaths.customerBooking, label: 'Schedule Pickup',emoji: '📅' },
  { to: appPaths.customerOrders,  label: 'My Orders',      emoji: '📦' },
  { to: appPaths.customerProfile, label: 'Support',        emoji: '💬' },
  { to: appPaths.customerProfile, label: 'Profile',        emoji: '👤' },
  { to: appPaths.customerProfile, label: 'Refer a Friend', emoji: '🤝' },
] as const

const ORDER_PROGRESS: Record<string, number> = {
  BOOKING_RECEIVED: 5,
  PICKUP_SCHEDULED: 10,
  DRIVER_ASSIGNED: 15,
  DRIVER_EN_ROUTE: 20,
  DRIVER_ARRIVED: 25,
  COLLECTION_VERIFIED: 30,
  COLLECTED: 35,
  WEIGHT_CONFIRMED: 40,
  AWAITING_PAYMENT: 42,
  PAYMENT_CONFIRMED: 45,
  RECEIVED_AT_STORE: 50,
  SORTING: 58,
  WASHING: 65,
  DRYING: 72,
  IRONING: 78,
  QUALITY_CHECK: 84,
  PACKING: 90,
  READY_FOR_DISPATCH: 93,
  DELIVERY_SCHEDULED: 95,
  OUT_FOR_DELIVERY: 98,
  DELIVERED: 100,
  COMPLETED: 100,
}

const PRODUCTION_STEPS = ['Picked Up', 'In Wash', 'In Dry', 'Ready', 'Delivered'] as const

const getStepIndex = (progress: number) => {
  if (progress <= 35) return 0
  if (progress <= 65) return 1
  if (progress <= 78) return 2
  if (progress <= 93) return 3
  return 4
}

export const CustomerHomePage = () => {
  const { user } = useAuth()
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['customer-orders', user?.id],
    queryFn: () => mockCustomerOrderService.listOrders(user!.id),
    enabled: Boolean(user?.id),
  })

  if (!user) {
    return <ErrorState title="Customer account unavailable" message="Please sign in again to continue." />
  }

  const activeOrder = data?.data?.find((o) => o.status !== 'DELIVERED' && o.status !== 'COMPLETED' && o.status !== 'CANCELLED')
  const recentOrders = data?.data?.slice(0, 3) ?? []

  return (
    <div className="mx-auto max-w-lg space-y-5 pb-24">

      {/* ── Header ── */}
      <section aria-label="Welcome header" className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-load-500 text-base font-bold text-white" aria-hidden="true">
            {user.firstName[0]}
          </div>
          <div>
            <p className="text-caption text-muted">{getGreeting()}</p>
            <p className="text-title text-ink">{user.firstName} {user.lastName}</p>
          </div>
        </div>
        <Link
          to={appPaths.customerNotifications}
          aria-label="Notifications"
          className="relative flex h-10 w-10 items-center justify-center rounded-full border border-card-border bg-white shadow-card"
        >
          <span aria-hidden="true">🔔</span>
          <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-red-500 ring-2 ring-white" />
        </Link>
      </section>

      {/* ── Stats strip ── */}
      <section aria-label="Account summary" className="grid grid-cols-3 gap-3">
        {[
          { label: 'Balance', value: formatCurrency(user.loyalty.loadBalance) },
          { label: 'LOAD Points', value: formatPoints(user.loyalty.points) },
          { label: 'Next Reward', value: 'R5 Off' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-card border border-card-border bg-white p-3 text-center shadow-card">
            <p className="text-caption text-muted">{stat.label}</p>
            <p className="mt-1 text-sm font-semibold text-ink">{stat.value}</p>
          </div>
        ))}
      </section>

      {/* ── Active order card ── */}
      {isLoading ? <LoadingState /> : null}
      {isError ? <ErrorState title="Unable to load your orders" message={error instanceof Error ? error.message : 'Unknown error'} /> : null}

      {!isLoading && !isError && activeOrder ? (
        <section aria-labelledby="active-order-heading">
          <div className="rounded-panel border border-card-border bg-white p-5 shadow-panel">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-caption text-muted">Order in Progress</p>
                <p className="text-title text-load-600">#{activeOrder.id}</p>
              </div>
              <span className="rounded-pill bg-load-100 px-3 py-1 text-xs font-semibold text-load-700">
                {activeOrder.friendlyStatus}
              </span>
            </div>
            <p className="mt-1 text-caption text-muted">Your laundry is being processed</p>

            {/* Progress steps */}
            <div className="mt-4 flex justify-between" role="list" aria-label="Order stages">
              {PRODUCTION_STEPS.map((step, i) => {
                const progress = ORDER_PROGRESS[activeOrder.status] ?? 0
                const currentStep = getStepIndex(progress)
                const isDone = i <= currentStep
                return (
                  <div key={step} role="listitem" className="flex flex-col items-center gap-1">
                    <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition
                      ${isDone ? 'bg-load-600 text-white' : 'bg-load-100 text-load-400'}`}>
                      {isDone ? '✓' : i + 1}
                    </div>
                    <p className={`text-[10px] text-center leading-tight ${isDone ? 'text-load-600 font-medium' : 'text-muted'}`}>{step}</p>
                  </div>
                )
              })}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 text-caption text-muted border-t border-load-50 pt-4">
              <div><span className="text-ink font-medium">Pickup</span><br/>{activeOrder.pickupWindow.windowLabel}</div>
              <div><span className="text-ink font-medium">Delivery</span><br/>{activeOrder.deliveryWindow.windowLabel}</div>
              <div><span className="text-ink font-medium">Total</span><br/>
                <span className="text-sm font-semibold text-ink">{formatCurrency(activeOrder.estimatedTotal)}</span>
              </div>
            </div>

            <Link
              to={appPaths.customerOrders}
              className="mt-4 flex h-10 w-full items-center justify-center rounded-pill border-2 border-load-600 text-sm font-semibold text-load-600 transition hover:bg-load-50"
            >
              View Order Details
            </Link>
          </div>
        </section>
      ) : null}

      {!isLoading && !isError && !activeOrder ? (
        <div className="rounded-panel border border-card-border bg-white p-5 shadow-panel">
          <p className="text-caption text-muted">Need something?</p>
          <p className="mt-1 text-body text-ink">Order now for your next load.</p>
          <Link
            to={appPaths.customerBooking}
            className="mt-3 flex h-10 w-full items-center justify-center rounded-pill bg-load-600 text-sm font-semibold text-white transition hover:bg-load-700"
          >
            New Order
          </Link>
        </div>
      ) : null}

      {/* ── Quick Actions ── */}
      <section aria-labelledby="quick-actions-heading">
        <h2 id="quick-actions-heading" className="text-title text-ink">Quick Actions</h2>
        <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
          {QUICK_ACTIONS.map(({ to, label, emoji }) => (
            <Link
              key={label}
              to={to}
              className="flex flex-col items-center gap-2 rounded-card border border-card-border bg-white p-3 text-center shadow-card transition hover:border-load-300 hover:shadow-panel"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-load-50 text-xl" aria-hidden="true">
                {emoji}
              </div>
              <span className="text-caption font-semibold text-ink leading-tight">{label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Quick Services ── */}
      <QuickServicesSection />

      {/* ── LOAD Pass card ── */}
      <section aria-label="LOAD Pass">
        <div className="rounded-panel bg-load-card border border-load-200 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-title text-ink">LOAD Pass</p>
              <p className="text-caption text-muted mt-1">Save more every time</p>
              <p className="text-caption text-muted mt-1">Get exclusive benefits</p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-load-500 text-2xl" aria-hidden="true">
              🎫
            </div>
          </div>
          <Link
            to={appPaths.customerLoadPass}
            className="mt-4 inline-flex h-9 items-center rounded-pill border-2 border-load-600 px-5 text-sm font-semibold text-load-600 transition hover:bg-load-50"
          >
            Learn More
          </Link>
        </div>
      </section>

      {/* ── LOAD Coffee (promotional) ── */}
      <CoffeeSection />

      {/* ── Recent Activity ── */}
      <section aria-labelledby="recent-activity-heading">
        <div className="flex items-center justify-between gap-3">
          <h2 id="recent-activity-heading" className="text-title text-ink">Recent Activity</h2>
          <Link to={appPaths.customerOrders} className="text-sm font-semibold text-load-600 hover:text-load-700">
            View all
          </Link>
        </div>

        {!isLoading && !isError && recentOrders.length === 0 ? (
          <EmptyState title="No orders yet" description="Book your first pickup to get started." />
        ) : null}

        {!isLoading && !isError && recentOrders.length > 0 ? (
          <ul className="mt-3 divide-y divide-load-50 rounded-panel border border-card-border bg-white shadow-card" aria-label="Recent orders">
            {recentOrders.map((order) => (
              <li key={order.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-load-100 text-sm" aria-hidden="true">🧺</div>
                  <div>
                    <p className="text-sm font-semibold text-ink">Order #{order.id}</p>
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
