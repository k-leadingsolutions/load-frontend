import { NavLink, Outlet } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'

interface RoleLayoutProps {
  roleLabel: string
  title: string
  summary: string
  primaryLinks: Array<{ to: string; label: string }>
  mobileNavLinks?: Array<{ to: string; label: string; icon: string }>
}

export const RoleLayout = ({ roleLabel, title, summary, primaryLinks, mobileNavLinks = [] }: RoleLayoutProps) => (
  <div className="space-y-6 pb-24">
    <section className="rounded-[2rem] bg-gradient-to-r from-load-600 to-load-800 p-6 text-white shadow-glow">
      <Badge tone="muted">{roleLabel}</Badge>
      <h1 className="mt-4 text-3xl font-semibold">{title}</h1>
      <p className="mt-2 max-w-3xl text-sm text-white/80">{summary}</p>
      <nav aria-label={`${roleLabel} quick links`} className="mt-5 flex flex-wrap gap-2">
        {primaryLinks.map((item) => (
          <NavLink key={item.to} to={item.to} className="rounded-full bg-white/15 px-4 py-2 text-sm text-white transition hover:bg-white/25">
            {item.label}
          </NavLink>
        ))}
      </nav>
    </section>
    <Outlet />
    {mobileNavLinks.length > 0 ? (
      <nav
        aria-label={`${roleLabel} mobile navigation`}
        className="fixed inset-x-4 bottom-4 z-20 mx-auto flex max-w-lg items-center justify-between rounded-panel border border-card-border bg-white/95 px-4 py-2 shadow-panel backdrop-blur"
      >
        {mobileNavLinks.map((item) => (
          <NavLink key={item.to} to={item.to} className={({ isActive }) => `flex min-w-[54px] flex-col items-center gap-1 rounded-card px-2 py-1 text-[11px] font-medium ${isActive ? 'text-load-700' : 'text-muted'}`}>
            <span aria-hidden="true">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    ) : null}
  </div>
)
