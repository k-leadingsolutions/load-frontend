import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/app/providers/useAuth'
import { appPaths } from '@/app/router/paths'
import { AuthInput } from '@/features/auth/components/AuthInput'
import type { LoginFormValues } from '@/features/auth/schemas'
import { loginSchema } from '@/features/auth/schemas'

const SsoButton = ({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex h-11 w-11 items-center justify-center rounded-full border border-card-border bg-white text-lg shadow-card transition hover:shadow-panel"
    aria-label={`Continue with ${label}`}
  >
    {icon}
  </button>
)

export const LoginPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const locationState = location.state as { from?: { pathname?: string } } | null
  const redirectTo = locationState?.from?.pathname ?? appPaths.customerHome

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      emailOrMobile: '+27 82 555 0142',
      password: 'Load@1234',
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null)
    try {
      // Determine if emailOrMobile is a mobile number or email
      const isMobile = values.emailOrMobile.startsWith('+')
      await login({
        mobileNumber: isMobile ? values.emailOrMobile : '+27 82 555 0142',
        password: values.password,
      })
      navigate(redirectTo, { replace: true })
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Unable to sign in.')
    }
  })

  const handleSsoMock = (provider: string) => {
    alert(`${provider} SSO — mock only for current UI phase.`)
  }

  return (
    <div className="flex min-h-[calc(100vh-120px)] items-center justify-center py-8">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <span className="text-4xl font-light tracking-tight text-load-600">load</span>
          <p className="mt-1 text-xs uppercase tracking-widest text-muted">Laundry · Coffee · More</p>
        </div>

        {/* Card */}
        <div className="rounded-panel border border-card-border bg-white p-8 shadow-panel">
          <h1 className="text-heading text-ink">Log In</h1>
          <p className="mt-1 text-body text-muted">Welcome back! Please log in to continue.</p>

          {submitError ? (
            <div role="alert" className="mt-4 rounded-card border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {submitError}
            </div>
          ) : null}

          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            <AuthInput
              id="emailOrMobile"
              label="Email or Phone Number"
              autoComplete="username"
              placeholder="example@email.com"
              error={errors.emailOrMobile?.message}
              {...register('emailOrMobile')}
            />
            <div>
              <AuthInput
                id="password"
                label="Password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                error={errors.password?.message}
                {...register('password')}
              />
              <div className="mt-1 flex items-center justify-between">
                <label className="flex items-center gap-2 text-body text-muted">
                  <input type="checkbox" className="rounded border-load-200" {...register('rememberMe')} />
                  Remember me
                </label>
                <Link to={appPaths.forgotPassword} className="text-sm font-medium text-load-600 hover:text-load-700">
                  Forgot Password?
                </Link>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="h-12 w-full rounded-pill bg-load-600 text-sm font-semibold text-white transition hover:bg-load-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Signing in…' : 'Log In'}
            </button>
          </form>

          {/* SSO */}
          <div className="mt-6">
            <p className="text-center text-caption text-muted">or continue with</p>
            <div className="mt-3 flex justify-center gap-4">
              <SsoButton icon="🍎" label="Apple" onClick={() => handleSsoMock('Apple')} />
              <SsoButton icon="G" label="Google" onClick={() => handleSsoMock('Google')} />
              <SsoButton icon="f" label="Facebook" onClick={() => handleSsoMock('Facebook')} />
            </div>
          </div>

          <p className="mt-6 text-center text-body text-muted">
            Don't have an account?{' '}
            <Link className="font-semibold text-load-600" to={appPaths.register}>
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
