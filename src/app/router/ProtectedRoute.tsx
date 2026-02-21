import type { PropsWithChildren, ReactNode } from 'react'
import { useAuth } from '../../features/auth/hooks/useAuth'

interface ProtectedRouteProps extends PropsWithChildren {
  fallback?: ReactNode
}

export function ProtectedRoute({ children, fallback = null }: ProtectedRouteProps) {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return <>{fallback}</>
  }

  if (!isAuthenticated) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
