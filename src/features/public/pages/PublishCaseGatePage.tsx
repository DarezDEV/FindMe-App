import { Link } from 'react-router-dom'
import { AlertTriangle, ShieldCheck } from 'lucide-react'
import { useAuth } from '../../auth/hooks'
import { Spinner } from '../../../shared/components/ui'

function getRoleHomePath(roles: string[]): string {
  const firstRole = roles[0]
  if (firstRole === 'admin') return '/admin'
  if (firstRole === 'authority') return '/authority'
  return '/dashboard'
}

export default function PublishCaseGatePage() {
  const { user, loading } = useAuth()

  if (loading) return <Spinner fullScreen />

  if (user) {
    return (
      <div className="min-h-screen bg-background px-4 py-10">
        <div className="max-w-2xl mx-auto card p-7 space-y-4">
          <div className="w-12 h-12 rounded-xl bg-success/10 text-success flex items-center justify-center">
            <ShieldCheck size={22} />
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Sesion activa</h1>
          <p className="text-sm text-text-secondary">
            Ya tienes una cuenta iniciada. El formulario de publicacion se encuentra dentro de tu panel.
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <Link to={getRoleHomePath(user.roles)} className="btn-primary">
              Ir a mi panel
            </Link>
            <Link to="/cases" className="btn-secondary">
              Ver casos publicos
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="max-w-2xl mx-auto card p-7 space-y-4">
        <div className="w-12 h-12 rounded-xl bg-warning/10 text-warning flex items-center justify-center">
          <AlertTriangle size={22} />
        </div>
        <h1 className="text-2xl font-bold text-text-primary">Registro requerido para publicar casos</h1>
        <p className="text-sm text-text-secondary leading-relaxed">
          Para proteger la calidad de la informacion y mantener trazabilidad en cada reporte, debes crear una cuenta o iniciar sesion antes de publicar un caso.
        </p>
        <div className="rounded-xl border border-border bg-primary-soft/35 px-4 py-3">
          <p className="text-sm text-text-primary">
            Esta medida ayuda a prevenir reportes falsos y mejora la coordinacion con autoridades y comunidad.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <Link to="/register" className="btn-primary">
            Crear cuenta
          </Link>
          <Link to="/login" className="btn-secondary">
            Iniciar sesion
          </Link>
          <Link to="/cases" className="btn-secondary">
            Ver casos publicos
          </Link>
        </div>
      </div>
    </div>
  )
}
