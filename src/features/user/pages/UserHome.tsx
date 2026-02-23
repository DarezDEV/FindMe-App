import { useAuth } from '../../auth/hooks'
import { Spinner } from '../../../shared/components/ui'

export default function UserHome() {
  const { user, loading } = useAuth()

  if (loading || !user) return <Spinner fullScreen />

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="card p-10 text-center space-y-4 max-w-md w-full">
        <div className="w-16 h-16 bg-primary-soft rounded-full flex items-center justify-center mx-auto">
          <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-text-primary">
          Bienvenido, {user.name} {user.last_nmae}
        </h2>
        <p className="text-text-secondary text-sm">
          Has iniciado sesión como 
          <span className="font-medium text-primary">" {user.roles} "</span>
        </p>
      </div>
    </div>
  )
}