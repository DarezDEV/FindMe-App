import type { PropsWithChildren, ReactNode } from 'react'
import type { Role } from '../../shared/constants/roles'
import { useAuth } from '../../features/auth/hooks/useAuth'

interface RoleRouteProps extends PropsWithChildren {
  allow: Role[]
  fallback?: ReactNode
}

export function RoleRoute({ allow, children, fallback = null }: RoleRouteProps) {
  const { isAuthenticated, role } = useAuth()

  if (!isAuthenticated || !role) {
    return <>{fallback}</>
  }

  if (!allow.includes(role)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
