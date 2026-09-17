import { useState } from 'react'
import type React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useDriverAuth } from '@/app/providers/useDriverAuth'
import { appPaths } from '@/app/router/paths'

export const DriverLoginPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useDriverAuth()
  const [mobileNumber, setMobileNumber] = useState('+27 71 555 0100')
  const [password, setPassword] = useState('Driver@1234')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const locationState = location.state as { from?: { pathname?: string } } | null
  const redirectTo = locationState?.from?.pathname ?? appPaths.driverDashboard

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitError(null)
    setIsSubmitting(true)
    try {
      await login({ mobileNumber, password })
      navigate(redirectTo, { replace: true })
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Unable to sign in.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-120px)] items-center justify-center py-8">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="text-4xl font-light tracking-tight text-load-600">load</span>
          <p className="mt-1 text-xs uppercase tracking-widest text-muted">Driver sign in</p>
        </div>

        <div className="rounded-panel border border-card-border bg-white p-8 shadow-panel">
          <h1 className="text-heading text-ink">Driver Log In</h1>
          <p className="mt-1 text-body text-muted">Sign in with your registered driver mobile number.</p>

          {submitError ? (
            <div role="alert" className="mt-4 rounded-card border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {submitError}
            </div>
          ) : null}

          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            <div>
              <label htmlFor="driver-mobile" className="mb-1 block text-sm font-semibold text-ink">Mobile number</label>
              <input
                id="driver-mobile"
                autoComplete="username"
                value={mobileNumber}
                onChange={(event) => setMobileNumber(event.target.value)}
                className="w-full rounded-2xl border border-load-200 px-4 py-3 text-sm text-ink outline-none focus:border-load-500 focus:ring-4 focus:ring-load-100"
              />
            </div>
            <div>
              <label htmlFor="driver-password" className="mb-1 block text-sm font-semibold text-ink">Password</label>
              <input
                id="driver-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-2xl border border-load-200 px-4 py-3 text-sm text-ink outline-none focus:border-load-500 focus:ring-4 focus:ring-load-100"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="h-12 w-full rounded-pill bg-load-600 text-sm font-semibold text-white transition hover:bg-load-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
