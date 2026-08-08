import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '@/app/providers/useAuth'
import { appPaths } from '@/app/router/paths'

const navItems = [
  { to: appPaths.home, label: 'Home' },
  { to: appPaths.foundation, label: 'Blueprint' },
  { to: appPaths.operationsOrders, label: 'Operations' },
  { to: appPaths.driverRuns, label: 'Driver' },
  { to: appPaths.adminOverview, label: 'Admin' },
]

export const PublicLayout = () => {
  const { isAuthenticated, logout, user } = useAuth()

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-white/60 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-6">
          <div>
            <NavLink to={appPaths.home} className="text-3xl font-light tracking-tight text-load-600">
              load
            </NavLink>
            <p className="text-sm text-slate-500">Premium laundry and delivery MVP foundation</p>
          </div>
          <div className="flex flex-col gap-3 lg:items-end">
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
              <NavLink
                to={appPaths.customerHome}
                className={({ isActive }) =>
                  `rounded-full px-4 py-2 transition ${isActive ? 'bg-load-600 text-white' : 'bg-load-50 text-slate-600 hover:bg-load-100'}`
                }
              >
                {isAuthenticated ? 'My LOAD' : 'Customer'}
              </NavLink>
            </nav>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              {isAuthenticated ? (
                <>
                  <span className="rounded-full bg-load-50 px-4 py-2 text-load-700">
                    Signed in as {user?.firstName}
                  </span>
                  <button
                    type="button"
                    onClick={logout}
                    className="rounded-full border border-load-200 bg-white px-4 py-2 font-semibold text-load-700 transition hover:bg-load-50"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <NavLink
                    to={appPaths.login}
                    className={({ isActive }) =>
                      `rounded-full px-4 py-2 font-semibold transition ${isActive ? 'bg-load-600 text-white' : 'border border-load-200 bg-white text-load-700 hover:bg-load-50'}`
                    }
                  >
                    Sign in
                  </NavLink>
                  <NavLink
                    to={appPaths.register}
                    className={({ isActive }) =>
                      `rounded-full px-4 py-2 font-semibold transition ${isActive ? 'bg-load-700 text-white' : 'bg-load-600 text-white hover:bg-load-700'}`
                    }
                  >
                    Create account
                  </NavLink>
                </>
              )}
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 lg:px-6 lg:py-10">
        <Outlet />
      </main>
    </div>
  )
}
