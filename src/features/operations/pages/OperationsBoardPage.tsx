import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { LoadingState } from '@/components/ui/LoadingState'
import { SectionCard } from '@/components/ui/SectionCard'
import { ProductionOrderCard } from '@/features/operations/components/ProductionOrderCard'
import { apiOperationsService } from '@/services/api/operationsService'

export const OperationsBoardPage = () => {
  const queryClient = useQueryClient()
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['operations-orders'],
    queryFn: () => apiOperationsService.listProductionOrders(),
  })
  const refreshOrders = () => queryClient.invalidateQueries({ queryKey: ['operations-orders'] })
  const confirmReceivedMutation = useMutation({
    mutationFn: (orderId: string) => apiOperationsService.confirmLaundryReceived(orderId),
    onSuccess: refreshOrders,
  })
  const quantityReviewMutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: 'CONFIRMED' | 'ADJUSTED' }) =>
      apiOperationsService.updateQuantityReview(orderId, status),
    onSuccess: refreshOrders,
  })
  const noteMutation = useMutation({
    mutationFn: ({ orderId, note }: { orderId: string; note: string }) =>
      apiOperationsService.addInternalNote(orderId, note),
    onSuccess: refreshOrders,
  })
  const advanceStageMutation = useMutation({
    mutationFn: (orderId: string) => apiOperationsService.advanceProductionStage(orderId),
    onSuccess: refreshOrders,
  })
  const qcMutation = useMutation({
    mutationFn: ({ orderId, passed, notes }: { orderId: string; passed: boolean; notes?: string }) =>
      apiOperationsService.performQC(orderId, { passed, ...(notes ? { notes } : {}) }),
    onSuccess: refreshOrders,
  })
  const recordIntakeMutation = useMutation({
    mutationFn: ({ orderId, weightKg, notes }: { orderId: string; weightKg?: number; notes?: string }) =>
      apiOperationsService.recordStoreIntake(orderId, {
        ...(weightKg !== undefined ? { weightKg } : {}),
        ...(notes ? { notes } : {}),
      }),
    onSuccess: refreshOrders,
  })

  return (
    <SectionCard
      title="Operations workflow"
      description="Receive orders, review quantities, capture notes, progress production stages, and clear QC-ready dispatches."
    >
      {isLoading ? <LoadingState /> : null}
      {isError ? (
        <ErrorState title="Unable to load operations board" message={error instanceof Error ? error.message : 'Unknown error'} />
      ) : null}
      {!isLoading && !isError && (!data?.data || data.data.length === 0) ? (
        <EmptyState title="No production orders" description="Operations orders will appear here once available." />
      ) : null}
      {!isLoading && !isError && data?.data ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {data.data.map((order) => (
            <ProductionOrderCard
              key={order.id}
              order={order}
              isMutating={
                confirmReceivedMutation.isPending
                || quantityReviewMutation.isPending
                || noteMutation.isPending
                || advanceStageMutation.isPending
                || qcMutation.isPending
                || recordIntakeMutation.isPending
              }
              onConfirmReceived={() => confirmReceivedMutation.mutate(order.id)}
              onQuantityReview={(status) => quantityReviewMutation.mutate({ orderId: order.id, status })}
              onAddNote={(note) => noteMutation.mutate({ orderId: order.id, note })}
              onAdvanceStage={() => advanceStageMutation.mutate(order.id)}
              onQcDecision={(passed, notes) => qcMutation.mutate({
                orderId: order.id,
                passed,
                ...(notes ? { notes } : {}),
              })}
              onRecordIntake={({ weightKg, notes }) => recordIntakeMutation.mutate({
                orderId: order.id,
                ...(weightKg !== undefined ? { weightKg } : {}),
                ...(notes ? { notes } : {}),
              })}
            />
          ))}
        </div>
      ) : null}
    </SectionCard>
  )
}
