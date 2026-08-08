import { NavLink, Outlet } from 'react-router-dom'
import { appPaths } from '@/app/router/paths'

const navItems = [
  { to: appPaths.home, label: 'Home' },
  { to: appPaths.foundation, label: 'Blueprint' },
  { to: appPaths.customerHome, label: 'Customer' },
  { to: appPaths.operationsOrders, label: 'Operations' },
  { to: appPaths.driverRuns, label: 'Driver' },
  { to: appPaths.adminOverview, label: 'Admin' },
]

export const PublicLayout = () => (
  <div className="min-h-screen">
    <header className="sticky top-0 z-20 border-b border-white/60 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-6">
        <div>
          <NavLink to={appPaths.home} className="text-3xl font-light tracking-tight text-load-600">
            load
          </NavLink>
          <p className="text-sm text-slate-500">Premium laundry and delivery MVP foundation</p>
        </div>
        <nav className="flex flex-wrap gap-2 text-sm text-slate-500">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `rounded-full px-4 py-2 transition ${isActive ? 'bg-load-600 text-white' : 'bg-load-50 text-slate-600 hover:bg-load-100'}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
    <main className="mx-auto max-w-7xl px-4 py-8 lg:px-6 lg:py-10">
      <Outlet />
    </main>
  </div>
)
