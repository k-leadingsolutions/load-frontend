import type { PropsWithChildren, ReactNode } from 'react'
import { useId } from 'react'

interface SectionCardProps extends PropsWithChildren {
  title: string
  description?: string
  action?: ReactNode
}

export const SectionCard = ({ title, description, action, children }: SectionCardProps) => {
  const headingId = useId()

  return (
    <section aria-labelledby={headingId} className="rounded-panel border border-white/70 bg-white/90 p-6 shadow-panel backdrop-blur">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 id={headingId} className="text-lg font-semibold text-ink">
            {title}
          </h2>
          {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}
