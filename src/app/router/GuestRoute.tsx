import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../providers/AuthProvider'
import { Spinner } from '../../shared/components/ui'

export function GuestRoute() {
  const { user, loading } = useAuth()

  if (loading) return <Spinner fullScreen />
  if (user) {
    const firstRole = user.roles[0]
    const redirectPath = firstRole === 'admin' ? '/admin/dashboard' : firstRole === 'authority' ? '/authority' : '/user'
    return <Navigate to={redirectPath} replace />
  }

  return <Outlet />
}
