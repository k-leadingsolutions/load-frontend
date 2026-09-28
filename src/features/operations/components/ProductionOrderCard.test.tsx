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

describe('ProductionOrderCard customer name display', () => {
  it('renders a real customer name when the backend has resolved one', () => {
    renderCard({ ...baseOrder, orderNumber: 'LD10482', customerName: 'Thando Mokoena' })

    expect(screen.getByText('Thando Mokoena')).toBeInTheDocument()
  })

  it('never renders the synthetic Operations customer placeholder text', () => {
    renderCard({
      ...baseOrder,
      orderNumber: 'LD10482',
      customerName: 'Customer details available in the LOAD operations system',
    })

    expect(screen.queryByText(/Customer details available in the LOAD operations system/i)).not.toBeInTheDocument()
  })

  it('omits the customer line cleanly (no fabricated name) when customerName merely mirrors the order label', () => {
    renderCard({ ...baseOrder, orderNumber: 'LD10482', customerName: 'LD10482' })

    // Order number itself is still shown once (as "#LD10482"), but must not
    // also be duplicated as if it were a customer name.
    expect(screen.getByText('#LD10482')).toBeInTheDocument()
    expect(screen.queryByText('LD10482', { selector: 'h2' })).not.toBeInTheDocument()
  })
})
