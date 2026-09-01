import { useState, type ReactNode } from 'react'

interface Tab {
  id: string
  label: string
  count?: number
}

interface TabsProps {
  tabs: Tab[]
  defaultTab?: string
  onChange?: (id: string) => void
  children: (activeTab: string) => ReactNode
}

export const Tabs = ({ tabs, defaultTab, onChange, children }: TabsProps) => {
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.id ?? '')

  const handleSelect = (id: string) => {
    setActive(id)
    onChange?.(id)
  }

  return (
    <div>
      <div
        role="tablist"
        className="flex gap-1 rounded-card bg-load-50 p-1"
        aria-label="Tabs"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            type="button"
            id={`tab-${tab.id}`}
            aria-selected={active === tab.id}
            aria-controls={`tabpanel-${tab.id}`}
            onClick={() => handleSelect(tab.id)}
            className={[
              'flex flex-1 items-center justify-center gap-1.5 rounded-[0.625rem] px-3 py-2 text-sm font-semibold transition',
              active === tab.id
                ? 'bg-white text-load-700 shadow-card'
                : 'text-muted hover:text-ink',
            ].join(' ')}
          >
            {tab.label}
            {tab.count !== undefined ? (
              <span className={`rounded-pill px-1.5 py-0.5 text-[10px] font-bold ${active === tab.id ? 'bg-load-100 text-load-700' : 'bg-load-100 text-muted'}`}>
                {tab.count}
              </span>
            ) : null}
          </button>
        ))}
      </div>
      <div
        id={`tabpanel-${active}`}
        role="tabpanel"
        aria-labelledby={`tab-${active}`}
        className="mt-4"
      >
        {children(active)}
      </div>
    </div>
  )
}
