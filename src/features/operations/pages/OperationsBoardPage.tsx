import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { LoadingState } from '@/components/ui/LoadingState'
import { SectionCard } from '@/components/ui/SectionCard'
import { ProductionOrderCard } from '@/features/operations/components/ProductionOrderCard'
import { mockOperationsService } from '@/services/mock'

export const OperationsBoardPage = () => {
  const queryClient = useQueryClient()
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['operations-orders'],
    queryFn: () => mockOperationsService.listProductionOrders(),
  })
  const refreshOrders = () => queryClient.invalidateQueries({ queryKey: ['operations-orders'] })
  const confirmReceivedMutation = useMutation({
    mutationFn: (orderId: string) => mockOperationsService.confirmLaundryReceived(orderId),
    onSuccess: refreshOrders,
  })
  const quantityReviewMutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: 'CONFIRMED' | 'ADJUSTED' }) =>
      mockOperationsService.updateQuantityReview(orderId, status),
    onSuccess: refreshOrders,
  })
  const noteMutation = useMutation({
    mutationFn: ({ orderId, note }: { orderId: string; note: string }) =>
      mockOperationsService.addInternalNote(orderId, note),
    onSuccess: refreshOrders,
  })
  const advanceStageMutation = useMutation({
    mutationFn: (orderId: string) => mockOperationsService.advanceProductionStage(orderId),
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
              }
              onConfirmReceived={() => confirmReceivedMutation.mutate(order.id)}
              onQuantityReview={(status) => quantityReviewMutation.mutate({ orderId: order.id, status })}
              onAddNote={(note) => noteMutation.mutate({ orderId: order.id, note })}
              onAdvanceStage={() => advanceStageMutation.mutate(order.id)}
            />
          ))}
        </div>
      ) : null}
    </SectionCard>
  )
}
