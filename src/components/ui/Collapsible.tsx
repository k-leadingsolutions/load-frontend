import { useState, type PropsWithChildren, type ReactNode } from 'react'

interface CollapsibleProps extends PropsWithChildren {
  title: string
  defaultOpen?: boolean
  badge?: ReactNode
  className?: string
}

export const Collapsible = ({ title, defaultOpen = false, badge, children, className = '' }: CollapsibleProps) => {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className={['rounded-card border border-card-border bg-white shadow-card overflow-hidden', className].join(' ')}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-card-pad py-4 text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-ink">{title}</span>
          {badge}
        </div>
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`h-4 w-4 flex-shrink-0 text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open ? (
        <div className="animate-slide-down border-t border-divider px-card-pad pb-4 pt-3">
          {children}
        </div>
      ) : null}
    </div>
  )
}
