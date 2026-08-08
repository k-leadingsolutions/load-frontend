import { Link } from 'react-router-dom'
import { productRouteMap } from '@/app/config/productBlueprint'
import { appPaths } from '@/app/router/paths'
import { Badge } from '@/components/ui/Badge'
import { SectionCard } from '@/components/ui/SectionCard'
import { CustomerHomePreview } from '@/features/customer/components/CustomerHomePreview'

const roleHighlights = [
  'Customer booking, tracking, loyalty, and reorder flows',
  'Operations production board with stage movement and QC focus',
  'Driver assignment workflow with proof-of-delivery support',
  'Admin catalogue, pricing, promotions, and basic metrics',
]

export const LandingPage = () => (
  <div className="space-y-8">
    <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
      <div className="space-y-5">
        <Badge>Eight-week MVP</Badge>
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          LOAD is a premium blue-and-white laundry experience built for launch, not bloat.
        </h1>
        <p className="max-w-2xl text-lg text-slate-600">
          This foundation keeps the MVP focused while preparing for future LOAD OS modules such as CRM, machine control, and multi-store operations.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link to={appPaths.foundation} className="rounded-full bg-load-600 px-5 py-3 text-sm font-semibold text-white shadow-glow">
            View MVP blueprint
          </Link>
          <Link to={appPaths.customerHome} className="rounded-full border border-load-200 bg-white px-5 py-3 text-sm font-semibold text-load-700">
            Open customer preview
          </Link>
        </div>
      </div>
      <div className="rounded-[2rem] border border-white/70 bg-white/90 p-5 shadow-panel">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-load-600">Focused launch modules</p>
        <div className="mt-4 grid gap-3">
          {roleHighlights.map((item) => (
            <div key={item} className="rounded-3xl bg-load-50 px-4 py-3 text-sm text-slate-600">
              {item}
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-3xl border border-dashed border-load-200 px-4 py-3 text-sm text-slate-500">
          Roadmap placeholders are visible but non-functional to prevent MVP scope creep.
        </div>
      </div>
    </section>

    <SectionCard title="Reference-inspired customer preview" description="A premium, mobile-first direction based on the provided inspiration image.">
      <CustomerHomePreview />
    </SectionCard>

    <SectionCard title="Role-aware route coverage" description="Single application, shared architecture, separate role journeys.">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {productRouteMap
          .filter((route) => route.release === 'MVP')
          .map((route) => (
            <article key={route.path} className="rounded-3xl border border-load-100 bg-load-50/40 p-4">
              <p className="font-semibold text-ink">{route.title}</p>
              <p className="mt-1 text-xs uppercase tracking-wide text-load-700">{route.role}</p>
              <p className="mt-3 text-sm text-slate-600">{route.summary}</p>
            </article>
          ))}
      </div>
    </SectionCard>
  </div>
)
