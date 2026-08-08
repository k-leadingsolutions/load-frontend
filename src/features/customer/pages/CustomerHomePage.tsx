import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { appPaths } from '@/app/router/paths'
import { useAuth } from '@/app/providers/useAuth'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { LoadingState } from '@/components/ui/LoadingState'
import { SectionCard } from '@/components/ui/SectionCard'
import { mockCustomerOrderService } from '@/services/mock'
import { formatCurrency, formatPoints } from '@/utils/format'

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

  return (
    <div className="space-y-6">
      <SectionCard
        title={`Welcome back, ${user.firstName}`}
        description="Your LOAD account is ready for booking, loyalty, and order tracking workflows."
        action={(
          <Link
            to={appPaths.customerBooking}
            className="rounded-full bg-load-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-load-700"
          >
            Book pickup
          </Link>
        )}
      >
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <article className="rounded-[2rem] bg-gradient-to-br from-load-500 to-load-700 p-6 text-white shadow-glow">
            <p className="text-sm text-white/80">Premium care, on your schedule</p>
            <h3 className="mt-2 text-2xl font-semibold">Your next pickup is only a few taps away.</h3>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-3xl bg-white/15 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/70">LOAD Balance</p>
                <p className="mt-2 text-2xl font-semibold">{formatCurrency(user.loyalty.loadBalance)}</p>
              </div>
              <div className="rounded-3xl bg-white/15 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/70">Rewards</p>
                <p className="mt-2 text-2xl font-semibold">{user.loyalty.availableRewards}</p>
              </div>
              <div className="rounded-3xl bg-white/15 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/70">Points</p>
                <p className="mt-2 text-xl font-semibold">{formatPoints(user.loyalty.points)}</p>
              </div>
            </div>
          </article>
          <article className="rounded-panel border border-load-100 bg-white p-5 shadow-panel">
            <p className="text-sm font-semibold text-ink">Account snapshot</p>
            <ul className="mt-3 space-y-3 text-sm text-slate-600">
              <li className="rounded-2xl bg-load-50 p-3">{user.mobileNumber}</li>
              <li className="rounded-2xl bg-load-50 p-3">{user.email}</li>
              <li className="rounded-2xl bg-load-50 p-3">
                Default suburb:{' '}
                {user.addresses.find((address) => address.id === user.defaultAddressId)?.suburb ?? 'Not set yet'}
              </li>
            </ul>
          </article>
        </div>
      </SectionCard>

      <SectionCard
        title="Orders"
        description="Authenticated customer order history is ready for the upcoming booking and tracking flows."
      >
        {isLoading ? <LoadingState /> : null}
        {isError ? (
          <ErrorState title="Unable to load your orders" message={error instanceof Error ? error.message : 'Unknown error'} />
        ) : null}
        {!isLoading && !isError && (!data?.data || data.data.length === 0) ? (
          <EmptyState
            title="No orders yet"
            description="Your account is ready. The booking experience will populate your order history once your first order is placed."
          />
        ) : null}
        {!isLoading && !isError && data?.data ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {data.data.map((order) => (
              <article key={order.id} className="rounded-3xl border border-load-100 bg-white p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-ink">#{order.id}</p>
                  <span className="rounded-full bg-load-50 px-3 py-1 text-xs font-semibold text-load-700">
                    {order.friendlyStatus}
                  </span>
                </div>
                <p className="mt-3 text-sm text-slate-600">Pickup: {order.pickupWindow.windowLabel}</p>
                <p className="mt-1 text-sm text-slate-600">Delivery: {order.deliveryWindow.windowLabel}</p>
                <p className="mt-4 text-lg font-semibold text-ink">{formatCurrency(order.estimatedTotal)}</p>
              </article>
            ))}
          </div>
        ) : null}
      </SectionCard>
    </div>
  )
}
