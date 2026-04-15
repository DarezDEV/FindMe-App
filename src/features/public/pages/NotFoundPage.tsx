import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, Home, LogIn } from 'lucide-react'
import { useAuth } from '../../auth/hooks'

function getRoleHomePath(roles: string[]): string {
  const firstRole = roles[0]
  if (firstRole === 'admin') return '/admin/dashboard'
  if (firstRole === 'authority') return '/authority'
  return '/dashboard'
}

export default function NotFoundPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()

  const primaryTarget = user ? getRoleHomePath(user.roles) : '/'

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="max-w-2xl mx-auto card p-7 space-y-4">
        <div className="w-12 h-12 rounded-xl bg-warning/10 text-warning flex items-center justify-center">
          <AlertTriangle size={22} />
        </div>

        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-text-primary">404 · Página no encontrada</h1>
          <p className="text-sm text-text-secondary">
            La ruta <span className="font-mono text-primary">{location.pathname}</span> no existe en esta aplicación.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn-secondary inline-flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            Volver
          </button>

          <Link to={primaryTarget} className="btn-primary inline-flex items-center gap-2">
            <Home size={16} />
            {user ? 'Ir a mi panel' : 'Ir al inicio'}
          </Link>

          {!user && (
            <Link to="/login" className="btn-secondary inline-flex items-center gap-2">
              <LogIn size={16} />
              Iniciar sesión
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

