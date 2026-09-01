import type { InputHTMLAttributes } from 'react'
import { useId } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  error?: string
  leadingIcon?: React.ReactNode
  trailingIcon?: React.ReactNode
}

export const Input = ({
  label,
  hint,
  error,
  leadingIcon,
  trailingIcon,
  id: providedId,
  className = '',
  ...rest
}: InputProps) => {
  const generatedId = useId()
  const id = providedId ?? generatedId
  const errorId = `${id}-error`
  const hintId  = `${id}-hint`

  return (
    <div className="flex flex-col gap-1.5">
      {label ? (
        <label htmlFor={id} className="text-caption font-semibold text-ink">
          {label}
        </label>
      ) : null}
      <div className="relative flex items-center">
        {leadingIcon ? (
          <span className="pointer-events-none absolute left-3 flex items-center text-muted" aria-hidden="true">
            {leadingIcon}
          </span>
        ) : null}
        <input
          id={id}
          aria-describedby={[error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined}
          aria-invalid={error ? true : undefined}
          className={[
            'h-control w-full rounded-input border bg-white px-4 text-body text-ink placeholder:text-muted transition',
            'focus:border-input-focus focus:outline-none focus:shadow-input',
            error
              ? 'border-status-error focus:border-status-error focus:shadow-none'
              : 'border-input-border',
            leadingIcon  ? 'pl-10' : '',
            trailingIcon ? 'pr-10' : '',
            className,
          ].join(' ')}
          {...rest}
        />
        {trailingIcon ? (
          <span className="pointer-events-none absolute right-3 flex items-center text-muted" aria-hidden="true">
            {trailingIcon}
          </span>
        ) : null}
      </div>
      {hint && !error ? (
        <p id={hintId} className="text-caption text-muted">{hint}</p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-caption text-status-error" role="alert">{error}</p>
      ) : null}
    </div>
  )
}
