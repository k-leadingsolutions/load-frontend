import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/app/providers/useAuth'
import { appPaths } from '@/app/router/paths'
import { AuthInput } from '@/features/auth/components/AuthInput'
import type { RegisterFormValues } from '@/features/auth/schemas'
import { registerSchema } from '@/features/auth/schemas'

export const RegisterPage = () => {
  const navigate = useNavigate()
  const { register: registerAccount } = useAuth()
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      mobileNumber: '',
      password: '',
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null)
    try {
      const [firstName, ...rest] = values.fullName.trim().split(' ')
      await registerAccount({
        firstName: firstName ?? values.fullName,
        lastName: rest.join(' ') || '-',
        mobileNumber: values.mobileNumber,
        email: values.email,
        password: values.password,
      })
      navigate(appPaths.otpVerify, { state: { mobileNumber: values.mobileNumber }, replace: true })
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Unable to create your account.')
    }
  })

  return (
    <div className="flex min-h-[calc(100vh-120px)] items-center justify-center py-8">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="text-4xl font-light tracking-tight text-load-600">load</span>
          <p className="mt-1 text-xs uppercase tracking-widest text-muted">Laundry · Coffee · More</p>
        </div>

        <div className="rounded-panel border border-card-border bg-white p-8 shadow-panel">
          <h1 className="text-heading text-ink">Create Account</h1>
          <p className="mt-1 text-body text-muted">Let's get you started.</p>

          {submitError ? (
            <div role="alert" className="mt-4 rounded-card border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {submitError}
            </div>
          ) : null}

          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            <AuthInput
              id="fullName"
              label="Full Name"
              autoComplete="name"
              placeholder="John Smith"
              error={errors.fullName?.message}
              {...register('fullName')}
            />
            <AuthInput
              id="email"
              label="Email"
              type="email"
              autoComplete="email"
              placeholder="johnsmith@email.com"
              error={errors.email?.message}
              {...register('email')}
            />
            <AuthInput
              id="mobileNumber"
              label="Phone Number"
              autoComplete="tel"
              placeholder="+27 82 123 4567"
              error={errors.mobileNumber?.message}
              {...register('mobileNumber')}
            />
            <AuthInput
              id="password"
              label="Password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              error={errors.password?.message}
              {...register('password')}
            />

            <button
              type="submit"
              disabled={isSubmitting}
              className="h-12 w-full rounded-pill bg-load-600 text-sm font-semibold text-white transition hover:bg-load-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Creating account…' : 'Sign Up'}
            </button>
          </form>

          <p className="mt-6 text-center text-body text-muted">
            Already have an account?{' '}
            <Link className="font-semibold text-load-600" to={appPaths.login}>
              Log In
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
