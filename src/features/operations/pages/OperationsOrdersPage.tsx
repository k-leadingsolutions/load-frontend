import { useQuery } from '@tanstack/react-query'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { LoadingState } from '@/components/ui/LoadingState'
import { SectionCard } from '@/components/ui/SectionCard'
import { ProductionOrderCard } from '@/features/operations/components/ProductionOrderCard'
import { apiOperationsService } from '@/services/api/operationsService'

/**
 * Master order list/visibility for Operations. Read-only — no production action
 * board. Staff use "View details" to drill into a single order; workflow actions
 * (confirm received, QC, store intake, notes) live on the Production page only.
 */
export const OperationsOrdersPage = () => {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['operations-orders'],
    queryFn: () => apiOperationsService.listProductionOrders(),
  })

  return (
    <SectionCard
      title="Operations orders"
      description="Master visibility of every order moving through the LOAD pipeline. Open View details for the full order record."
    >
      {isLoading ? <LoadingState /> : null}
      {isError ? (
        <ErrorState title="Unable to load orders" message={error instanceof Error ? error.message : 'Unknown error'} />
      ) : null}
      {!isLoading && !isError && (!data?.data || data.data.length === 0) ? (
        <EmptyState title="No orders" description="Orders will appear here once available." />
      ) : null}
      {!isLoading && !isError && data?.data ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {data.data.map((order) => (
            <ProductionOrderCard key={order.id} order={order} variant="summary" />
          ))}
        </div>
      ) : null}
    </SectionCard>
  )
}
