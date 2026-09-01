import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { appPaths } from '@/app/router/paths'
import { AuthInput } from '@/features/auth/components/AuthInput'
import type { ForgotPasswordFormValues } from '@/features/auth/schemas'
import { forgotPasswordSchema } from '@/features/auth/schemas'
import { mockAuthService } from '@/services/mock'

export const ForgotPasswordPage = () => {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  const onSubmit = handleSubmit(async (values) => {
    setError(null)
    try {
      await mockAuthService.forgotPassword(values.emailOrMobile)
      navigate(appPaths.resetLinkSent, { state: { destination: values.emailOrMobile }, replace: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to send reset link.')
    }
  })

  return (
    <div className="flex min-h-[calc(100vh-120px)] items-center justify-center py-8">
      <div className="w-full max-w-sm">
        <div className="rounded-panel border border-card-border bg-white p-8 shadow-panel">
          <h1 className="text-heading text-ink">Reset Password</h1>
          <p className="mt-2 text-body text-muted">
            Enter your email or phone number and we'll send you a link to reset your password.
          </p>

          {error ? (
            <div role="alert" className="mt-4 rounded-card border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
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
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-12 w-full rounded-pill bg-load-600 text-sm font-semibold text-white transition hover:bg-load-700 disabled:opacity-60"
            >
              {isSubmitting ? 'Sending…' : 'Send Reset Link'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link to={appPaths.login} className="text-sm font-medium text-load-600 hover:text-load-700">
              Back to Log In
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
