import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../providers/AuthProvider'
import { Spinner } from '../../shared/components/ui'
import { supabase } from '../../lib/supabase/client'
import { handleError } from '../../shared/utils/handleError'

export function GuestRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()
  const [hasSession, setHasSession] = useState(false)
  const [sessionLoading, setSessionLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    const readSession = async () => {
      try {
        const { data } = await supabase.auth.getSession()
        if (isMounted) {
          setHasSession(!!data.session)
        }
      } catch (error) {
        handleError('GuestRoute.getSession', error, {
          fallbackMessage: 'No se pudo validar la sesión. Intenta recargar la página.',
          toast: false,
        })
      } finally {
        if (isMounted) {
          setSessionLoading(false)
        }
      }
    }

    void readSession()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return
      setHasSession(!!session)
      setSessionLoading(false)
    })

    return () => {
      isMounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  if (loading || sessionLoading) return <Spinner fullScreen />

  const firstRole = user?.roles[0]
  const shouldBlockLanding = location.pathname === '/' && hasSession

  if (user || shouldBlockLanding) {
    const redirectPath = firstRole === 'admin' ? '/admin/dashboard' : firstRole === 'authority' ? '/authority' : '/user'
    return <Navigate to={redirectPath} replace />
  }

  return <Outlet />
}
