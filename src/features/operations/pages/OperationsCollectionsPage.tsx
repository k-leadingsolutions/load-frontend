import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { LoadingState } from '@/components/ui/LoadingState'
import { SectionCard } from '@/components/ui/SectionCard'
import { mockOperationsService } from '@/services/mock'
import type { ApiError } from '@/domain/api'

const QUERY_KEYS = {
  orders: ['operations-orders'],
  assignments: ['operations-driver-assignments'],
} as const

export const OperationsCollectionsPage = () => {
  const queryClient = useQueryClient()
  const [actionError, setActionError] = useState<ApiError | null>(null)

  const ordersQuery = useQuery({
    queryKey: QUERY_KEYS.orders,
    queryFn: () => mockOperationsService.listProductionOrders(),
  })
  const assignmentsQuery = useQuery({
    queryKey: QUERY_KEYS.assignments,
    queryFn: () => mockOperationsService.listDriverAssignments(),
  })

  const isLoading = ordersQuery.isLoading || assignmentsQuery.isLoading
  const isError = ordersQuery.isError || assignmentsQuery.isError

  const refreshOrders = () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.orders })
  const refreshAssignments = () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.assignments })

  const reviewMutation = useMutation({
    mutationFn: ({ assignmentId, decision }: { assignmentId: string; decision: 'APPROVED' | 'REJECTED' }) =>
      mockOperationsService.reviewRescheduleRequest(assignmentId, decision),
    onSuccess: (response) => {
      setActionError(response.error ?? null)
      refreshAssignments()
    },
  })
  const retryMutation = useMutation({
    mutationFn: (assignmentId: string) => mockOperationsService.retryFailedAttempt(assignmentId),
    onSuccess: (response) => {
      setActionError(response.error ?? null)
      refreshAssignments()
    },
  })
  const dispatchMutation = useMutation({
    mutationFn: (orderId: string) => mockOperationsService.dispatchForDelivery(orderId),
    onSuccess: (response) => {
      setActionError(response.error ?? null)
      refreshOrders()
    },
  })
  const storeCollectionMutation = useMutation({
    mutationFn: (orderId: string) => mockOperationsService.completeStoreCollection(orderId),
    onSuccess: (response) => {
      setActionError(response.error ?? null)
      refreshOrders()
    },
  })

  const orders = ordersQuery.data?.data ?? []
  const assignments = assignmentsQuery.data?.data ?? []

  const rescheduleRequests = assignments.filter((assignment) => assignment.stopStatus === 'RESCHEDULE_REQUESTED')
  const failedAttempts = assignments.filter((assignment) => assignment.stopStatus === 'FAILED')
  const scheduledStops = assignments
    .filter((assignment) => !['RESCHEDULE_REQUESTED', 'FAILED', 'DELIVERED', 'COLLECTED'].includes(assignment.stopStatus))
    .sort((a, b) => a.stopIndex - b.stopIndex)
  const readyForDelivery = orders.filter((order) => order.status === 'READY_FOR_DISPATCH' && order.fulfilmentType !== 'STORE_COLLECTION')
  const readyForStoreCollection = orders.filter((order) => order.status === 'READY_FOR_DISPATCH' && order.fulfilmentType === 'STORE_COLLECTION')

  const isMutating = reviewMutation.isPending || retryMutation.isPending || dispatchMutation.isPending || storeCollectionMutation.isPending

  return (
    <div className="space-y-6">
      {isLoading ? <LoadingState /> : null}
      {isError ? <ErrorState title="Unable to load collections & dispatch" message="Please try again." /> : null}
      {actionError ? (
        <ErrorState title="Action could not be completed" message={actionError.message} />
      ) : null}

      {!isLoading && !isError ? (
        <>
          <SectionCard
            title="Reschedule requests"
            description="Driver-initiated reschedule requests awaiting Operations review. Operations retains final scheduling authority."
          >
            {rescheduleRequests.length === 0 ? (
              <EmptyState title="No pending requests" description="Reschedule requests from Drivers will appear here." />
            ) : (
              <ul className="space-y-3">
                {rescheduleRequests.map((assignment) => (
                  <li key={assignment.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-load-100 p-4">
                    <div>
                      <p className="text-sm font-semibold text-ink">Order #{assignment.orderId} · {assignment.customerName}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {assignment.rescheduleReason ?? 'No reason provided'}
                        {assignment.rescheduleNote ? ` — ${assignment.rescheduleNote}` : ''}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={isMutating}
                        onClick={() => reviewMutation.mutate({ assignmentId: assignment.id, decision: 'APPROVED' })}
                        className="rounded-full bg-load-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-load-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={isMutating}
                        onClick={() => reviewMutation.mutate({ assignmentId: assignment.id, decision: 'REJECTED' })}
                        className="rounded-full border border-load-200 bg-white px-4 py-2 text-sm font-semibold text-load-700 transition hover:bg-load-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Reject
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard
            title="Failed attempts"
            description="Failed collection/delivery attempts requiring review. Retrying re-enters the normal Driver workflow rather than bypassing transition guards."
          >
            {failedAttempts.length === 0 ? (
              <EmptyState title="No failed attempts" description="Failed collection or delivery attempts will appear here." />
            ) : (
              <ul className="space-y-3">
                {failedAttempts.map((assignment) => (
                  <li key={assignment.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-load-100 p-4">
                    <div>
                      <p className="text-sm font-semibold text-ink">
                        Order #{assignment.orderId} · {assignment.customerName} · {assignment.stopType === 'PICKUP' ? 'Collection' : 'Delivery'}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {assignment.failureReason ?? 'No reason provided'}
                        {assignment.failureNote ? ` — ${assignment.failureNote}` : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={isMutating}
                      onClick={() => retryMutation.mutate(assignment.id)}
                      className="rounded-full bg-load-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-load-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Retry
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard
            title="Ready for dispatch (Driver delivery)"
            description="DELIVERY orders. Dispatch requires invoice READY and payment CONFIRMED — Operations cannot override financial truth."
          >
            {readyForDelivery.length === 0 ? (
              <EmptyState title="Nothing ready" description="Orders ready for Driver delivery dispatch will appear here." />
            ) : (
              <ul className="space-y-3">
                {readyForDelivery.map((order) => (
                  <li key={order.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-load-100 p-4">
                    <div>
                      <p className="text-sm font-semibold text-ink">#{order.id} · {order.customerName}</p>
                      <p className="mt-1 text-sm text-slate-500">{order.assignedDriverName ? `Driver: ${order.assignedDriverName}` : 'No driver assigned'}</p>
                    </div>
                    <button
                      type="button"
                      disabled={isMutating}
                      onClick={() => dispatchMutation.mutate(order.id)}
                      className="rounded-full bg-load-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-load-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Dispatch for delivery
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard
            title="Ready for store collection"
            description="STORE_COLLECTION orders. No Driver delivery assignment or online payment requirement applies."
          >
            {readyForStoreCollection.length === 0 ? (
              <EmptyState title="Nothing ready" description="Orders ready for Customer store collection will appear here." />
            ) : (
              <ul className="space-y-3">
                {readyForStoreCollection.map((order) => (
                  <li key={order.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-load-100 p-4">
                    <div>
                      <p className="text-sm font-semibold text-ink">#{order.id} · {order.customerName}</p>
                      <p className="mt-1 text-sm text-slate-500">Pay at store</p>
                    </div>
                    <button
                      type="button"
                      disabled={isMutating}
                      onClick={() => storeCollectionMutation.mutate(order.id)}
                      className="rounded-full bg-load-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-load-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Mark collected
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard title="Scheduled collections & deliveries" description="Ordered Driver stops, read-only.">
            {scheduledStops.length === 0 ? (
              <EmptyState title="No scheduled stops" description="Ordered Driver stops will appear here." />
            ) : (
              <ol className="space-y-2">
                {scheduledStops.map((assignment) => (
                  <li key={assignment.id} className="flex items-center justify-between rounded-2xl border border-load-100 p-4 text-sm">
                    <span className="font-semibold text-ink">#{assignment.stopIndex} · {assignment.customerName} · {assignment.stopType === 'PICKUP' ? 'Collection' : 'Delivery'}</span>
                    <span className="text-slate-500">{assignment.stopStatus}</span>
                  </li>
                ))}
              </ol>
            )}
          </SectionCard>
        </>
      ) : null}
    </div>
  )
}
