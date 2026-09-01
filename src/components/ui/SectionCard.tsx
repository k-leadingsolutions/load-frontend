import type { PropsWithChildren, ReactNode } from 'react'
import { useId } from 'react'

interface SectionCardProps extends PropsWithChildren {
  title: string
  description?: string
  action?: ReactNode
  noPad?: boolean
}

export const SectionCard = ({ title, description, action, children, noPad = false }: SectionCardProps) => {
  const headingId = useId()

  return (
    <section
      aria-labelledby={headingId}
      className="rounded-panel border border-card-border bg-white shadow-card"
    >
      <div className={`flex items-start justify-between gap-4 ${noPad ? 'px-card-pad pt-card-pad' : 'p-card-pad pb-0'}`}>
        <div>
          <h2 id={headingId} className="text-title text-ink">
            {title}
          </h2>
          {description ? <p className="mt-1 text-body text-muted">{description}</p> : null}
        </div>
        {action}
      </div>
      <div className={noPad ? 'p-card-pad pt-4' : 'p-card-pad'}>
        {children}
      </div>
    </section>
  )
}
