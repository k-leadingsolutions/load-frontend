import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { buildPath } from '@/app/router/paths'
import { useAuth } from '@/app/providers/useAuth'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { LoadingState } from '@/components/ui/LoadingState'
import { SectionCard } from '@/components/ui/SectionCard'
import { OrderStatusTimeline } from '@/features/customer/components/OrderStatusTimeline'
import { mockCustomerOrderService } from '@/services/mock'
import { formatCurrency } from '@/utils/format'

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

      <SectionCard
        title="Live order tracking"
        description="Customer-friendly status labels and production visibility for the active order."
      >
        {activeOrder ? (
          <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-3xl bg-load-50/60 p-5">
              <p className="text-sm font-semibold text-load-700">Active order #{activeOrder.id}</p>
              <h3 className="mt-2 text-2xl font-semibold text-ink">{activeOrder.friendlyStatus}</h3>
              <p className="mt-2 text-sm text-slate-500">Delivery window: {activeOrder.deliveryWindow.windowLabel}</p>
              {activeOrder.confirmedWeightKg ? (
                <p className="mt-2 text-sm text-slate-500">Confirmed weight: {activeOrder.confirmedWeightKg.toFixed(1)} kg</p>
              ) : null}
              <p className="mt-4 text-lg font-semibold text-ink">{formatCurrency(activeOrder.estimatedTotal)}</p>
              {activeOrder.invoiceId ? (
                <Link
                  to={buildPath.customerInvoice(activeOrder.invoiceId)}
                  className="mt-4 inline-flex rounded-full border border-load-200 px-4 py-2 text-sm font-semibold text-load-700 transition hover:bg-load-50"
                >
                  View invoice
                </Link>
              ) : null}
            </div>
            <OrderStatusTimeline status={activeOrder.status} />
          </div>
        ) : (
          <EmptyState
            title="No active order"
            description="Your completed orders remain in the history below, ready for quick reorder."
          />
        )}
      </SectionCard>

      <SectionCard
        title="Order history and quick reorder"
        description="View completed orders and place a similar booking again with one action."
      >
        {orders.length === 0 ? (
          <EmptyState title="No order history" description="Your booking activity will appear here after your first LOAD order." />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {orders.map((order) => (
              <article key={order.id} className="rounded-3xl border border-load-100 bg-white p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink">#{order.id}</p>
                    <p className="mt-1 text-sm text-slate-500">{order.friendlyStatus}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => repeatOrderMutation.mutate(order.id)}
                    disabled={repeatOrderMutation.isPending}
                    className="rounded-full border border-load-200 bg-white px-4 py-2 text-sm font-semibold text-load-700 transition hover:bg-load-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Repeat order
                  </button>
                </div>
                <p className="mt-3 text-sm text-slate-600">Pickup: {order.pickupWindow.windowLabel}</p>
                <p className="mt-1 text-sm text-slate-600">Delivery: {order.deliveryWindow.windowLabel}</p>
                <p className="mt-1 text-sm text-slate-600">Payment: {order.paymentStatus?.replaceAll('_', ' ') ?? 'Pending'}</p>
                {order.confirmedWeightKg ? (
                  <p className="mt-1 text-sm text-slate-600">Confirmed weight: {order.confirmedWeightKg.toFixed(1)} kg</p>
                ) : null}
                <p className="mt-4 text-lg font-semibold text-ink">{formatCurrency(order.estimatedTotal)}</p>
                {order.invoiceId ? (
                  <div className="mt-4">
                    <Link
                      to={buildPath.customerInvoice(order.invoiceId)}
                      className="inline-flex rounded-full border border-load-200 px-4 py-2 text-sm font-semibold text-load-700 transition hover:bg-load-50"
                    >
                      Open invoice
                    </Link>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  )
}
