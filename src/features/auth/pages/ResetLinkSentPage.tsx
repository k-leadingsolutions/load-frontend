import { Link, useLocation } from 'react-router-dom'
import { appPaths } from '@/app/router/paths'

export const ResetLinkSentPage = () => {
  const location = useLocation()
  const state = location.state as { destination?: string } | null
  const destination = state?.destination ?? 'example@email.com'

  return (
    <div className="flex min-h-[calc(100vh-120px)] items-center justify-center py-8">
      <div className="w-full max-w-sm">
        <div className="rounded-panel border border-card-border bg-white p-8 shadow-panel text-center">
          {/* Email icon */}
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-load-100">
            <span className="text-4xl" aria-hidden="true">✉️</span>
          </div>

          <h1 className="text-heading text-ink">Check Your Email</h1>
          <p className="mt-3 text-body text-muted">
            We've sent a password reset link to{' '}
            <span className="font-semibold text-ink">{destination}</span>
          </p>
          <p className="mt-2 text-caption text-muted">The link will expire in 15 minutes.</p>

          <div className="mt-8">
            <Link
              to={appPaths.login}
              className="inline-flex h-12 w-full items-center justify-center rounded-pill border-2 border-load-600 text-sm font-semibold text-load-600 transition hover:bg-load-50"
            >
              Back to Log In
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
