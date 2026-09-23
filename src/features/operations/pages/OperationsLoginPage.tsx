import { useState } from 'react'
import type React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useOperationsAuth } from '@/app/providers/useOperationsAuth'
import { appPaths } from '@/app/router/paths'

export const OperationsLoginPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useOperationsAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const locationState = location.state as { from?: { pathname?: string } } | null
  const redirectTo = locationState?.from?.pathname ?? appPaths.operationsDashboard

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitError(null)
    setIsSubmitting(true)
    try {
      await login({ email, password })
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
          <p className="mt-1 text-xs uppercase tracking-widest text-muted">Operations sign in</p>
        </div>

        <div className="rounded-panel border border-card-border bg-white p-8 shadow-panel">
          <h1 className="text-heading text-ink">Operations Log In</h1>
          <p className="mt-1 text-body text-muted">Sign in with your registered Operations email address.</p>

          {submitError ? (
            <div role="alert" className="mt-4 rounded-card border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {submitError}
            </div>
          ) : null}

          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            <div>
              <label htmlFor="operations-email" className="mb-1 block text-sm font-semibold text-ink">Email</label>
              <input
                id="operations-email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-2xl border border-load-200 px-4 py-3 text-sm text-ink outline-none focus:border-load-500 focus:ring-4 focus:ring-load-100"
              />
            </div>
            <div>
              <label htmlFor="operations-password" className="mb-1 block text-sm font-semibold text-ink">Password</label>
              <input
                id="operations-password"
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
