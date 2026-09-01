import { Navigate, Outlet } from 'react-router-dom'
import { appPaths } from '@/app/router/paths'
import { useAuth } from '@/app/providers/useAuth'

export const GuestOnlyRoute = () => {
  const { isAuthenticated, isBootstrapping } = useAuth()

  if (isBootstrapping) {
    return null
  }

  return isAuthenticated ? <Navigate replace to={appPaths.customerHome} /> : <Outlet />
}
