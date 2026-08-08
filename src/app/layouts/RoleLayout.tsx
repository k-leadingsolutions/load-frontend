import { NavLink, Outlet } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'

interface RoleLayoutProps {
  roleLabel: string
  title: string
  summary: string
  primaryLinks: Array<{ to: string; label: string }>
}

export const RoleLayout = ({ roleLabel, title, summary, primaryLinks }: RoleLayoutProps) => (
  <div className="space-y-6">
    <section className="rounded-[2rem] bg-gradient-to-r from-load-600 to-load-800 p-6 text-white shadow-glow">
      <Badge tone="muted">{roleLabel}</Badge>
      <h1 className="mt-4 text-3xl font-semibold">{title}</h1>
      <p className="mt-2 max-w-3xl text-sm text-white/80">{summary}</p>
      <div className="mt-5 flex flex-wrap gap-2">
        {primaryLinks.map((item) => (
          <NavLink key={item.to} to={item.to} className="rounded-full bg-white/15 px-4 py-2 text-sm text-white transition hover:bg-white/25">
            {item.label}
          </NavLink>
        ))}
      </div>
    </section>
    <Outlet />
  </div>
)
