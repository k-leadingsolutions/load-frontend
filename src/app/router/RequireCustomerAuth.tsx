import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { LoadingState } from '@/components/ui/LoadingState'
import { appPaths } from '@/app/router/paths'
import { useAuth } from '@/app/providers/useAuth'

export const RequireCustomerAuth = () => {
  const location = useLocation()
  const { isAuthenticated, isBootstrapping } = useAuth()

  if (isBootstrapping) {
    return (
      <div className="rounded-panel border border-white/70 bg-white/90 p-6 shadow-panel backdrop-blur">
        <LoadingState />
      </div>
    )
  }

  return isAuthenticated ? (
    <Outlet />
  ) : (
    <Navigate replace to={appPaths.login} state={{ from: location }} />
  )
}
