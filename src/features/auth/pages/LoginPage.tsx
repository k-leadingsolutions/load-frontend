import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/app/providers/useAuth'
import { appPaths } from '@/app/router/paths'
import { ErrorState } from '@/components/ui/ErrorState'
import { AuthInput } from '@/features/auth/components/AuthInput'
import { AuthShell } from '@/features/auth/components/AuthShell'
import type { LoginFormValues } from '@/features/auth/schemas'
import { loginSchema } from '@/features/auth/schemas'

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
      mobileNumber: '+27 82 555 0142',
      password: 'Load@1234',
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null)

    try {
      await login(values)
      navigate(redirectTo, { replace: true })
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Unable to sign in.')
    }
  })

  return (
    <AuthShell
      eyebrow="Customer sign in"
      title="Welcome back to LOAD"
      subtitle="Sign in to access your premium laundry dashboard, track active orders, and prepare for booking."
      footer={
        <p className="text-sm text-slate-500">
          New to LOAD?{' '}
          <Link className="font-semibold text-load-700" to={appPaths.register}>
            Create your account
          </Link>
        </p>
      }
    >
      <div className="space-y-5">
        <div>
          <h2 className="text-2xl font-semibold text-ink">Customer account access</h2>
          <p className="mt-2 text-sm text-slate-500">
            Demo credentials are prefilled for the current UI phase. You can also register a fresh mock account.
          </p>
        </div>

        {submitError ? <ErrorState title="Sign-in failed" message={submitError} /> : null}

        <form className="space-y-4" onSubmit={onSubmit}>
          <AuthInput
            id="mobileNumber"
            label="Mobile number"
            autoComplete="tel"
            error={errors.mobileNumber?.message}
            {...register('mobileNumber')}
          />
          <AuthInput
            id="password"
            label="Password"
            type="password"
            autoComplete="current-password"
            error={errors.password?.message}
            hint="Use Load@1234 for the seeded customer account."
            {...register('password')}
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-full bg-load-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-load-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </AuthShell>
  )
}
