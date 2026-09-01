import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import type React from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/app/providers/useAuth'
import { appPaths } from '@/app/router/paths'
import { AuthInput } from '@/features/auth/components/AuthInput'
import type { LoginFormValues } from '@/features/auth/schemas'
import { loginSchema } from '@/features/auth/schemas'

const AppleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 814 1000" className="h-5 w-5" fill="currentColor" aria-hidden="true">
    <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 790.7 0 663 0 541.8c0-207.5 135.4-317.3 267.6-317.3 70.2 0 128.7 45.9 172.3 45.9 41.8 0 108-48.8 185.9-48.8 29.7 0 133 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z" />
  </svg>
)

const GoogleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
)

const FacebookIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5" fill="#1877F2" aria-hidden="true">
    <path d="M24 12.073C24 5.404 18.627 0 12 0S0 5.404 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.267h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
  </svg>
)

const SsoButton = ({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex h-11 w-11 items-center justify-center rounded-full border border-card-border bg-white shadow-card transition hover:shadow-panel"
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
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      loginMethod: 'MOBILE',
      emailOrMobile: '+27 82 555 0142',
      password: 'Load@1234',
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null)
    try {
      await login({
        ...(values.loginMethod === 'MOBILE'
          ? { mobileNumber: values.emailOrMobile }
          : { email: values.emailOrMobile }),
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
              label={watch('loginMethod') === 'EMAIL' ? 'Email' : 'Phone Number'}
              autoComplete="username"
              placeholder={watch('loginMethod') === 'EMAIL' ? 'example@email.com' : '+27 82 555 0142'}
              error={errors.emailOrMobile?.message}
              {...register('emailOrMobile')}
            />
            <div className="grid grid-cols-2 gap-2 rounded-pill bg-load-50 p-1">
              <button
                type="button"
                onClick={() => setValue('loginMethod', 'EMAIL', { shouldDirty: true })}
                className={`h-9 rounded-pill text-xs font-semibold transition ${watch('loginMethod') === 'EMAIL' ? 'bg-white text-load-700 shadow-card' : 'text-muted'}`}
              >
                Email
              </button>
              <button
                type="button"
                onClick={() => setValue('loginMethod', 'MOBILE', { shouldDirty: true })}
                className={`h-9 rounded-pill text-xs font-semibold transition ${watch('loginMethod') === 'MOBILE' ? 'bg-white text-load-700 shadow-card' : 'text-muted'}`}
              >
                Mobile
              </button>
            </div>
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
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          {/* SSO */}
          <div className="mt-6">
            <p className="text-center text-caption text-muted">or continue with</p>
            <div className="mt-3 flex justify-center gap-4">
              <SsoButton icon={<AppleIcon />} label="Apple" onClick={() => handleSsoMock('Apple')} />
              <SsoButton icon={<GoogleIcon />} label="Google" onClick={() => handleSsoMock('Google')} />
              <SsoButton icon={<FacebookIcon />} label="Facebook" onClick={() => handleSsoMock('Facebook')} />
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
