import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { LoadingState } from '@/components/ui/LoadingState'
import { appPaths } from '@/app/router/paths'
import { useAuth } from '@/app/providers/useAuth'
import type { UserRole } from '@/domain/models'

interface RequireRoleProps {
  /** Roles permitted to access the nested routes. */
  allowedRoles: UserRole[]
}

/**
 * Route guard that only renders nested routes when the current session
 * belongs to one of `allowedRoles`.
 *
 * This is defence-in-depth / UX only — the Spring Boot backend remains the
 * authoritative source of truth for authorization once it is integrated.
 */
export const RequireRole = ({ allowedRoles }: RequireRoleProps) => {
  const location = useLocation()
  const { user, isAuthenticated, isBootstrapping } = useAuth()

  if (isBootstrapping) {
    return (
      <div className="rounded-panel border border-white/70 bg-white/90 p-6 shadow-panel backdrop-blur">
        <LoadingState />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate replace to={appPaths.login} state={{ from: location }} />
  }

  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate replace to={appPaths.unauthorized} state={{ from: location }} />
  }

  return <Outlet />
}
