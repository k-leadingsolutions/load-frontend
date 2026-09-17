import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { LoadingState } from '@/components/ui/LoadingState'
import { appPaths } from '@/app/router/paths'
import { useDriverAuth } from '@/app/providers/useDriverAuth'

/**
 * Strict Driver-only route guard, independent from `RequireRole`/`RequireCustomerAuth`.
 *
 * This is UX / defence-in-depth only — the future Spring Boot backend remains
 * the authoritative source of truth for authorization once integrated.
 */
export const RequireDriverRole = () => {
  const location = useLocation()
  const { isAuthenticated, isBootstrapping, user } = useDriverAuth()

  if (isBootstrapping) {
    return (
      <div className="rounded-panel border border-white/70 bg-white/90 p-6 shadow-panel backdrop-blur">
        <LoadingState />
      </div>
    )
  }

  if (!isAuthenticated || !user || user.role !== 'DRIVER') {
    return <Navigate replace to={appPaths.driverLogin} state={{ from: location }} />
  }

  return <Outlet />
}
