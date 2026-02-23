import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../providers/AuthProvider'
import { Spinner } from '../../shared/components/ui'
import type { RoleName } from '../../shared/constants/roles'

interface RoleRouteProps {
  allowedRoles: RoleName[]
}

export function RoleRoute({ allowedRoles }: RoleRouteProps) {
  const { user, loading } = useAuth()

  if (loading) return <Spinner fullScreen />
  if (!user) return <Navigate to="/login" replace />

  const hasRole = user.roles.some((r) => allowedRoles.includes(r as RoleName))

  return hasRole ? <Outlet /> : <Navigate to="/unauthorized" replace />
}
