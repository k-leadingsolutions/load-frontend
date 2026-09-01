import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SectionCard } from '@/components/ui/SectionCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingState } from '@/components/ui/LoadingState'
import { mockNotificationService } from '@/services/mock'

export const DriverNotificationsPage = () => {
  const queryClient = useQueryClient()
  const notificationsQuery = useQuery({
    queryKey: ['driver-notifications'],
    queryFn: () => mockNotificationService.listNotifications('DRIVER'),
  })
  const markAllRead = useMutation({
    mutationFn: () => mockNotificationService.markAllRead('DRIVER'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['driver-notifications'] }),
  })

  if (notificationsQuery.isLoading) return <LoadingState />

  const notifications = notificationsQuery.data ?? []
  return (
    <SectionCard
      title="Driver notifications"
      description="New jobs, route updates, payment confirmations, and operations instructions."
      action={(
        <button
          type="button"
          onClick={() => markAllRead.mutate()}
          className="rounded-pill border border-card-border px-4 py-2 text-sm font-semibold text-load-700"
        >
          Mark all read
        </button>
      )}
    >
      {notifications.length === 0 ? (
        <EmptyState title="No notifications" description="New updates will appear here." />
      ) : (
        <ul className="space-y-2">
          {notifications.map((notification) => (
            <li key={notification.id} className={`rounded-card border p-3 ${notification.isRead ? 'border-card-border' : 'border-load-300 bg-load-50'}`}>
              <p className="font-semibold text-ink">{notification.title}</p>
              <p className="text-sm text-muted">{notification.body}</p>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  )
}

