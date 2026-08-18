import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { LoadingState } from '@/components/ui/LoadingState'
import { SectionCard } from '@/components/ui/SectionCard'
import type { RescheduleReason } from '@/domain/models'
import { DriverAssignmentCard } from '@/features/driver/components/DriverAssignmentCard'
import { mockDriverService } from '@/services/mock'

export const DriverAssignmentsPage = () => {
  const queryClient = useQueryClient()
  const [capturedWeights, setCapturedWeights] = useState<Record<string, number>>({})
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['driver-assignments'],
    queryFn: () => mockDriverService.listAssignments(),
  })
  const refreshAssignments = () => queryClient.invalidateQueries({ queryKey: ['driver-assignments'] })
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
    mutationFn: ({ assignmentId, reason }: { assignmentId: string; reason: string }) =>
      mockDriverService.recordFailure(assignmentId, reason),
    onSuccess: refreshAssignments,
  })
  const verifyMutation = useMutation({
    mutationFn: ({ assignmentId, code }: { assignmentId: string; code: string }) =>
      mockDriverService.verifyStop(assignmentId, 'OTP', code),
    onSuccess: refreshAssignments,
  })
  const rescheduleMutation = useMutation({
    mutationFn: ({ assignmentId, reason, note }: { assignmentId: string; reason: RescheduleReason; note?: string }) =>
      mockDriverService.requestReschedule(assignmentId, reason, note),
    onSuccess: refreshAssignments,
  })
  const weightMutation = useMutation({
    mutationFn: ({ assignmentId, weightKg }: { assignmentId: string; weightKg: number }) =>
      mockDriverService.captureWeight(assignmentId, weightKg),
    onSuccess: (_, variables) => {
      setCapturedWeights((current) => ({ ...current, [variables.assignmentId]: variables.weightKg }))
    },
  })

  return (
    <SectionCard title="Driver workflow" description="Manage pickups and deliveries with arrival, collection, proof, and failure capture.">
      {isLoading ? <LoadingState /> : null}
      {isError ? (
        <ErrorState title="Unable to load driver assignments" message={error instanceof Error ? error.message : 'Unknown error'} />
      ) : null}
      {!isLoading && !isError && (!data?.data || data.data.length === 0) ? (
        <EmptyState title="No assignments" description="Driver tasks will appear here once routes are assigned." />
      ) : null}
      {!isLoading && !isError && data?.data ? (
        <div className="space-y-4">
          {data.data.map((assignment) => (
            <DriverAssignmentCard
              key={assignment.id}
              assignment={assignment}
              capturedWeightKg={capturedWeights[assignment.id]}
              isMutating={
                arrivalMutation.isPending
                || collectionMutation.isPending
                || deliveryMutation.isPending
                || failureMutation.isPending
                || weightMutation.isPending
                || verifyMutation.isPending
                || rescheduleMutation.isPending
              }
              onArrival={() => arrivalMutation.mutate(assignment.id)}
              onCaptureWeight={(weightKg) => weightMutation.mutate({ assignmentId: assignment.id, weightKg })}
              onCollection={() => collectionMutation.mutate(assignment.id)}
              onDelivery={(proof) => deliveryMutation.mutate({ assignmentId: assignment.id, proof })}
              onFailure={(reason) => failureMutation.mutate({ assignmentId: assignment.id, reason })}
              onVerify={(code) => verifyMutation.mutate({ assignmentId: assignment.id, code })}
              onReschedule={(reason, note) => rescheduleMutation.mutate({
                assignmentId: assignment.id,
                reason: reason as RescheduleReason,
                ...(note ? { note } : {}),
              })}
            />
          ))}
        </div>
      ) : null}
    </SectionCard>
  )
}
