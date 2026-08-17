import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { LoadingState } from '@/components/ui/LoadingState'
import { SectionCard } from '@/components/ui/SectionCard'
import { DriverAssignmentCard } from '@/features/driver/components/DriverAssignmentCard'
import { mockDriverService } from '@/services/mock'

export const DriverAssignmentsPage = () => {
  const queryClient = useQueryClient()
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
              isMutating={
                arrivalMutation.isPending
                || collectionMutation.isPending
                || deliveryMutation.isPending
                || failureMutation.isPending
              }
              onArrival={() => arrivalMutation.mutate(assignment.id)}
              onCollection={() => collectionMutation.mutate(assignment.id)}
              onDelivery={(proof) => deliveryMutation.mutate({ assignmentId: assignment.id, proof })}
              onFailure={(reason) => failureMutation.mutate({ assignmentId: assignment.id, reason })}
            />
          ))}
        </div>
      ) : null}
    </SectionCard>
  )
}
