import type { PropsWithChildren } from 'react'

interface BadgeProps extends PropsWithChildren {
  tone?: 'primary' | 'muted' | 'success' | 'warning' | 'error' | 'info'
}

const toneMap: Record<NonNullable<BadgeProps['tone']>, string> = {
  primary: 'bg-load-100 text-load-700',
  muted:   'bg-slate-100 text-muted',
  success: 'bg-status-success/15 text-status-success',
  warning: 'bg-status-warning/15 text-status-warning',
  error:   'bg-status-error/15 text-status-error',
  info:    'bg-load-50 text-load-600',
}

export const Badge = ({ children, tone = 'primary' }: BadgeProps) => (
  <span className={`inline-flex items-center rounded-pill px-3 py-1 text-xs font-semibold ${toneMap[tone]}`}>
    {children}
  </span>
)
