import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { LoadingState } from '@/components/ui/LoadingState'
import { SectionCard } from '@/components/ui/SectionCard'
import type { RescheduleReason, VerificationMethod } from '@/domain/models'
import { DriverAssignmentCard } from '@/features/driver/components/DriverAssignmentCard'
import { mockDriverService } from '@/services/mock'

const TERMINAL_STATUSES = new Set(['COLLECTED', 'DELIVERED', 'COMPLETED'])

export const DriverAssignmentsPage = () => {
  const queryClient = useQueryClient()
  const { data, error, isError, isLoading } = useQuery({
    queryKey: ['driver-assignments'],
    queryFn: () => mockDriverService.listAssignments(),
  })

  const refreshAssignments = () => queryClient.invalidateQueries({ queryKey: ['driver-assignments'] })

  const enRouteMutation = useMutation({
    mutationFn: (assignmentId: string) => mockDriverService.confirmEnRoute(assignmentId),
    onSuccess: refreshAssignments,
  })
  const arrivalMutation = useMutation({
    mutationFn: (assignmentId: string) => mockDriverService.confirmArrival(assignmentId),
    onSuccess: refreshAssignments,
  })
  const collectionMutation = useMutation({
    mutationFn: (assignmentId: string) => mockDriverService.confirmCollection(assignmentId),
    onSuccess: refreshAssignments,
  })
  const deliveryMutation = useMutation({
    mutationFn: ({ assignmentId, proof }: { assignmentId: string; proof: string }) =>
      mockDriverService.confirmDelivery(assignmentId, proof),
    onSuccess: refreshAssignments,
  })
  const failureMutation = useMutation({
    mutationFn: ({ assignmentId, note, reason }: { assignmentId: string; reason: RescheduleReason; note?: string }) =>
      mockDriverService.recordFailure(assignmentId, reason, note),
    onSuccess: refreshAssignments,
  })
  const verifyMutation = useMutation({
    mutationFn: ({ assignmentId, code, method }: { assignmentId: string; method: VerificationMethod; code: string }) =>
      mockDriverService.verifyStop(assignmentId, method, code),
    onSuccess: refreshAssignments,
  })
  const rescheduleMutation = useMutation({
    mutationFn: ({ assignmentId, note, reason }: { assignmentId: string; reason: RescheduleReason; note?: string }) =>
      mockDriverService.requestReschedule(assignmentId, reason, note),
    onSuccess: refreshAssignments,
  })

  const isMutating =
    enRouteMutation.isPending
    || arrivalMutation.isPending
    || collectionMutation.isPending
    || deliveryMutation.isPending
    || failureMutation.isPending
    || verifyMutation.isPending
    || rescheduleMutation.isPending

  const sortedAssignments = useMemo(
    () => [...(data?.data ?? [])].sort((a, b) => a.stopIndex - b.stopIndex),
    [data?.data],
  )
  const activeAssignments = sortedAssignments.filter((assignment) => !TERMINAL_STATUSES.has(assignment.stopStatus))
  const completedAssignments = sortedAssignments.filter((assignment) => TERMINAL_STATUSES.has(assignment.stopStatus))

  return (
    <SectionCard title="Driver workflow" description="Manage pickups and deliveries with arrival, verification, collection/delivery, and failure capture.">
      {isLoading ? <LoadingState /> : null}
      {isError ? (
        <ErrorState title="Unable to load driver assignments" message={error instanceof Error ? error.message : 'Unknown error'} />
      ) : null}
      {!isLoading && !isError && sortedAssignments.length === 0 ? (
        <EmptyState title="No assignments" description="Driver tasks will appear here once routes are assigned." />
      ) : null}
      {!isLoading && !isError && activeAssignments.length > 0 ? (
        <div className="space-y-4">
          {activeAssignments.map((assignment) => (
            <DriverAssignmentCard
              key={assignment.id}
              assignment={assignment}
              isMutating={isMutating}
              onArrival={() => arrivalMutation.mutate(assignment.id)}
              onCollection={() => collectionMutation.mutate(assignment.id)}
              onDelivery={(proof) => deliveryMutation.mutate({ assignmentId: assignment.id, proof })}
              onEnRoute={() => enRouteMutation.mutate(assignment.id)}
              onFailure={(reason, note) => failureMutation.mutate({ assignmentId: assignment.id, reason, ...(note ? { note } : {}) })}
              onReschedule={(reason, note) => rescheduleMutation.mutate({ assignmentId: assignment.id, reason, ...(note ? { note } : {}) })}
              onVerify={(method, code) => verifyMutation.mutate({ assignmentId: assignment.id, method, code })}
            />
          ))}
        </div>
      ) : null}

      {!isLoading && !isError && completedAssignments.length > 0 ? (
        <div className="mt-8">
          <h3 className="text-sm font-semibold text-ink">Completed today</h3>
          <ul className="mt-2 space-y-2">
            {completedAssignments.map((assignment) => (
              <li key={assignment.id} className="rounded-2xl border border-load-100 bg-load-25 p-3 text-sm text-slate-600">
                Stop #{assignment.stopIndex} · {assignment.stopType} #{assignment.orderId} — {assignment.customerName}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </SectionCard>
  )
}
