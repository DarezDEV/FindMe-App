import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import { supabase } from '../../lib/supabase/client'
import { getProfileWithRoles } from '../../lib/supabase/db'
import type { UserProfile } from '../../features/auth/types'

interface AuthContextType {
  user: UserProfile | null
  loading: boolean
  isAuthenticated: boolean
  refreshUser: () => Promise<UserProfile | null>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAuthenticated: false,
  refreshUser: async () => null,
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const loadUser = useCallback(async (userId: string): Promise<UserProfile | null> => {
    try {
      const profile = await getProfileWithRoles(userId)
      setUser(profile)
      return profile
    } catch (err) {
      console.error('[AuthProvider] Error cargando perfil:', err)
      setUser(null)
      return null
    }
  }, [])

  const refreshUser = useCallback(async (): Promise<UserProfile | null> => {
    const { data } = await supabase.auth.getSession()
    if (data.session?.user?.id) {
      return await loadUser(data.session.user.id)
    }
    return null
  }, [loadUser])

  useEffect(() => {
    let isMounted = true

    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (isMounted && session?.user?.id) {
          await loadUser(session.user.id)
        }
      } catch (err) {
        console.error('[AuthProvider] Error en getSession:', err)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    void initSession()

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return

      if (event === 'SIGNED_IN' && session?.user?.id) {
        void loadUser(session.user.id)
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
      }
    })

    return () => {
      isMounted = false
      listener.subscription.unsubscribe()
    }
  }, [loadUser])

  return (
    <AuthContext.Provider value={{ user, loading, isAuthenticated: !!user, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
