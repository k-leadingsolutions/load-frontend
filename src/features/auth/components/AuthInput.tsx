import type { ComponentPropsWithoutRef } from 'react'

interface AuthInputProps extends ComponentPropsWithoutRef<'input'> {
  error?: string | undefined
  hint?: string | undefined
  label: string
}

export const AuthInput = ({ error, hint, id, label, ...inputProps }: AuthInputProps) => {
  const hintId = id ? `${id}-hint` : undefined
  const errorId = id ? `${id}-error` : undefined
  const describedBy = error ? errorId : hint ? hintId : undefined

  return (
    <label className="block space-y-2" htmlFor={id}>
      <span className="text-sm font-semibold text-ink">{label}</span>
      <input
        {...inputProps}
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        className="h-control w-full rounded-2xl border border-load-200 bg-white px-4 text-sm text-ink outline-none transition placeholder:text-slate-400 focus:border-load-500 focus:ring-4 focus:ring-load-100 disabled:border-disabled disabled:bg-slate-100"
      />
      {error ? (
        <p id={errorId} className="text-sm text-rose-600">
          {error}
        </p>
      ) : null}
      {!error && hint ? (
        <p id={hintId} className="text-sm text-slate-500">
          {hint}
        </p>
      ) : null}
    </label>
  )
}
