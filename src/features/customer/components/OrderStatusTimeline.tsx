import { ORDER_STATUS_MODEL, ORDER_STATUS_SEQUENCE } from '@/domain/orderStatus'
import type { OrderStatus } from '@/domain/models'

interface OrderStatusTimelineProps {
  status: OrderStatus
}

export const OrderStatusTimeline = ({ status }: OrderStatusTimelineProps) => {
  if (status === 'CANCELLED') {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
        This order was cancelled before completion.
      </div>
    )
  }

  const currentIndex = ORDER_STATUS_SEQUENCE.indexOf(status)
  const visibleStatuses = ORDER_STATUS_SEQUENCE.filter((item) => item !== 'CANCELLED')

  return (
    <div className="space-y-3">
      {visibleStatuses.map((item, index) => {
        const state =
          index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'upcoming'

        return (
          <div key={item} className="flex gap-3">
            <div className="mt-1 flex flex-col items-center">
              <div
                className={`h-3 w-3 rounded-full ${
                  state === 'done'
                    ? 'bg-load-600'
                    : state === 'current'
                      ? 'bg-emerald-500'
                      : 'bg-load-100'
                }`}
              />
              {index < visibleStatuses.length - 1 ? <div className="mt-1 h-8 w-px bg-load-100" /> : null}
            </div>
            <div className="pb-4">
              <p className="font-semibold text-ink">{ORDER_STATUS_MODEL[item].customerLabel}</p>
              <p className="text-sm text-slate-500">{ORDER_STATUS_MODEL[item].description}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
