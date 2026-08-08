import type { PropsWithChildren, ReactNode } from 'react'

interface AuthShellProps extends PropsWithChildren {
  footer: ReactNode
  eyebrow: string
  subtitle: string
  title: string
}

const highlights = [
  'Mobile-first booking and account flows',
  'South African pricing and loyalty readiness',
  'Single-app architecture for future LOAD OS modules',
]

export const AuthShell = ({ children, eyebrow, footer, subtitle, title }: AuthShellProps) => (
  <div className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
    <section className="rounded-[2rem] bg-gradient-to-br from-load-600 to-load-800 p-8 text-white shadow-glow">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/75">{eyebrow}</p>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-4 max-w-xl text-base text-white/85">{subtitle}</p>
      <div className="mt-8 grid gap-3">
        {highlights.map((item) => (
          <div key={item} className="rounded-3xl bg-white/12 px-4 py-3 text-sm text-white/85">
            {item}
          </div>
        ))}
      </div>
    </section>

    <section className="rounded-panel border border-white/70 bg-white/90 p-6 shadow-panel backdrop-blur">
      {children}
      <div className="mt-6 border-t border-load-100 pt-4">{footer}</div>
    </section>
  </div>
)
