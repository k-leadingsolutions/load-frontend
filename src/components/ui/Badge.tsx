import type { PropsWithChildren } from 'react'

interface BadgeProps extends PropsWithChildren {
  tone?: 'primary' | 'muted' | 'success' | 'warning' | 'error' | 'info'
}

const toneMap: Record<NonNullable<BadgeProps['tone']>, string> = {
  primary: 'bg-load-100 text-load-700',
  muted:   'bg-slate-100 text-slate-600',
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  error:   'bg-red-100 text-red-700',
  info:    'bg-load-50 text-load-600',
}

export const Badge = ({ children, tone = 'primary' }: BadgeProps) => (
  <span className={`inline-flex items-center rounded-pill px-3 py-1 text-xs font-semibold ${toneMap[tone]}`}>
    {children}
  </span>
)
