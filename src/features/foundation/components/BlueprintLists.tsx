import {
  designSystemSpecification,
  eightWeekBacklog,
  featureFolderStructure,
  screenInventory,
} from '@/app/config/productBlueprint'
import { Badge } from '@/components/ui/Badge'

export const ScreenInventoryList = () => (
  <div className="grid gap-3 lg:grid-cols-2">
    {screenInventory.map((screen) => (
      <article key={`${screen.role}-${screen.name}`} className="rounded-3xl border border-load-100 bg-load-50/40 p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="font-semibold text-ink">{screen.name}</p>
          <Badge tone={screen.priority === 'Now' ? 'primary' : screen.priority === 'Next' ? 'success' : 'warning'}>
            {screen.priority}
          </Badge>
        </div>
        <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-load-700">{screen.role}</p>
        <p className="mt-2 text-sm text-slate-600">{screen.purpose}</p>
      </article>
    ))}
  </div>
)

export const FolderStructureList = () => (
  <ul className="space-y-3 text-sm text-slate-600">
    {featureFolderStructure.map((item) => (
      <li key={item} className="rounded-2xl border border-load-100 bg-white px-4 py-3">
        {item}
      </li>
    ))}
  </ul>
)

export const DesignSystemList = () => (
  <div className="grid gap-4 lg:grid-cols-2">
    {designSystemSpecification.map((section) => (
      <article key={section.title} className="rounded-3xl border border-load-100 bg-white p-5">
        <h3 className="font-semibold text-ink">{section.title}</h3>
        <ul className="mt-3 space-y-2 text-sm text-slate-600">
          {section.values.map((value) => (
            <li key={value}>• {value}</li>
          ))}
        </ul>
      </article>
    ))}
  </div>
)

export const BacklogList = () => (
  <div className="space-y-4">
    {eightWeekBacklog.map((week) => (
      <article key={week.week} className="rounded-3xl border border-load-100 bg-white p-5">
        <div className="flex flex-wrap items-center gap-3">
          <Badge>{week.week}</Badge>
          <p className="font-semibold text-ink">{week.focus}</p>
        </div>
        <ul className="mt-3 space-y-2 text-sm text-slate-600">
          {week.deliverables.map((deliverable) => (
            <li key={deliverable}>• {deliverable}</li>
          ))}
        </ul>
      </article>
    ))}
  </div>
)
