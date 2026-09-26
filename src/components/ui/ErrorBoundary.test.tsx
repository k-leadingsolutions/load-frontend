import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'

const Bomb = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Boom: simulated render failure with sensitive internal detail')
  }
  return <p>Safe content</p>
}

/** Harness that lets a test flip the failing child back to a healthy render, simulating a real "Try again". */
const RetryHarness = () => {
  const [shouldThrow, setShouldThrow] = useState(true)
  return (
    <div>
      <button type="button" onClick={() => setShouldThrow(false)}>
        Fix the bug (test-only)
      </button>
      <ErrorBoundary safeRoute="/customer/home" safeRouteLabel="Back to Customer">
        <Bomb shouldThrow={shouldThrow} />
      </ErrorBoundary>
    </div>
  )
}

describe('ErrorBoundary', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    // React (and this boundary's own diagnostic logging) log to console.error
    // when a render throws — expected and intentional, so we silence it here
    // rather than let it pollute test output, while still asserting on calls.
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  it('renders children normally when nothing throws', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={false} />
      </ErrorBoundary>,
    )

    expect(screen.getByText('Safe content')).toBeInTheDocument()
  })

  it('catches a render error and shows a safe fallback instead of a blank screen', () => {
    render(
      <ErrorBoundary safeRoute="/driver/dashboard" safeRouteLabel="Back to Driver">
        <Bomb shouldThrow />
      </ErrorBoundary>,
    )

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.queryByText('Safe content')).not.toBeInTheDocument()
  })

  it('never exposes the underlying error message or stack trace to the user', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow />
      </ErrorBoundary>,
    )

    expect(screen.queryByText(/Boom/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/sensitive internal detail/i)).not.toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/at Bomb|\.tsx:\d+/)
  })

  it('offers a safe-route recovery link pointing at the provided route', () => {
    render(
      <ErrorBoundary safeRoute="/operations/dashboard" safeRouteLabel="Back to Operations">
        <Bomb shouldThrow />
      </ErrorBoundary>,
    )

    const link = screen.getByRole('link', { name: 'Back to Operations' })
    expect(link).toHaveAttribute('href', '/operations/dashboard')
  })

  it('defaults the safe-route link to app home when none is provided', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow />
      </ErrorBoundary>,
    )

    expect(screen.getByRole('link', { name: 'Return to safe area' })).toHaveAttribute('href', '/')
  })

  it('offers a "Try again" retry action that re-attempts rendering the children', async () => {
    const user = userEvent.setup()
    render(<RetryHarness />)

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()

    // Simulate the underlying condition being resolved, then retry. The
    // button lives outside the boundary (in the harness) so it stays
    // mounted even while the boundary shows its fallback for the crashed child.
    await user.click(screen.getByRole('button', { name: /fix the bug/i }))
    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('Safe content')).toBeInTheDocument()
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
  })
})
