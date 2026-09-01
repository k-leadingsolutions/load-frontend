import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { buildPath } from '@/app/router/paths'
import { useAuth } from '@/app/providers/useAuth'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { LoadingState } from '@/components/ui/LoadingState'
import { SectionCard } from '@/components/ui/SectionCard'
import { OrderStatusTimeline } from '@/features/customer/components/OrderStatusTimeline'
import { ORDER_STATUS_MODEL } from '@/domain/orderStatus'
import { mockCustomerOrderService } from '@/services/mock'
import { getStoredDriverRating } from '@/services/mock/driverRatings'
import { formatCurrency } from '@/utils/format'
import type { LaundryOrder, PaymentStatus } from '@/domain/models/order'

// ── Stage progress ─────────────────────────────────────────────────────────────

const STAGES = ['Booking', 'Pickup', 'Production', 'Delivery', 'Closed'] as const
type Stage = (typeof STAGES)[number]

const STAGE_FROM_MODEL: Record<string, Stage> = {
  BOOKING:    'Booking',
  PICKUP:     'Pickup',
  PRODUCTION: 'Production',
  DELIVERY:   'Delivery',
  CLOSED:     'Closed',
}

function getStageIndex(order: LaundryOrder): number {
  const stage = ORDER_STATUS_MODEL[order.status]?.stage ?? 'BOOKING'
  const label = STAGE_FROM_MODEL[stage] ?? 'Booking'
  return STAGES.indexOf(label as Stage)
}

// ── Payment badge ─────────────────────────────────────────────────────────────

const PAYMENT_BADGE: Record<PaymentStatus, { label: string; tone: 'success' | 'warning' | 'error' | 'muted' | 'info' }> = {
  CONFIRMED:         { label: 'Paid',            tone: 'success'  },
  PENDING:           { label: 'Payment pending',  tone: 'warning'  },
  AWAITING_CUSTOMER: { label: 'Awaiting payment', tone: 'warning'  },
  FAILED:            { label: 'Payment failed',   tone: 'error'    },
  NOT_REQUIRED:      { label: 'No charge',        tone: 'muted'    },
  REFUNDED:          { label: 'Refunded',         tone: 'info'     },
}

// ── Stage progress bar component ──────────────────────────────────────────────

function StageProgressBar({ order }: { order: LaundryOrder }) {
  const currentIndex = getStageIndex(order)
  return (
    <div aria-label="Order stage progress">
      <div className="flex items-center gap-1">
        {STAGES.map((stage, i) => (
          <div key={stage} className="flex flex-1 flex-col items-center gap-1">
            <div
              className={`h-1.5 w-full rounded-full transition ${
                i <= currentIndex ? 'bg-load-600' : 'bg-load-100'
              }`}
            />
            <span className={`text-[10px] font-semibold ${i === currentIndex ? 'text-load-700' : 'text-muted'}`}>
              {stage}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export const CustomerOrdersPage = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [repeatSuccessId, setRepeatSuccessId] = useState<string | null>(null)
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['customer-orders', user?.id],
    queryFn: () => mockCustomerOrderService.listOrders(user!.id),
    enabled: Boolean(user?.id),
  })
  const repeatOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const order = data?.data?.find((item) => item.id === orderId)

      if (!order || !user) {
        throw new Error('The selected order could not be repeated.')
      }

      const basketSelection = order.services.find((service) => service.serviceId.startsWith('basket-'))
      const response = await mockCustomerOrderService.placeOrder({
        customerId: user.id,
        ...(basketSelection ? { basketSizeId: basketSelection.serviceId } : {}),
        serviceSelections: order.services
          .filter((service) => !service.serviceId.startsWith('basket-'))
          .map((service) => ({
            serviceId: service.serviceId,
            quantity: service.quantity,
          })),
        addOnSelections: [],
        pickupAddressId: order.pickupAddress.id,
        deliveryAddressId: order.deliveryAddress.id,
        pickupWindow: order.pickupWindow.windowLabel,
        deliveryWindow: order.deliveryWindow.windowLabel,
      })

      if (response.status === 'error' || !response.data) {
        throw new Error(response.error?.message ?? 'Unable to repeat this order.')
      }

      return response.data
    },
    onSuccess: (order) => {
      setRepeatSuccessId(order.id)
      queryClient.invalidateQueries({ queryKey: ['customer-orders'] })
    },
  })

  if (!user) {
    return <ErrorState title="Customer account unavailable" message="Please sign in again to continue." />
  }

  if (isLoading) {
    return <LoadingState />
  }

  if (isError || data?.status === 'error') {
    return (
      <ErrorState
        title="Unable to load orders"
        message={error instanceof Error ? error.message : data?.error?.message ?? 'Unknown error'}
      />
    )
  }

  const orders = data?.data ?? []
  const activeOrder = orders.find((order) => !['DELIVERED', 'COMPLETED', 'CANCELLED'].includes(order.status))

  return (
    <div className="space-y-6">
      {repeatSuccessId ? (
        <SectionCard title="Repeat order created" description="A fresh booking has been opened from your previous order details.">
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-700">
            New order created as <span className="font-semibold">#{repeatSuccessId}</span>.
          </div>
        </SectionCard>
      ) : null}

      {/* Active order — enriched card */}
      <SectionCard
        title="Live order tracking"
        description="Customer-friendly status labels and production visibility for the active order."
      >
        {activeOrder ? (
          <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <Card variant="brand" className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-caption text-muted">Order #{activeOrder.id}</p>
                  <h3 className="mt-1 text-heading text-ink">{activeOrder.friendlyStatus}</h3>
                </div>
                <Badge tone={PAYMENT_BADGE[activeOrder.paymentStatus].tone}>
                  {PAYMENT_BADGE[activeOrder.paymentStatus].label}
                </Badge>
              </div>

              <StageProgressBar order={activeOrder} />

              <div className="space-y-1 text-body text-muted">
                <p>Delivery: {activeOrder.deliveryWindow.windowLabel}</p>
                {activeOrder.confirmedWeightKg ? (
                  <p>Confirmed weight: {activeOrder.confirmedWeightKg.toFixed(1)} kg</p>
                ) : null}
              </div>

              <p className="text-lg font-semibold text-ink">{formatCurrency(activeOrder.estimatedTotal)}</p>

              {activeOrder.invoiceId ? (
                <Link to={buildPath.customerInvoice(activeOrder.invoiceId)}>
                  <Button variant="outline" size="sm">View invoice</Button>
                </Link>
              ) : null}
            </Card>
            <OrderStatusTimeline status={activeOrder.status} />
          </div>
        ) : (
          <EmptyState
            title="No active order"
            description="Your completed orders remain in the history below, ready for quick reorder."
          />
        )}
      </SectionCard>

      {/* Order history */}
      <SectionCard
        title="Order history and quick reorder"
        description="View completed orders and place a similar booking again with one action."
      >
        {orders.length === 0 ? (
          <EmptyState title="No order history" description="Your booking activity will appear here after your first LOAD order." />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {orders.map((order) => {
              const payBadge = PAYMENT_BADGE[order.paymentStatus]
              const stage = STAGE_FROM_MODEL[ORDER_STATUS_MODEL[order.status]?.stage ?? 'BOOKING'] ?? 'Booking'
              const canRateDriver = ['DELIVERED', 'COMPLETED'].includes(order.status)
                && !getStoredDriverRating(order.id)
              return (
                <Card key={order.id} variant="elevated">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-title text-ink">#{order.id}</p>
                      <p className="text-body text-muted">{order.friendlyStatus}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge tone={payBadge.tone}>{payBadge.label}</Badge>
                      <Badge tone="info">{stage}</Badge>
                    </div>
                  </div>

                  <div className="mt-3 space-y-1 text-body text-muted">
                    <p>Pickup: {order.pickupWindow.windowLabel}</p>
                    <p>Delivery: {order.deliveryWindow.windowLabel}</p>
                    {order.confirmedWeightKg ? (
                      <p>Confirmed weight: {order.confirmedWeightKg.toFixed(1)} kg</p>
                    ) : null}
                  </div>

                  <p className="mt-3 text-lg font-semibold text-ink">{formatCurrency(order.estimatedTotal)}</p>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => repeatOrderMutation.mutate(order.id)}
                      loading={repeatOrderMutation.isPending && repeatOrderMutation.variables === order.id}
                      disabled={repeatOrderMutation.isPending}
                    >
                      Repeat order
                    </Button>
                    {order.invoiceId ? (
                      <Link to={buildPath.customerInvoice(order.invoiceId)}>
                        <Button variant="ghost" size="sm">Open invoice</Button>
                      </Link>
                    ) : null}
                    {canRateDriver ? (
                      <Link to={buildPath.customerRateDriver(order.id)}>
                        <Button variant="ghost" size="sm">Rate driver</Button>
                      </Link>
                    ) : null}
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </SectionCard>
    </div>
  )
}
