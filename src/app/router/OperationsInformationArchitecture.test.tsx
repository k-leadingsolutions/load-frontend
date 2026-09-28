import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'

vi.mock('@/services/api/operationsService', async () => {
  const { mockOperationsService } = await import('@/services/mock')
  return { apiOperationsService: mockOperationsService }
})

import App from '@/App'
import { appPaths } from '@/app/router/paths'
import { OPERATIONS_AUTH_STORAGE_KEY } from '@/services/api/operationsSessionStore'
import type { OperationsProfile } from '@/domain/models'

/**
 * LOAD Operations information architecture rule: Orders, Production and More
 * are distinct destinations with distinct purposes. Orders is a read-only
 * master list (visibility + "View details"), Production is the full
 * intake/quantity/stage/QC/notes action board, and More is a secondary hub
 * that must not duplicate either. Regression coverage for a prior defect
 * where all three bottom-nav destinations rendered the identical workflow
 * board component.
 */

const mockOperationsSession: OperationsProfile = {
  id: 'ops-01',
  email: 'ops@load.co.za',
  role: 'OPERATIONS',
}

describe('Operations information architecture: Orders / Production / More', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.localStorage.setItem(OPERATIONS_AUTH_STORAGE_KEY, JSON.stringify(mockOperationsSession))
  })

  it('Orders: renders a read-only master list with no production action board', async () => {
    window.history.pushState({}, '', appPaths.operationsOrders)
    render(<App />)

    await screen.findByText('Operations orders')
    expect(await screen.findAllByRole('link', { name: /view details/i })).not.toHaveLength(0)

    expect(screen.queryByText('Operations workflow')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /confirm received/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /qc pass/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /save intake/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /save note/i })).not.toBeInTheDocument()
  })

  it('Production: renders the full workflow action board', async () => {
    window.history.pushState({}, '', appPaths.operationsProduction)
    render(<App />)

    await screen.findByText('Operations workflow')
    expect((await screen.findAllByRole('button', { name: 'Confirm received' })).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: /qc pass/i })[0]).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /save intake/i })[0]).toBeInTheDocument()

    expect(screen.queryByText('Operations orders')).not.toBeInTheDocument()
  })

  it('More: renders a secondary hub linking to Notifications and Reports, not Orders/Production content', async () => {
    window.history.pushState({}, '', appPaths.operationsMore)
    render(<App />)

    await screen.findByText('More', { selector: 'h2, h1, h3' })
    expect(screen.getByRole('link', { name: /notifications/i })).toHaveAttribute('href', appPaths.operationsNotifications)
    expect(screen.getByRole('link', { name: /reports/i })).toHaveAttribute('href', appPaths.operationsReports)

    expect(screen.queryByText('Operations workflow')).not.toBeInTheDocument()
    expect(screen.queryByText('Operations orders')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /confirm received/i })).not.toBeInTheDocument()
  })

  it('bottom nav is still the only primary navigation for Operations, with a distinct More target', async () => {
    window.history.pushState({}, '', appPaths.operationsDashboard)
    render(<App />)

    const nav = await screen.findByRole('navigation', { name: 'Operations navigation' })
    const moreLink = screen.getByRole('link', { name: /more/i })
    expect(nav).toContainElement(moreLink)
    expect(moreLink).toHaveAttribute('href', appPaths.operationsMore)
  })
})
