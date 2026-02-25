import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ShieldCheck,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Eye,
  Users,
  ArrowRight,
  RefreshCw,
  MapPin,
  Calendar,
} from 'lucide-react'
import { useAuth } from '../../auth/hooks'
import { Alert, Spinner } from '../../../shared/components/ui'
import { getAuthorityDashboardSummary, type AuthorityCaseRow, type AuthorityDashboardSummary } from '../../../lib/supabase/db'

interface StatCardProps {
  label: string
  value: string | number
  icon: ReactNode
  colorClass: string
  trend?: string
}

const EMPTY_SUMMARY: AuthorityDashboardSummary = {
  total: 0,
  active: 0,
  inProgress: 0,
  resolved: 0,
  pending: 0,
  approved: 0,
  rejected: 0,
  found: 0,
  closed: 0,
  recentCases: [],
}

function formatDate(dateIso: string) {
  const parsed = new Date(dateIso)
  if (Number.isNaN(parsed.getTime())) return 'Sin fecha'
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsed)
}

function formatLocation(caso: AuthorityCaseRow) {
  return caso.ciudad || caso.estado_provincia || caso.lugar_ultima_vez || 'Sin ubicacion'
}

function StatCard({ label, value, icon, colorClass, trend }: StatCardProps) {
  return (
    <div className="card p-5 flex items-start gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${colorClass}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-2xl font-bold text-text-primary leading-tight">{value}</p>
        <p className="text-sm text-text-secondary mt-0.5">{label}</p>
        {trend && <p className="text-xs text-text-secondary/60 mt-1">{trend}</p>}
      </div>
    </div>
  )
}

export function AuthorityDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [summary, setSummary] = useState<AuthorityDashboardSummary>(EMPTY_SUMMARY)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadSummary = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await getAuthorityDashboardSummary()
      setSummary(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo cargar el dashboard.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadSummary()
  }, [loadSummary])

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
      <div className="card p-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-warning rounded-xl flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-primary leading-tight">Panel de Autoridad</h1>
            <p className="text-sm text-text-secondary mt-0.5">
              Bienvenido,{' '}
              <span className="font-medium text-text-primary">
                {user?.name} {user?.last_nmae}
              </span>
              . Aqui esta el resumen en tiempo real.
            </p>
          </div>
        </div>
        <button type="button" onClick={loadSummary} className="btn-secondary inline-flex items-center gap-2">
          <RefreshCw size={14} />
          Actualizar
        </button>
      </div>

      {error && <Alert type="error" message={error} />}

      {loading ? (
        <div className="card p-10 flex items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Casos activos"
              value={summary.active}
              icon={<AlertTriangle size={20} />}
              colorClass="bg-error/10 text-error"
              trend={`${summary.pending} pendientes`}
            />
            <StatCard
              label="En proceso"
              value={summary.inProgress}
              icon={<Clock size={20} />}
              colorClass="bg-info/10 text-info"
              trend={`${summary.approved} aprobados`}
            />
            <StatCard
              label="Casos resueltos"
              value={summary.resolved}
              icon={<CheckCircle2 size={20} />}
              colorClass="bg-success/10 text-success"
              trend={`${summary.found} encontrados`}
            />
            <StatCard
              label="Casos cerrados"
              value={summary.closed}
              icon={<Eye size={20} />}
              colorClass="bg-text-secondary/10 text-text-secondary"
              trend={`Total ${summary.total}`}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="card p-5 lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-text-primary">Ultimos casos registrados</h2>
                <button
                  type="button"
                  onClick={() => navigate('/authority/cases')}
                  className="text-primary hover:text-primary-hover text-sm font-medium inline-flex items-center gap-1"
                >
                  Ver todos <ArrowRight size={14} />
                </button>
              </div>

              {summary.recentCases.length === 0 ? (
                <p className="text-sm text-text-secondary">No hay casos registrados.</p>
              ) : (
                <div className="space-y-2">
                  {summary.recentCases.map((caso) => (
                    <button
                      key={caso.id}
                      type="button"
                      onClick={() => navigate('/authority/cases')}
                      className="w-full text-left p-3 rounded-lg border border-border hover:bg-primary-soft/40 transition-colors"
                    >
                      <p className="text-sm font-medium text-text-primary">
                        {caso.numero_caso} - {caso.nombres} {caso.apellidos}
                      </p>
                      <p className="text-xs text-text-secondary mt-1 inline-flex items-center gap-2">
                        <MapPin size={11} />
                        {formatLocation(caso)}
                        <span>•</span>
                        <Calendar size={11} />
                        {formatDate(caso.created_at)}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="card p-5">
              <h2 className="text-base font-semibold text-text-primary mb-4">Resumen rapido</h2>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 rounded-lg bg-primary-soft/40">
                  <span className="text-sm text-text-secondary inline-flex items-center gap-2">
                    <Users size={14} />
                    Pendientes
                  </span>
                  <span className="text-sm font-semibold text-text-primary">{summary.pending}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-success/10">
                  <span className="text-sm text-text-secondary">Aprobados</span>
                  <span className="text-sm font-semibold text-success">{summary.approved}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-error/10">
                  <span className="text-sm text-text-secondary">Rechazados</span>
                  <span className="text-sm font-semibold text-error">{summary.rejected}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-info/10">
                  <span className="text-sm text-text-secondary">Encontrados</span>
                  <span className="text-sm font-semibold text-info">{summary.found}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
