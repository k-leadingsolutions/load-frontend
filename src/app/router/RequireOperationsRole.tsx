import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { LoadingState } from '@/components/ui/LoadingState'
import { appPaths } from '@/app/router/paths'
import { useOperationsAuth } from '@/app/providers/useOperationsAuth'

/**
 * Strict Operations/Admin-only route guard, independent from `RequireRole`/
 * `RequireDriverRole`. This is UX / defence-in-depth only — the Spring Boot
 * backend remains the authoritative source of truth for authorization.
 */
export const RequireOperationsRole = () => {
  const location = useLocation()
  const { isAuthenticated, isBootstrapping, user } = useOperationsAuth()

  if (isBootstrapping) {
    return (
      <div className="rounded-panel border border-white/70 bg-white/90 p-6 shadow-panel backdrop-blur">
        <LoadingState />
      </div>
    )
  }

  if (!isAuthenticated || !user || (user.role !== 'OPERATIONS' && user.role !== 'ADMIN')) {
    return <Navigate replace to={appPaths.operationsLogin} state={{ from: location }} />
  }

  return <Outlet />
}
