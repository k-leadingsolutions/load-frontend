import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { LoadingState } from '@/components/ui/LoadingState'
import { SectionCard } from '@/components/ui/SectionCard'
import { mockNotificationService } from '@/services/mock'

const formatTimestamp = (value: string) =>
  new Date(value).toLocaleString('en-ZA', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })

export const CustomerNotificationsPage = () => {
  const queryClient = useQueryClient()
  const notificationsQuery = useQuery({
    queryKey: ['customer-notifications'],
    queryFn: () => mockNotificationService.listNotifications('CUSTOMER'),
  })
  const markAllReadMutation = useMutation({
    mutationFn: () => mockNotificationService.markAllRead('CUSTOMER'),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['customer-notifications'] })
    },
  })

  if (notificationsQuery.isLoading) {
    return <LoadingState />
  }

  if (notificationsQuery.isError) {
    return <ErrorState title="Unable to load notifications" message={notificationsQuery.error instanceof Error ? notificationsQuery.error.message : 'Unknown error'} />
  }

  const notifications = notificationsQuery.data ?? []

  return (
    <SectionCard
      title="Notifications"
      description="Collection, weight confirmation, payment, and delivery updates appear here."
      action={(
        <button
          type="button"
          onClick={() => markAllReadMutation.mutate()}
          disabled={markAllReadMutation.isPending || notifications.length === 0}
          className="rounded-full border border-load-200 px-4 py-2 text-sm font-semibold text-load-700 transition hover:bg-load-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Mark all read
        </button>
      )}
    >
      {notifications.length === 0 ? (
        <EmptyState title="No notifications yet" description="Order and loyalty updates will appear here as your activity grows." />
      ) : (
        <ul className="space-y-3">
          {notifications.map((notification) => (
            <li
              key={notification.id}
              className={`rounded-3xl border p-4 ${notification.isRead ? 'border-load-100 bg-white' : 'border-load-200 bg-load-50/70'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-ink">{notification.title}</p>
                  <p className="mt-2 text-sm text-slate-600">{notification.body}</p>
                  {notification.orderId ? (
                    <p className="mt-2 text-xs font-medium uppercase tracking-wide text-load-700">Order #{notification.orderId}</p>
                  ) : null}
                </div>
                {!notification.isRead ? (
                  <span className="rounded-full bg-load-600 px-3 py-1 text-xs font-semibold text-white">New</span>
                ) : null}
              </div>
              <p className="mt-3 text-xs text-slate-500">{formatTimestamp(notification.createdAt)}</p>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  )
}
