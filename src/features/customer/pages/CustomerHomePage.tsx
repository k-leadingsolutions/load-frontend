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
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

const ORDER_PROGRESS: Record<string, number> = {
  PENDING: 5,
  PICKED_UP: 20,
  SORTING: 35,
  WASHING: 55,
  DRYING: 70,
  FOLDING: 85,
  READY: 95,
  OUT_FOR_DELIVERY: 98,
  DELIVERED: 100,
  CANCELLED: 0,
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

  const activeOrder = data?.data?.find((o) => o.status !== 'DELIVERED' && o.status !== 'CANCELLED')
  const recentOrders = data?.data?.slice(0, 3) ?? []

  return (
    <div className="space-y-10">
      {/* ── Hero greeting card ── */}
      <section aria-labelledby="home-hero-heading">
        <article className="rounded-[2rem] bg-gradient-to-br from-load-500 to-load-700 p-6 text-white shadow-glow">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm text-white/80">{getGreeting()}</p>
              <h1 id="home-hero-heading" className="mt-1 text-2xl font-semibold">
                {user.firstName} {user.lastName}
              </h1>
            </div>
            <Link
              to={appPaths.customerBooking}
              className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-load-700 transition hover:bg-load-50"
            >
              Book pickup
            </Link>
          </div>

          {/* Loyalty stats */}
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-3xl bg-white/15 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/70">LOAD Balance</p>
              <p className="mt-2 text-2xl font-semibold">{formatCurrency(user.loyalty.loadBalance)}</p>
            </div>
            <div className="rounded-3xl bg-white/15 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/70">Points</p>
              <p className="mt-2 text-2xl font-semibold">{formatPoints(user.loyalty.points)}</p>
            </div>
            <div className="rounded-3xl bg-white/15 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/70">Rewards</p>
              <p className="mt-2 text-2xl font-semibold">{user.loyalty.availableRewards} available</p>
            </div>
          </div>

          {/* Active order tracker */}
          {activeOrder ? (
            <div className="mt-6 rounded-3xl bg-white/10 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold">Active order #{activeOrder.id}</p>
                <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
                  {activeOrder.friendlyStatus}
                </span>
              </div>
              <p className="mt-2 text-sm text-white/80">
                Estimated delivery {activeOrder.deliveryWindow.windowLabel}
              </p>
              <div className="mt-3 h-2 rounded-full bg-white/20" role="progressbar" aria-label="Order progress" aria-valuenow={ORDER_PROGRESS[activeOrder.status] ?? 0} aria-valuemin={0} aria-valuemax={100}>
                <div
                  className="h-2 rounded-full bg-white transition-all duration-500"
                  style={{ width: `${ORDER_PROGRESS[activeOrder.status] ?? 0}%` }}
                />
              </div>
            </div>
          ) : null}
        </article>
      </section>

      {/* ── Quick Actions ── */}
      <nav aria-label="Customer quick actions">
        <div className="grid grid-cols-3 gap-3">
          {([
            { to: appPaths.customerBooking, label: 'Book order', emoji: '🧺' },
            { to: appPaths.customerOrders, label: 'My orders', emoji: '📦' },
            { to: appPaths.customerProfile, label: 'Profile', emoji: '👤' },
          ] as const).map(({ to, label, emoji }) => (
            <Link
              key={to}
              to={to}
              className="flex flex-col items-center gap-2 rounded-3xl border border-load-100 bg-white p-4 text-center shadow-panel transition hover:border-load-300 hover:shadow-glow"
            >
              <span className="text-2xl" aria-hidden="true">{emoji}</span>
              <span className="text-sm font-semibold text-ink">{label}</span>
            </Link>
          ))}
        </div>
      </nav>

      {/* ── Quick Services ── */}
      <QuickServicesSection />

      {/* ── LOAD Coffee ── */}
      <CoffeeSection />

      {/* ── Recent orders ── */}
      <section aria-labelledby="recent-orders-heading">
        <div className="flex items-center justify-between gap-3">
          <h2 id="recent-orders-heading" className="text-lg font-semibold text-ink">
            Recent orders
          </h2>
          <Link
            to={appPaths.customerOrders}
            className="text-sm font-semibold text-load-600 hover:text-load-700"
          >
            View all
          </Link>
        </div>

        {isLoading ? <LoadingState /> : null}
        {isError ? (
          <ErrorState title="Unable to load your orders" message={error instanceof Error ? error.message : 'Unknown error'} />
        ) : null}
        {!isLoading && !isError && recentOrders.length === 0 ? (
          <EmptyState
            title="No orders yet"
            description="Your account is ready. Book your first pickup to get started."
          />
        ) : null}
        {!isLoading && !isError && recentOrders.length > 0 ? (
          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            {recentOrders.map((order) => (
              <article key={order.id} className="rounded-3xl border border-load-100 bg-white p-5 shadow-panel">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-ink">#{order.id}</p>
                  <span className="rounded-full bg-load-50 px-3 py-1 text-xs font-semibold text-load-700">
                    {order.friendlyStatus}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-500">{order.deliveryWindow.windowLabel}</p>
                <p className="mt-3 text-lg font-semibold text-ink">{formatCurrency(order.estimatedTotal)}</p>
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  )
}
