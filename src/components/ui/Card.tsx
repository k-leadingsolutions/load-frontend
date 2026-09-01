import type { HTMLAttributes, PropsWithChildren } from 'react'

type CardVariant = 'default' | 'elevated' | 'flat' | 'brand'

interface CardProps extends HTMLAttributes<HTMLDivElement>, PropsWithChildren {
  variant?: CardVariant
  padding?: boolean
}

const variantMap: Record<CardVariant, string> = {
  default:  'bg-white border border-card-border shadow-card',
  elevated: 'bg-white border border-card-border shadow-panel',
  flat:     'bg-load-50 border border-load-100',
  brand:    'bg-load-card border border-load-200',
}

export const Card = ({ children, variant = 'default', padding = true, className = '', ...rest }: CardProps) => (
  <div
    className={[
      'rounded-card transition',
      variantMap[variant],
      padding ? 'p-card-pad' : '',
      className,
    ].join(' ')}
    {...rest}
  >
    {children}
  </div>
)
