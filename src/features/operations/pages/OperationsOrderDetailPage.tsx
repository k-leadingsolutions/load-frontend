import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { LoadingState } from '@/components/ui/LoadingState'
import { SectionCard } from '@/components/ui/SectionCard'
import { mockCustomerOrderService, mockOperationsService, mockPosReadService } from '@/services/mock'
import type { PosVendorInvoiceRecord, PosVendorOrderRecord } from '@/services/pos/posContracts'

const fetchPosSnapshot = async (orderId: string) => {
  try {
    const [intake, invoice] = await Promise.all([
      mockPosReadService.getOrderIntakeStatus(orderId),
      mockPosReadService.getInvoiceForOrder(orderId),
    ])
    return { available: true as const, intake, invoice }
  } catch {
    // POS unavailability must never block Operations from seeing LOAD's own operational data.
    return { available: false as const, intake: null as PosVendorOrderRecord | null, invoice: null as PosVendorInvoiceRecord | null }
  }
}

export const OperationsOrderDetailPage = () => {
  const { orderId = '' } = useParams<{ orderId: string }>()
  const queryClient = useQueryClient()

  const productionOrderQuery = useQuery({
    queryKey: ['operations-order', orderId],
    queryFn: () => mockOperationsService.getProductionOrder(orderId),
    enabled: Boolean(orderId),
  })
  const laundryOrderQuery = useQuery({
    queryKey: ['operations-laundry-order', orderId],
    queryFn: () => mockCustomerOrderService.getOrder(orderId),
    enabled: Boolean(orderId),
  })
  const assignmentsQuery = useQuery({
    queryKey: ['operations-driver-assignments'],
    queryFn: () => mockOperationsService.listDriverAssignments(),
  })
  const posQuery = useQuery({
    queryKey: ['operations-pos-snapshot', orderId],
    queryFn: () => fetchPosSnapshot(orderId),
    enabled: Boolean(orderId),
  })

  const refreshOrder = () => queryClient.invalidateQueries({ queryKey: ['operations-order', orderId] })
  const noteMutation = useMutation({
    mutationFn: (note: string) => mockOperationsService.addInternalNote(orderId, note),
    onSuccess: refreshOrder,
  })

  const isLoading = productionOrderQuery.isLoading || laundryOrderQuery.isLoading
  const productionOrder = productionOrderQuery.data?.data
  const laundryOrder = laundryOrderQuery.data?.data
  const relatedStops = (assignmentsQuery.data?.data ?? []).filter((assignment) => assignment.orderId === orderId)

  if (isLoading) return <LoadingState />
  if (!productionOrder) {
    return <ErrorState title="Order not found" message={`No operational record exists for #${orderId}.`} />
  }

  return (
    <div className="space-y-6">
      <SectionCard
        title={`Order #${productionOrder.id}`}
        description={`${productionOrder.customerName} · ${productionOrder.suburb}`}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-caption text-muted">Fulfilment type</p>
            <p className="text-body font-semibold text-ink">
              {productionOrder.fulfilmentType === 'STORE_COLLECTION' ? 'Store collection' : productionOrder.fulfilmentType ?? 'Unknown'}
            </p>
          </div>
          <div>
            <p className="text-caption text-muted">Operational status</p>
            <p className="text-body font-semibold text-ink">{productionOrder.stageLabel}</p>
          </div>
          <div>
            <p className="text-caption text-muted">Assigned driver</p>
            <p className="text-body font-semibold text-ink">{productionOrder.assignedDriverName ?? 'Not yet assigned'}</p>
          </div>
          <div>
            <p className="text-caption text-muted">Quantity review</p>
            <p className="text-body font-semibold text-ink">{productionOrder.quantityReviewStatus}</p>
          </div>
        </div>

        {laundryOrder ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {laundryOrder.pickupWindow ? (
              <div>
                <p className="text-caption text-muted">Collection window</p>
                <p className="text-body text-ink">{laundryOrder.pickupWindow.windowLabel}</p>
              </div>
            ) : null}
            {laundryOrder.deliveryWindow ? (
              <div>
                <p className="text-caption text-muted">Delivery window</p>
                <p className="text-body text-ink">{laundryOrder.deliveryWindow.windowLabel}</p>
              </div>
            ) : null}
          </div>
        ) : null}
      </SectionCard>

      <SectionCard title="Selected services">
        <ul className="space-y-1 text-sm text-slate-600">
          {productionOrder.itemsSummary.map((item) => (
            <li key={item}>• {item}</li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard
        title="Invoice & payment visibility"
        description="Read-only, sourced from the POS boundary. Final commercial pricing remains POS-owned."
      >
        {laundryOrder ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-caption text-muted">Invoice status</p>
              <p className="text-body font-semibold text-ink">{laundryOrder.invoiceStatus ?? 'NOT_AVAILABLE'}</p>
            </div>
            <div>
              <p className="text-caption text-muted">Payment status</p>
              <p className="text-body font-semibold text-ink">{laundryOrder.paymentStatus}</p>
            </div>
            {laundryOrder.finalInvoiceTotal !== undefined ? (
              <div>
                <p className="text-caption text-muted">Final invoice amount</p>
                <p className="text-body font-semibold text-ink">R{laundryOrder.finalInvoiceTotal.toFixed(2)}</p>
              </div>
            ) : null}
          </div>
        ) : (
          <EmptyState title="No LOAD order record" description="This production order has no linked LOAD booking record yet." />
        )}
        {!posQuery.isLoading && posQuery.data && !posQuery.data.available ? (
          <p className="mt-3 text-sm text-amber-600">POS is currently unavailable — operational workflow continues unaffected.</p>
        ) : null}
        {!posQuery.isLoading && posQuery.data?.available ? (
          <p className="mt-3 text-sm text-slate-500">
            POS order: {posQuery.data.intake ? 'linked' : 'not linked'} · POS invoice: {posQuery.data.invoice ? posQuery.data.invoice.vendorStatus : 'pending'}
          </p>
        ) : null}
      </SectionCard>

      {relatedStops.length > 0 ? (
        <SectionCard title="Driver stops for this order">
          <ul className="space-y-2 text-sm text-slate-600">
            {relatedStops.map((stop) => (
              <li key={stop.id} className="flex items-center justify-between rounded-2xl border border-load-100 p-3">
                <span>{stop.stopType === 'PICKUP' ? 'Collection' : 'Delivery'} · Stop #{stop.stopIndex}</span>
                <span className="font-semibold text-ink">{stop.stopStatus}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      ) : null}

      <SectionCard title="Operational notes" description="Internal, Operations-only notes and timeline.">
        <ul className="space-y-1 text-sm text-slate-600">
          {productionOrder.internalNotes.length > 0
            ? productionOrder.internalNotes.map((item) => <li key={item}>• {item}</li>)
            : <li>No notes yet.</li>}
        </ul>
        <form
          className="mt-4 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            const form = event.currentTarget
            const input = form.elements.namedItem('note') as HTMLInputElement
            if (!input.value.trim()) return
            noteMutation.mutate(input.value.trim())
            input.value = ''
          }}
        >
          <input
            name="note"
            placeholder="Add an operational note"
            className="w-full rounded-2xl border border-load-200 px-4 py-3 text-sm text-ink outline-none focus:border-load-500 focus:ring-4 focus:ring-load-100"
          />
          <button
            type="submit"
            disabled={noteMutation.isPending}
            className="rounded-full bg-load-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-load-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Save
          </button>
        </form>
      </SectionCard>
    </div>
  )
}
