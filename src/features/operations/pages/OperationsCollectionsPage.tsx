import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { LoadingState } from '@/components/ui/LoadingState'
import { SectionCard } from '@/components/ui/SectionCard'
import { apiOperationsService } from '@/services/api/operationsService'
import { getOperationsCustomerDisplayName } from '@/services/api/adapters'
import { formatWindowDateAndTime } from '@/utils/format'
import type { ApiError } from '@/domain/api'
import type { DriverAssignment, ProductionOrder } from '@/domain/models'

const QUERY_KEYS = {
  orders: ['operations-orders'],
  assignments: ['operations-driver-assignments'],
  drivers: ['operations-available-drivers'],
} as const

/**
 * `customerName` sometimes mirrors the same `orderNumber`/`orderId` already
 * shown as the order label, or is the synthetic backend placeholder (the
 * backend does not yet expose customer name enrichment to
 * Operations/Driver assignments) — never repeat/display either as if it
 * were distinct real customer information.
 */
const assignmentCustomerSuffix = (assignment: DriverAssignment) => {
  const orderLabel = assignment.orderNumber ?? assignment.orderId
  const customerDisplayName = getOperationsCustomerDisplayName(assignment.customerName, orderLabel)
  return customerDisplayName ? ` · ${customerDisplayName}` : ''
}

/** Same rule as `assignmentCustomerSuffix`, for `ProductionOrder` records. */
const orderCustomerSuffix = (order: ProductionOrder) => {
  const orderLabel = order.orderNumber ?? order.id
  const customerDisplayName = getOperationsCustomerDisplayName(order.customerName, orderLabel)
  return customerDisplayName ? ` · ${customerDisplayName}` : ''
}

/**
 * Server-authoritative dispatch eligibility, mirrored here only for display
 * filtering (the backend's `DispatchEligibilityService` remains the sole
 * enforcement point — this can never override it, only avoid showing an
 * order Operations could not actually dispatch). DELIVERY requires invoice
 * READY + payment CONFIRMED; STORE_COLLECTION only requires invoice READY.
 */
const isDispatchEligible = (order: ProductionOrder): boolean => {
  if (order.invoiceStatus !== 'READY') {
    return false
  }
  if (order.fulfilmentType === 'STORE_COLLECTION') {
    return true
  }
  return order.paymentStatus === 'CONFIRMED'
}

/** Orders still awaiting a Driver PICKUP assignment — the collection leg every order starts with. */
const needsPickupAssignment = (order: ProductionOrder, assignments: DriverAssignment[]) =>
  order.fulfilmentType === 'DELIVERY' &&
  (order.status === 'BOOKING_RECEIVED' || order.status === 'PICKUP_SCHEDULED') &&
  !assignments.some((assignment) => assignment.orderId === order.id && assignment.stopType === 'PICKUP')

export const OperationsCollectionsPage = () => {
  const queryClient = useQueryClient()
  const [actionError, setActionError] = useState<ApiError | null>(null)
  const [selectedDriverByOrder, setSelectedDriverByOrder] = useState<Record<string, string>>({})

  const ordersQuery = useQuery({
    queryKey: QUERY_KEYS.orders,
    queryFn: () => apiOperationsService.listProductionOrders(),
  })
  const assignmentsQuery = useQuery({
    queryKey: QUERY_KEYS.assignments,
    queryFn: () => apiOperationsService.listDriverAssignments(),
  })
  const driversQuery = useQuery({
    queryKey: QUERY_KEYS.drivers,
    queryFn: () => apiOperationsService.listAvailableDrivers(),
  })

  const isLoading = ordersQuery.isLoading || assignmentsQuery.isLoading || driversQuery.isLoading
  const isError = ordersQuery.isError || assignmentsQuery.isError || driversQuery.isError

  const refreshOrders = () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.orders })
  const refreshAssignments = () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.assignments })

  const reviewMutation = useMutation({
    mutationFn: ({ assignmentId, decision }: { assignmentId: string; decision: 'APPROVED' | 'REJECTED' }) =>
      apiOperationsService.reviewRescheduleRequest(assignmentId, decision),
    onSuccess: (response) => {
      setActionError(response.error ?? null)
      refreshAssignments()
    },
  })
  const retryMutation = useMutation({
    mutationFn: (assignmentId: string) => apiOperationsService.retryFailedAttempt(assignmentId),
    onSuccess: (response) => {
      setActionError(response.error ?? null)
      refreshAssignments()
    },
  })
  const dispatchMutation = useMutation({
    mutationFn: (orderId: string) => apiOperationsService.dispatchForDelivery(orderId),
    onSuccess: (response) => {
      setActionError(response.error ?? null)
      refreshOrders()
    },
  })
  const storeCollectionMutation = useMutation({
    mutationFn: (orderId: string) => apiOperationsService.completeStoreCollection(orderId),
    onSuccess: (response) => {
      setActionError(response.error ?? null)
      refreshOrders()
    },
  })
  const assignDriverMutation = useMutation({
    mutationFn: ({ orderId, driverId }: { orderId: string; driverId: string }) =>
      apiOperationsService.assignDriver(orderId, driverId),
    onSuccess: (response, variables) => {
      setActionError(response.error ?? null)
      if (!response.error) {
        setSelectedDriverByOrder((current) => {
          const { [variables.orderId]: _removed, ...rest } = current
          return rest
        })
      }
      refreshOrders()
      refreshAssignments()
    },
  })

  const orders = ordersQuery.data?.data ?? []
  const assignments = assignmentsQuery.data?.data ?? []
  const drivers = driversQuery.data?.data ?? []
  const driverNameById = new Map(drivers.map((driver) => [driver.id, driver.name]))
  const orderById = new Map(orders.map((order) => [order.id, order]))

  const rescheduleRequests = assignments.filter((assignment) => assignment.stopStatus === 'RESCHEDULE_REQUESTED')
  const failedAttempts = assignments.filter((assignment) => assignment.stopStatus === 'FAILED')
  const scheduledStops = assignments
    .filter((assignment) => !['RESCHEDULE_REQUESTED', 'FAILED', 'DELIVERED', 'COLLECTED'].includes(assignment.stopStatus))
    .sort((a, b) => a.stopIndex - b.stopIndex)
  const awaitingPickupAssignment = orders.filter((order) => needsPickupAssignment(order, assignments))
  const readyForDelivery = orders.filter(
    (order) => order.status === 'READY_FOR_DISPATCH' && order.fulfilmentType === 'DELIVERY' && isDispatchEligible(order),
  )
  const readyForStoreCollection = orders.filter(
    (order) => order.status === 'READY_FOR_DISPATCH' && order.fulfilmentType === 'STORE_COLLECTION' && isDispatchEligible(order),
  )

  const isMutating =
    reviewMutation.isPending ||
    retryMutation.isPending ||
    dispatchMutation.isPending ||
    storeCollectionMutation.isPending ||
    assignDriverMutation.isPending

  const scheduledStopLabel = (assignment: DriverAssignment) => {
    const order = orderById.get(assignment.orderId)
    return assignment.orderNumber ?? order?.orderNumber ?? assignment.orderId
  }

  const scheduledStopWindow = (assignment: DriverAssignment) => {
    const order = orderById.get(assignment.orderId)
    if (!order) {
      return undefined
    }
    return assignment.stopType === 'PICKUP'
      ? formatWindowDateAndTime(order.pickupWindowDate, order.pickupWindowLabel)
      : formatWindowDateAndTime(order.deliveryWindowDate, order.deliveryWindowLabel)
  }

  const scheduledStopDriverName = (assignment: DriverAssignment) =>
    driverNameById.get(assignment.driverId) || (assignment.driverName || undefined)

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
            title="Awaiting pickup assignment"
            description="DELIVERY orders that still need a real Driver assigned to their PICKUP (collection) stop."
          >
            {awaitingPickupAssignment.length === 0 ? (
              <EmptyState title="Nothing awaiting assignment" description="Unassigned DELIVERY bookings will appear here." />
            ) : (
              <ul className="space-y-3">
                {awaitingPickupAssignment.map((order) => {
                  const selectedDriverId = selectedDriverByOrder[order.id] ?? ''
                  const pickupWindow = formatWindowDateAndTime(order.pickupWindowDate, order.pickupWindowLabel)
                  return (
                    <li key={order.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-load-100 p-4">
                      <div>
                        <p className="text-sm font-semibold text-ink">#{order.orderNumber ?? order.id}{orderCustomerSuffix(order)}</p>
                        <p className="mt-1 text-sm text-slate-500">{pickupWindow ? `Collection window: ${pickupWindow}` : 'No collection window recorded'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {drivers.length === 0 ? (
                          <span className="text-sm text-slate-500">No Drivers registered</span>
                        ) : (
                          <select
                            aria-label={`Select a Driver for order ${order.orderNumber ?? order.id}`}
                            value={selectedDriverId}
                            disabled={isMutating}
                            onChange={(event) =>
                              setSelectedDriverByOrder((current) => ({ ...current, [order.id]: event.target.value }))
                            }
                            className="rounded-full border border-load-200 bg-white px-3 py-2 text-sm text-ink"
                          >
                            <option value="">Select a Driver</option>
                            {drivers.map((driver) => (
                              <option key={driver.id} value={driver.id}>
                                {driver.name}
                              </option>
                            ))}
                          </select>
                        )}
                        <button
                          type="button"
                          disabled={isMutating || !selectedDriverId}
                          onClick={() => assignDriverMutation.mutate({ orderId: order.id, driverId: selectedDriverId })}
                          className="rounded-full bg-load-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-load-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Assign driver
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </SectionCard>

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
                      <p className="text-sm font-semibold text-ink">Order #{assignment.orderNumber ?? assignment.orderId}{assignmentCustomerSuffix(assignment)}</p>
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
                        Order #{assignment.orderNumber ?? assignment.orderId}{assignmentCustomerSuffix(assignment)} · {assignment.stopType === 'PICKUP' ? 'Collection' : 'Delivery'}
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
                      <p className="text-sm font-semibold text-ink">#{order.orderNumber ?? order.id}{orderCustomerSuffix(order)}</p>
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
                      <p className="text-sm font-semibold text-ink">#{order.orderNumber ?? order.id}{orderCustomerSuffix(order)}</p>
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
                {scheduledStops.map((assignment) => {
                  const driverName = scheduledStopDriverName(assignment)
                  const window = scheduledStopWindow(assignment)
                  return (
                    <li key={assignment.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-load-100 p-4 text-sm">
                      <span className="font-semibold text-ink">
                        #{scheduledStopLabel(assignment)} · {assignment.stopType === 'PICKUP' ? 'Pickup' : 'Delivery'}
                        {driverName ? ` · ${driverName}` : ''}
                        {window ? ` · ${window}` : ''}
                      </span>
                      <span className="text-slate-500">{assignment.stopStatus}</span>
                    </li>
                  )
                })}
              </ol>
            )}
          </SectionCard>
        </>
      ) : null}
    </div>
  )
}
