import { Link } from 'react-router-dom'
import { buildPath } from '@/app/router/paths'
import { SectionCard } from '@/components/ui/SectionCard'

const LOAD_PASS_BENEFITS = [
  'Priority pickup windows for recurring household loads',
  'Included coffee perks and member-only promos',
  'Faster support for delivery changes and care notes',
]

export const CustomerLoadPassPage = () => (
  <div className="space-y-6">
    <SectionCard title="LOAD Pass" description="A future premium membership for more flexible pickups, perks, and savings.">
      <div className="rounded-[2rem] bg-gradient-to-br from-load-500 to-load-700 p-6 text-white shadow-glow">
        <p className="text-sm uppercase tracking-[0.2em] text-white/70">Coming soon</p>
        <h2 className="mt-3 text-3xl font-semibold">Life, even more loaded.</h2>
        <p className="mt-3 max-w-2xl text-sm text-white/85">
          LOAD Pass is being shaped as the premium layer for recurring laundry, express handling, and loyalty-led extras.
        </p>
      </div>
    </SectionCard>

    <SectionCard title="What members can expect" description="The roadmap for LOAD Pass stays visible while the core Phase 6 order flow lands.">
      <ul className="space-y-3">
        {LOAD_PASS_BENEFITS.map((benefit) => (
          <li key={benefit} className="rounded-3xl border border-load-100 bg-white p-4 text-sm text-slate-600">
            <span className="font-semibold text-ink">✓</span> {benefit}
          </li>
        ))}
      </ul>
      <Link
        to={buildPath.roadmap('load-pass')}
        className="mt-6 inline-flex rounded-full border border-load-200 px-4 py-2 text-sm font-semibold text-load-700 transition hover:bg-load-50"
      >
        View roadmap entry
      </Link>
    </SectionCard>
  </div>
)
