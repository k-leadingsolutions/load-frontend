import { useQuery } from '@tanstack/react-query'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { LoadingState } from '@/components/ui/LoadingState'
import { mockAuthService, mockCustomerOrderService } from '@/services/mock'
import { formatCurrency, formatPoints } from '@/utils/format'

const useCustomerHomeData = () =>
  useQuery({
    queryKey: ['customer-home-preview'],
    queryFn: async () => {
      const [profileResponse, orderResponse] = await Promise.all([
        mockAuthService.getProfile(),
        mockCustomerOrderService.listOrders('cust-thando-001'),
      ])

      if (!profileResponse.data || !orderResponse.data) {
        throw new Error('Preview data is unavailable.')
      }

      return {
        profile: profileResponse.data,
        orders: orderResponse.data,
      }
    },
  })

export const CustomerHomePreview = () => {
  const { data, isLoading, isError, error } = useCustomerHomeData()

  if (isLoading) {
    return <LoadingState />
  }

  if (isError) {
    return <ErrorState title="Unable to load customer preview" message={error instanceof Error ? error.message : 'Unknown error'} />
  }

  if (!data || data.orders.length === 0) {
    return <EmptyState title="No preview order" description="Mock customer data is not available yet." />
  }

  const activeOrder = data.orders[0]!

  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <article className="rounded-[2rem] bg-gradient-to-br from-load-500 to-load-700 p-6 text-white shadow-glow">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-white/80">Good morning, {data.profile.firstName}</p>
            <h3 className="mt-1 text-2xl font-semibold">Life, well loaded.</h3>
          </div>
          <Badge tone="muted">Customer MVP</Badge>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-3xl bg-white/15 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-white/70">LOAD Balance</p>
            <p className="mt-2 text-2xl font-semibold">{formatCurrency(data.profile.loyalty.loadBalance)}</p>
          </div>
          <div className="rounded-3xl bg-white/15 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-white/70">LOAD Pass teaser</p>
            <p className="mt-2 text-lg font-semibold">{data.profile.loyalty.tier} Member</p>
            <p className="text-sm text-white/80">{formatPoints(data.profile.loyalty.points)}</p>
          </div>
        </div>
        <div className="mt-6 rounded-3xl bg-white/10 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold">Active order #{activeOrder.id}</p>
            <Badge tone="success">{activeOrder.friendlyStatus}</Badge>
          </div>
          <p className="mt-3 text-sm text-white/80">Estimated delivery {activeOrder.deliveryWindow.windowLabel}</p>
          <div className="mt-4 h-2 rounded-full bg-white/20">
            <div className="h-2 w-3/5 rounded-full bg-white" />
          </div>
        </div>
      </article>
      <div className="space-y-4">
        <article className="rounded-panel border border-load-100 bg-white p-5 shadow-panel">
          <p className="text-sm font-semibold text-ink">Suggested revenue levers</p>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li>• Express-service upsell on basket bookings</li>
            <li>• Free delivery threshold progress to R300</li>
            <li>• Promotion and loyalty-point preview before checkout</li>
            <li>• Referral and LOAD Pass placeholders clearly marked</li>
          </ul>
        </article>
        <article className="rounded-panel border border-load-100 bg-white p-5 shadow-panel">
          <p className="text-sm font-semibold text-ink">Recent order snapshot</p>
          <ul className="mt-3 space-y-3 text-sm text-slate-600">
            {data.orders.map((order) => (
              <li key={order.id} className="rounded-2xl bg-load-50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-ink">#{order.id}</span>
                  <span>{order.friendlyStatus}</span>
                </div>
                <p className="mt-1">Estimated total {formatCurrency(order.estimatedTotal)}</p>
              </li>
            ))}
          </ul>
        </article>
      </div>
    </div>
  )
}
