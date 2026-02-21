import { createContext, useContext, type PropsWithChildren } from 'react'
import type { Role } from '../../shared/constants/roles'

interface AuthContextValue {
  isAuthenticated: boolean
  role: Role | null
  loading: boolean
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: PropsWithChildren) {
  return (
    <AuthContext.Provider value={{ isAuthenticated: false, role: null, loading: false }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider')
  }

  return context
}
