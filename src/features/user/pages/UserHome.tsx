import { Link } from 'react-router-dom'
import { AlertTriangle, ChevronRight, Eye, MapPin, Plus, RefreshCw, UserSearch } from 'lucide-react'
import { useAuth } from '../../auth/hooks'
import { Spinner } from '../../../shared/components/ui'
import UserNavbar from '../components/Usernavbar'
import { type CasoReciente, useCasosGenerales } from '../hooks/useMisCasos'

const STATUS_CONFIG: Record<CasoReciente['status'], { label: string; className: string }> = {
  activo: { label: 'Activo', className: 'bg-info/10 text-info' },
  en_revision: { label: 'En revision', className: 'bg-warning/10 text-warning' },
  avistado: { label: 'Avistado', className: 'bg-primary-soft text-primary' },
  encontrado: { label: 'Encontrado', className: 'bg-success/10 text-success' },
}

function StatusBadge({ status }: { status: CasoReciente['status'] }) {
  const { label, className } = STATUS_CONFIG[status]
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${className}`}>
      {label}
    </span>
  )
}

function CasoSkeleton() {
  return (
    <div className="card p-4 flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl bg-border animate-pulse shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-40 bg-border rounded animate-pulse" />
        <div className="h-3 w-56 bg-border rounded animate-pulse" />
      </div>
    </div>
  )
}

export default function UserHome() {
  const { user, loading: authLoading } = useAuth()

  const {
    data: casosGenerales = [],
    isLoading: casosLoading,
    isError: casosError,
    refetch: refetchCasos,
  } = useCasosGenerales()

  if (authLoading || !user) return <Spinner fullScreen />

  return (
    <>
      <UserNavbar />

      <main className="bg-background min-h-screen py-8 px-4">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-text-primary">Casos generales</h1>
              <p className="text-sm text-text-secondary mt-1">
                Consulta todos los casos recientes publicados en la plataforma.
              </p>
            </div>
            <Link to="/publicar" className="btn-primary flex items-center gap-2 self-start sm:self-auto">
              <Plus size={16} strokeWidth={2.5} />
              Nuevo reporte
            </Link>
          </div>

          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-text-primary">Listado general</h2>
            <button
              onClick={() => refetchCasos()}
              className="text-text-secondary hover:text-primary transition-colors inline-flex items-center gap-1.5 text-xs"
              title="Actualizar casos"
            >
              <RefreshCw size={14} />
              Actualizar
            </button>
          </div>

          {casosLoading && (
            <div className="space-y-2">
              <CasoSkeleton />
              <CasoSkeleton />
              <CasoSkeleton />
            </div>
          )}

          {casosError && (
            <div className="card p-4 flex items-center gap-3 border-error/30 bg-error/5">
              <AlertTriangle size={18} className="text-error shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-error">Error al cargar casos</p>
                <p className="text-xs text-text-secondary">Intenta nuevamente.</p>
              </div>
              <button onClick={() => refetchCasos()} className="text-xs text-primary hover:underline">
                Reintentar
              </button>
            </div>
          )}

          {!casosLoading && !casosError && casosGenerales.length === 0 && (
            <div className="card p-8 text-center">
              <UserSearch size={32} className="text-border mx-auto mb-3" />
              <p className="text-sm font-medium text-text-primary">Aun no hay casos disponibles</p>
              <p className="text-xs text-text-secondary mt-1">
                Publica un reporte para que aparezca en el listado general.
              </p>
              <Link to="/publicar" className="btn-primary inline-flex mt-4 text-sm gap-2 items-center">
                <Plus size={15} /> Publicar ahora
              </Link>
            </div>
          )}

          {!casosLoading && !casosError && casosGenerales.length > 0 && (
            <div className="space-y-2">
              {casosGenerales.map(caso => (
                <Link
                  key={caso.id}
                  to={`/caso/${caso.id}`}
                  className="card p-4 flex items-center gap-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary-soft flex items-center justify-center shrink-0 overflow-hidden">
                    {caso.foto_principal_url ? (
                      <img src={caso.foto_principal_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <UserSearch size={20} className="text-primary" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-text-primary">
                        {caso.nombres} {caso.apellidos}
                      </p>
                      <StatusBadge status={caso.status} />
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      {caso.ciudad && (
                        <span className="text-[11px] text-text-secondary flex items-center gap-1">
                          <MapPin size={11} /> {caso.ciudad}
                        </span>
                      )}
                      <span className="text-[11px] text-text-secondary flex items-center gap-1">
                        <Eye size={11} /> {caso.vistas} vistas
                      </span>
                      <span className="text-[11px] text-text-secondary flex items-center gap-1">
                        <UserSearch size={11} /> {caso.total_fotos} fotos
                      </span>
                    </div>
                  </div>

                  <span className="text-[11px] font-mono text-text-secondary shrink-0 hidden sm:block">
                    {caso.numero_caso}
                  </span>

                  <ChevronRight size={16} className="text-border group-hover:text-primary transition-colors shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  )
}
