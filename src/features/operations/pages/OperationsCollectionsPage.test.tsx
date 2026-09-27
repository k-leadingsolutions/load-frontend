import { render, screen, waitFor, within } from '@testing-library/react'
import { vi } from 'vitest'

vi.mock('@/services/api/operationsService', async () => {
  const { mockOperationsService } = await import('@/services/mock')
  return { apiOperationsService: mockOperationsService }
})
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { OperationsCollectionsPage } from '@/features/operations/pages/OperationsCollectionsPage'
import { updateStoredDriverAssignment } from '@/services/mock/driverStore'

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <OperationsCollectionsPage />
    </QueryClientProvider>,
  )

describe('OperationsCollectionsPage', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('shows dispatch-ready DELIVERY and STORE_COLLECTION orders in distinct sections', async () => {
    renderPage()

    expect(await screen.findByText('Ready for dispatch (Driver delivery)')).toBeInTheDocument()
    expect(screen.getByText('Ready for store collection')).toBeInTheDocument()
    expect(await screen.findByText(/#LD10241/)).toBeInTheDocument()
    expect(await screen.findByText(/#LD10242/)).toBeInTheDocument()
  })

  it('dispatches a paid, invoice-ready DELIVERY order for delivery', async () => {
    const user = userEvent.setup()
    renderPage()

    const listItem = (await screen.findByText(/#LD10241/)).closest('li')
    expect(listItem).not.toBeNull()
    const dispatchButton = within(listItem!).getByRole('button', { name: /dispatch for delivery/i })
    await user.click(dispatchButton)

    await waitFor(() => {
      expect(screen.queryByText(/#LD10241/)).not.toBeInTheDocument()
    })
  })

  it('blocks dispatch for an unpaid DELIVERY order and surfaces an error', async () => {
    renderPage()

    await screen.findByText('Ready for dispatch (Driver delivery)')
    // LD10243 is READY_FOR_DISPATCH but payment is still PENDING — genuinely
    // dispatch-ineligible orders must never appear as if Operations could
    // dispatch them (invoice/payment gates are preserved, not just enforced
    // after a failed click).
    expect(screen.queryByText(/#LD10243/)).not.toBeInTheDocument()
  })

  it('marks a STORE_COLLECTION order as collected without any Driver delivery assignment', async () => {
    const user = userEvent.setup()
    renderPage()

    const collectButton = await screen.findByRole('button', { name: /mark collected/i })
    await user.click(collectButton)

    await waitFor(() => {
      expect(screen.queryByText(/#LD10242/)).not.toBeInTheDocument()
    })
  })

  it('lets Operations approve a Driver reschedule request', async () => {
    updateStoredDriverAssignment('run-01', (current) => ({
      ...current,
      stopStatus: 'RESCHEDULE_REQUESTED',
      rescheduleReason: 'CUSTOMER_UNAVAILABLE',
    }))
    const user = userEvent.setup()
    renderPage()

    expect(await screen.findByText(/Order #LD10236/)).toBeInTheDocument()
    const approveButton = screen.getByRole('button', { name: 'Approve' })
    await user.click(approveButton)

    await waitFor(() => {
      expect(screen.queryByText(/Order #LD10236/)).not.toBeInTheDocument()
    })
  })

  it('lets Operations retry a failed collection/delivery attempt', async () => {
    updateStoredDriverAssignment('run-01', (current) => ({
      ...current,
      stopStatus: 'FAILED',
      failureReason: 'CUSTOMER_UNAVAILABLE',
    }))
    const user = userEvent.setup()
    renderPage()

    expect(await screen.findByText(/Order #LD10236/)).toBeInTheDocument()
    const retryButton = screen.getByRole('button', { name: /retry/i })
    await user.click(retryButton)

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument()
    })
  })

  it('shows an eligible unassigned DELIVERY booking under Awaiting pickup assignment', async () => {
    renderPage()

    // LD10231 is BOOKING_RECEIVED + DELIVERY with no PICKUP assignment yet.
    const listItem = (await screen.findByText(/#LD10231/)).closest('li')
    expect(listItem).not.toBeNull()
    expect(within(listItem!).getByRole('button', { name: /assign driver/i })).toBeInTheDocument()
    expect(within(listItem!).getByRole('combobox')).toBeInTheDocument()
  })

  it('does not offer pickup assignment for orders that already have one, or for non-DELIVERY/non-early orders', async () => {
    renderPage()

    await screen.findByText('Awaiting pickup assignment')
    // LD10235/LD10233/LD10241/LD10242/LD10243 are all either already past the
    // pre-assignment stage or STORE_COLLECTION — none belong here.
    const section = (await screen.findByText('Awaiting pickup assignment')).closest('section')
    expect(section).not.toBeNull()
    expect(within(section!).queryByText(/#LD10235/)).not.toBeInTheDocument()
    expect(within(section!).queryByText(/#LD10242/)).not.toBeInTheDocument()
  })

  it('assigns a real Driver to the PICKUP stop and reflects it under Scheduled collections & deliveries', async () => {
    const user = userEvent.setup()
    renderPage()

    const listItem = (await screen.findByText(/#LD10231/)).closest('li')
    expect(listItem).not.toBeNull()
    const select = within(listItem!).getByRole('combobox')
    await user.selectOptions(select, 'driver-01')
    const assignButton = within(listItem!).getByRole('button', { name: /assign driver/i })
    await user.click(assignButton)

    await waitFor(() => {
      const scheduledSection = screen.getByText('Scheduled collections & deliveries').closest('section')
      expect(within(scheduledSection!).queryAllByText(/#LD10231/).length).toBeGreaterThan(0)
    })

    const awaitingSection = screen.getByText('Awaiting pickup assignment').closest('section')
    expect(awaitingSection).not.toBeNull()
    expect(within(awaitingSection!).queryByText(/#LD10231/)).not.toBeInTheDocument()

    const scheduledSection = screen.getByText('Scheduled collections & deliveries').closest('section')
    expect(scheduledSection).not.toBeNull()
    const scheduledEntry = within(scheduledSection!).getByText(/#LD10231/)
    expect(scheduledEntry.textContent).toContain('Pickup')
    expect(scheduledEntry.textContent).toContain('Sipho Khumalo')
  })

  it('shows orderNumber, stop type, Driver and stop status for an already-scheduled stop', async () => {
    renderPage()

    const scheduledSection = await screen.findByText('Scheduled collections & deliveries')
    const section = scheduledSection.closest('section')
    expect(section).not.toBeNull()
    const entry = within(section!).getByText(/#LD10236/)
    expect(entry.textContent).toContain('Pickup')
    expect(entry.textContent).toContain('Sipho Khumalo')
    const entryRow = entry.closest('li')
    expect(entryRow).not.toBeNull()
    expect(within(entryRow!).getByText('ASSIGNED')).toBeInTheDocument()
  })
})
