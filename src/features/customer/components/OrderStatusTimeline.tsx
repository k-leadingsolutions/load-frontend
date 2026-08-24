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
  const visibleStatuses = ORDER_STATUS_SEQUENCE.filter((item) => item !== 'CANCELLED' && item !== 'RESCHEDULED')

  return (
    <div className="space-y-0">
      {visibleStatuses.map((item, index) => {
        const state: 'done' | 'current' | 'upcoming' =
          index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'upcoming'
        const isLast = index === visibleStatuses.length - 1

        return (
          <div key={item} className="flex gap-3">
            {/* Dot + connector line */}
            <div className="flex flex-col items-center">
              {/* Dot */}
              {state === 'done' ? (
                <div className="mt-1 flex h-3 w-3 flex-shrink-0 items-center justify-center rounded-full bg-load-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-white" aria-hidden="true" />
                </div>
              ) : state === 'current' ? (
                <div
                  className="mt-1 h-3 w-3 flex-shrink-0 rounded-full bg-status-success ring-4 ring-status-success/20"
                  aria-label="current step"
                />
              ) : (
                <div className="mt-1 h-3 w-3 flex-shrink-0 rounded-full border-2 border-load-200 bg-white" />
              )}

              {/* Connector line */}
              {!isLast ? (
                <div
                  className={`mt-1 w-px flex-1 ${
                    state === 'done'
                      ? 'bg-load-600'
                      : state === 'current'
                        ? 'bg-load-200'
                        : 'border-l-2 border-dashed border-load-100 bg-transparent'
                  }`}
                  style={{ minHeight: '2rem' }}
                />
              ) : null}
            </div>

            {/* Label */}
            <div className={`pb-4 ${state === 'upcoming' ? 'opacity-50' : ''}`}>
              <p
                className={`font-semibold ${
                  state === 'current' ? 'text-status-success' : state === 'done' ? 'text-ink' : 'text-muted'
                }`}
              >
                {ORDER_STATUS_MODEL[item].customerLabel}
              </p>
              <p className="text-sm text-muted">{ORDER_STATUS_MODEL[item].description}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
