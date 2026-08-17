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
    <section
      aria-labelledby={headingId}
      className="rounded-panel border border-card-border bg-white p-6 shadow-card"
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 id={headingId} className="text-title text-ink">
            {title}
          </h2>
          {description ? <p className="mt-1 text-body text-muted">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}
