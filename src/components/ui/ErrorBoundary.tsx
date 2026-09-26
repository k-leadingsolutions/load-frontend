import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
  /** Path to offer as the safe return action. Defaults to the app home. */
  safeRoute?: string
  /** Label for the safe-return action. */
  safeRouteLabel?: string
}

interface ErrorBoundaryState {
  hasError: boolean
}

/**
 * Production safety net for uncaught render errors. Wraps a section of the
 * tree (a role layout's routed content, or the whole app as a last resort)
 * so a failure in one screen degrades to a recoverable message instead of a
 * blank screen. Never surfaces the error message/stack to the user — only
 * logs it for local diagnostics.
 *
 * A plain `<a>` (not `Link`) is used for the safe-route action so this
 * component has no Router dependency and works even if the failure occurred
 * inside routing/provider code — clicking it performs a full navigation,
 * which also clears any stale in-memory error state.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Internal diagnostics only — never surfaced to the user, no monitoring
    // service wired up here (out of scope for this change).
    console.error('Unhandled render error caught by ErrorBoundary:', error, info.componentStack)
  }

  private handleRetry = () => this.setState({ hasError: false })

  render() {
    if (this.state.hasError) {
      const safeRoute = this.props.safeRoute ?? '/'
      const safeRouteLabel = this.props.safeRouteLabel ?? 'Return to safe area'

      return (
        <div
          role="alert"
          aria-live="assertive"
          className="rounded-panel border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700"
        >
          <p className="font-semibold">Something went wrong</p>
          <p className="mt-2">
            We hit an unexpected problem loading this screen. Your account and data are safe.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={this.handleRetry}
              className="rounded-full bg-load-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-load-700"
            >
              Try again
            </button>
            <a
              href={safeRoute}
              className="rounded-full border border-rose-300 bg-white px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
            >
              {safeRouteLabel}
            </a>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
