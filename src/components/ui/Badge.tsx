import type { PropsWithChildren } from 'react'

interface BadgeProps extends PropsWithChildren {
  tone?: 'primary' | 'muted' | 'success' | 'warning' | 'error' | 'info'
  size?: 'sm' | 'md'
}

const toneMap: Record<NonNullable<BadgeProps['tone']>, string> = {
  primary: 'bg-load-100 text-load-700',
  muted:   'bg-slate-100 text-muted',
  success: 'bg-status-success/15 text-status-success',
  warning: 'bg-status-warning/15 text-status-warning',
  error:   'bg-status-error/15 text-status-error',
  info:    'bg-load-100 text-load-600',
}

const sizeMap: Record<NonNullable<BadgeProps['size']>, string> = {
  sm: 'px-2 py-0.5 text-[10px]',
  md: 'px-3 py-1 text-xs',
}

export const Badge = ({ children, tone = 'primary', size = 'md' }: BadgeProps) => (
  <span className={`inline-flex items-center rounded-pill font-semibold ${toneMap[tone]} ${sizeMap[size]}`}>
    {children}
  </span>
)
