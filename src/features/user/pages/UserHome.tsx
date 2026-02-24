import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  Bell,
  CheckCircle,
  ChevronRight,
  Clock,
  Eye,
  HandHeart,
  MapPin,
  Plus,
  RefreshCw,
  TrendingUp,
  UserSearch,
} from 'lucide-react'
import { useAuth } from '../../auth/hooks'
import { Spinner } from '../../../shared/components/ui'
import UserNavbar from '../components/Usernavbar'
import { type CasoReciente, useCasosGenerales, useMisEstadisticas } from '../hooks/useMisCasos'

const STATUS_CONFIG: Record<
  CasoReciente['status'],
  { label: string; className: string }
> = {
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

function StatCard({
  color,
  icon,
  label,
  loading,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: number | string
  color: string
  loading?: boolean
}) {
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        {icon}
      </div>
      <div>
        {loading ? (
          <div className="h-7 w-12 bg-border rounded animate-pulse" />
        ) : (
          <p className="text-2xl font-bold text-text-primary leading-none">{value}</p>
        )}
        <p className="text-xs text-text-secondary mt-0.5">{label}</p>
      </div>
    </div>
  )
}

function QuickAction({
  color,
  desc,
  icon,
  label,
  to,
}: {
  icon: React.ReactNode
  label: string
  desc: string
  to: string
  color: string
}) {
  return (
    <Link
      to={to}
      className="card p-4 flex items-center gap-3 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group"
    >
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-200 ${color}`}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text-primary">{label}</p>
        <p className="text-xs text-text-secondary truncate">{desc}</p>
      </div>
      <ChevronRight size={16} className="text-border group-hover:text-primary transition-colors shrink-0" />
    </Link>
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
  } = useCasosGenerales(6)

  const { data: stats, isLoading: statsLoading } = useMisEstadisticas(user?.id ?? '')

  if (authLoading || !user) return <Spinner fullScreen />

  return (
    <>
      <UserNavbar />

      <main className="bg-background min-h-screen py-8 px-4">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-text-primary">Hola, {user.name}</h1>
              <p className="text-sm text-text-secondary mt-1">
                Aqui puedes crear reportes y ver los casos mas recientes de la plataforma.
              </p>
            </div>
            <Link to="/publicar" className="btn-primary flex items-center gap-2 self-start sm:self-auto">
              <Plus size={16} strokeWidth={2.5} />
              Nuevo reporte
            </Link>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              icon={<UserSearch size={18} className="text-primary" />}
              label="Casos publicados"
              value={stats?.total ?? 0}
              color="bg-primary-soft"
              loading={statsLoading}
            />
            <StatCard
              icon={<Clock size={18} className="text-warning" />}
              label="Casos activos"
              value={stats?.activos ?? 0}
              color="bg-warning/10"
              loading={statsLoading}
            />
            <StatCard
              icon={<CheckCircle size={18} className="text-success" />}
              label="Encontrados"
              value={stats?.encontrados ?? 0}
              color="bg-success/10"
              loading={statsLoading}
            />
            <StatCard
              icon={<TrendingUp size={18} className="text-info" />}
              label="Total de vistas"
              value={(stats?.totalVistas ?? 0).toLocaleString()}
              color="bg-info/10"
              loading={statsLoading}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-text-primary">Casos generales recientes</h2>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => refetchCasos()}
                    className="text-text-secondary hover:text-primary transition-colors"
                    title="Actualizar"
                  >
                    <RefreshCw size={14} />
                  </button>
                  <Link to="/user" className="text-xs text-primary hover:underline">
                    Actualizar vista
                  </Link>
                </div>
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
                    Publica un reporte para que aparezca en el tablero general.
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
                            <AlertTriangle size={11} /> {caso.total_avistamientos} avistamientos
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

            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="font-semibold text-text-primary">Acciones rapidas</h2>
                <div className="space-y-2">
                  <QuickAction
                    icon={<UserSearch size={18} className="text-error" />}
                    label="Reportar desaparecido"
                    desc="Publicar un nuevo caso"
                    to="/publicar"
                    color="bg-error/10"
                  />
                  <QuickAction
                    icon={<MapPin size={18} className="text-primary" />}
                    label="Explorar mapa"
                    desc="Vista general de casos"
                    to="/mapa"
                    color="bg-primary-soft"
                  />
                  <QuickAction
                    icon={<Bell size={18} className="text-warning" />}
                    label="Notificaciones"
                    desc="Actualizaciones de tus casos"
                    to="/notificaciones"
                    color="bg-warning/10"
                  />
                  <QuickAction
                    icon={<HandHeart size={18} className="text-success" />}
                    label="Realizar donacion"
                    desc="Apoya la plataforma"
                    to="/donar"
                    color="bg-success/10"
                  />
                  <QuickAction
                    icon={<AlertTriangle size={18} className="text-error" />}
                    label="Reportar contenido"
                    desc="Enviar reporte de contenido inapropiado"
                    to="/reportar"
                    color="bg-error/10"
                  />
                </div>
              </div>

              <div className="card p-4 bg-primary-soft border-primary/20">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={15} className="text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-primary">Dato util</p>
                    <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                      Las primeras 72 horas son criticas. Agrega datos claros y fotos recientes para mejorar la busqueda.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
