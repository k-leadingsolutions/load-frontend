import type { ButtonHTMLAttributes, PropsWithChildren } from 'react'

type Variant = 'primary' | 'outline' | 'ghost' | 'danger'
type Size    = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, PropsWithChildren {
  variant?: Variant
  size?: Size
  fullWidth?: boolean
  loading?: boolean
}

const variantMap: Record<Variant, string> = {
  primary: 'bg-load-600 text-white hover:bg-load-700 active:bg-load-800 disabled:bg-disabled disabled:text-white/60',
  outline: 'border-2 border-load-600 text-load-600 bg-white hover:bg-load-50 active:bg-load-100 disabled:border-disabled disabled:text-disabled',
  ghost:   'text-load-600 hover:bg-load-50 active:bg-load-100 disabled:text-disabled',
  danger:  'bg-status-error text-white hover:bg-red-700 active:bg-red-800 disabled:bg-disabled',
}

const sizeMap: Record<Size, string> = {
  sm: 'h-control-sm px-4 text-sm',
  md: 'h-control px-5 text-sm',
  lg: 'h-control-lg px-6 text-base',
}

export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled,
  className = '',
  ...rest
}: ButtonProps) => (
  <button
    type="button"
    disabled={disabled || loading}
    className={[
      'inline-flex items-center justify-center gap-2 rounded-pill font-semibold transition focus-visible:ring-2 focus-visible:ring-load-300 focus-visible:ring-offset-2',
      variantMap[variant],
      sizeMap[size],
      fullWidth ? 'w-full' : '',
      className,
    ].join(' ')}
    aria-busy={loading}
    {...rest}
  >
    {loading ? (
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
    ) : null}
    {children}
  </button>
)
