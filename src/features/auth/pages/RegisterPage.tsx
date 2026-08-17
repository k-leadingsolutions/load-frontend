import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/app/providers/useAuth'
import { appPaths } from '@/app/router/paths'
import { ErrorState } from '@/components/ui/ErrorState'
import { AuthInput } from '@/features/auth/components/AuthInput'
import { AuthShell } from '@/features/auth/components/AuthShell'
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
      firstName: '',
      lastName: '',
      mobileNumber: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null)

    try {
      await registerAccount({
        firstName: values.firstName,
        lastName: values.lastName,
        mobileNumber: values.mobileNumber,
        email: values.email,
        password: values.password,
      })
      navigate(appPaths.customerHome, { replace: true })
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Unable to create your account.')
    }
  })

  return (
    <AuthShell
      eyebrow="Customer registration"
      title="Create your LOAD account"
      subtitle="Set up your customer profile now so booking, loyalty rewards, and order tracking can attach to a real account shell."
      footer={
        <p className="text-sm text-slate-500">
          Already have an account?{' '}
          <Link className="font-semibold text-load-700" to={appPaths.login}>
            Sign in instead
          </Link>
        </p>
      }
    >
      <div className="space-y-5">
        <div>
          <h2 className="text-2xl font-semibold text-ink">Create customer profile</h2>
          <p className="mt-2 text-sm text-slate-500">South African customer details are validated now and wired for future Spring Boot contracts.</p>
        </div>

        {submitError ? <ErrorState title="Registration failed" message={submitError} /> : null}

        <form className="grid gap-4 sm:grid-cols-2" onSubmit={onSubmit}>
          <AuthInput id="firstName" label="First name" autoComplete="given-name" error={errors.firstName?.message} {...register('firstName')} />
          <AuthInput id="lastName" label="Last name" autoComplete="family-name" error={errors.lastName?.message} {...register('lastName')} />
          <div className="sm:col-span-2">
            <AuthInput
              id="mobileNumber"
              label="Mobile number"
              autoComplete="tel"
              error={errors.mobileNumber?.message}
              hint="Format: +27 82 555 0142"
              {...register('mobileNumber')}
            />
          </div>
          <div className="sm:col-span-2">
            <AuthInput id="email" label="Email address" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
          </div>
          <AuthInput
            id="password"
            label="Password"
            type="password"
            autoComplete="new-password"
            error={errors.password?.message}
            hint="Use at least 8 characters with an uppercase letter and a number."
            {...register('password')}
          />
          <AuthInput
            id="confirmPassword"
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-full bg-load-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-load-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? 'Creating account...' : 'Create account'}
            </button>
          </div>
        </form>
      </div>
    </AuthShell>
  )
}
