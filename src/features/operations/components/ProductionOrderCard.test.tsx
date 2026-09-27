import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { ProductionOrder } from '@/domain/models'
import { ProductionOrderCard } from '@/features/operations/components/ProductionOrderCard'

const UUID = '3f2504e0-4f89-11d3-9a0c-0305e82c3301'

const noop = () => undefined

const baseOrder: ProductionOrder = {
  id: UUID,
  internalNotes: [],
  itemsSummary: ['2 x wash-fold (kg)'],
  quantityReviewStatus: 'PENDING',
  receivedAtStore: false,
  customerName: 'LD10482',
  suburb: '',
  status: 'BOOKING_RECEIVED',
  stageLabel: 'Booking received',
  qualityCheckPending: false,
}

const renderCard = (order: ProductionOrder) =>
  render(
    <MemoryRouter>
      <ProductionOrderCard
        isMutating={false}
        onAddNote={noop}
        onAdvanceStage={noop}
        onConfirmReceived={noop}
        onQuantityReview={noop}
        onRecordIntake={noop}
        onQcDecision={noop}
        order={order}
      />
    </MemoryRouter>,
  )

describe('ProductionOrderCard order number display', () => {
  it('shows the human-friendly orderNumber, not the raw UUID, when the backend has resolved one', () => {
    renderCard({ ...baseOrder, orderNumber: 'LD10482' })

    expect(screen.getByText('#LD10482')).toBeInTheDocument()
    expect(screen.queryByText(`#${UUID}`)).not.toBeInTheDocument()
  })

  it('falls back to the id when orderNumber is not present (e.g. mock fixtures using LD##### ids directly)', () => {
    renderCard({ ...baseOrder, id: 'LD10235' })

    expect(screen.getByText('#LD10235')).toBeInTheDocument()
  })
})
