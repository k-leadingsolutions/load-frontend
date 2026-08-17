import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { appPaths } from '@/app/router/paths'
import { AuthInput } from '@/features/auth/components/AuthInput'
import type { SetNewPasswordFormValues } from '@/features/auth/schemas'
import { setNewPasswordSchema } from '@/features/auth/schemas'
import { mockAuthService } from '@/services/mock'

export const SetNewPasswordPage = () => {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<SetNewPasswordFormValues>({
    resolver: zodResolver(setNewPasswordSchema),
  })

  const password = watch('password', '')

  const checks = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'Include a number', met: /[0-9]/.test(password) },
    { label: 'Include a special character', met: /[^A-Za-z0-9]/.test(password) },
  ]

  const onSubmit = handleSubmit(async (values) => {
    setError(null)
    try {
      await mockAuthService.resetPassword('mock-token', values.password)
      navigate(appPaths.login, { replace: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to reset password.')
    }
  })

  return (
    <div className="flex min-h-[calc(100vh-120px)] items-center justify-center py-8">
      <div className="w-full max-w-sm">
        <div className="rounded-panel border border-card-border bg-white p-8 shadow-panel">
          <h1 className="text-heading text-ink">Set New Password</h1>
          <p className="mt-2 text-body text-muted">Your new password must be different from previous passwords.</p>

          {error ? (
            <div role="alert" className="mt-4 rounded-card border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            <AuthInput
              id="password"
              label="New Password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              error={errors.password?.message}
              {...register('password')}
            />
            <AuthInput
              id="confirmPassword"
              label="Confirm New Password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />

            {/* Password strength checklist */}
            <ul className="space-y-1">
              {checks.map((c) => (
                <li key={c.label} className={`flex items-center gap-2 text-caption ${c.met ? 'text-green-600' : 'text-muted'}`}>
                  <span aria-hidden="true">{c.met ? '✓' : '○'}</span>
                  {c.label}
                </li>
              ))}
            </ul>

            <button
              type="submit"
              disabled={isSubmitting}
              className="h-12 w-full rounded-pill bg-load-600 text-sm font-semibold text-white transition hover:bg-load-700 disabled:opacity-60"
            >
              {isSubmitting ? 'Saving…' : 'Reset Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
