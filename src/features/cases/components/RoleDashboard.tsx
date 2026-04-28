import { useCallback, useEffect, useMemo, useState } from 'react'
import { Activity, Download, FileText, Filter, RefreshCw, Users } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { StatusBadge, type WorkflowStatus } from '../../../shared/components/ui'
import {
  exportCasesToPdf,
  exportDashboardReportToExcel,
  exportUsersToExcel,
  getDashboardMetrics,
  getUsersForReport,
  type DashboardCaseRow,
  type DashboardFilters,
  type DashboardMetrics,
  type DashboardRole,
  type DateWindow,
  type WorkflowFilter,
} from '../services/dashboardReports'

interface RoleDashboardProps {
  role: DashboardRole
  title: string
}

const EMPTY_METRICS: DashboardMetrics = {
  totalCases: 0,
  activeCases: 0,
  resolvedCases: 0,
  pendingCases: 0,
  resolutionRate: 0,
  usersRegistered: 0,
  recentUsersRegistered: 0,
  cityBreakdown: [],
  byDate: [],
  recentActivity: [],
  filteredCases: [],
  recentUsers: [],
  uniqueCities: ['all'],
}

const STATUS_OPTIONS: WorkflowFilter[] = ['all', 'pending', 'approved', 'rejected', 'found', 'closed']

function toWorkflowStatus(value: WorkflowFilter | null): WorkflowStatus {
  if (value === 'approved' || value === 'rejected' || value === 'found' || value === 'closed') return value
  return 'pending'
}

export function RoleDashboard({ role, title }: RoleDashboardProps) {
  const [filters, setFilters] = useState<DashboardFilters>({ dateWindow: 7, status: 'all', city: 'all' })
  const [metrics, setMetrics] = useState<DashboardMetrics>(EMPTY_METRICS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadMetrics = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const nextMetrics = await getDashboardMetrics(role, filters)
      setMetrics(nextMetrics)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el dashboard.')
    } finally {
      setLoading(false)
    }
  }, [filters, role])

  useEffect(() => {
    void loadMetrics()
  }, [loadMetrics])

  const reportName = useMemo(() => {
    const now = new Date().toISOString().slice(0, 10)
    return `${role}_reporte_casos_${now}`
  }, [role])

  const handleExcel = () => {
    exportDashboardReportToExcel({
      kind: 'cases_detailed',
      cases: metrics.filteredCases.length ? metrics.filteredCases : ([] as DashboardCaseRow[]),
      users: metrics.recentUsers,
      metrics,
      fileName: `${reportName}_cases_detailed`,
    })
  }

  const handlePdf = async () => {
    await exportCasesToPdf(metrics.recentActivity, `Reporte ${role.toUpperCase()}`)
  }

  const handleUsersExcel = async () => {
    try {
      const users = await getUsersForReport()
      exportUsersToExcel(users, `admin_reporte_usuarios_${new Date().toISOString().slice(0, 10)}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo exportar usuarios.')
    }
  }

  const accentClass = role === 'admin' ? 'from-primary/10 to-info/10 border-primary/20' : 'from-success/10 to-info/10 border-success/20'
  const barColor = role === 'admin' ? '#3266db' : '#16a34a'
  const pieColor = role === 'admin' ? '#0ea5e9' : '#22c55e'

  return (
    <section className="space-y-4 p-6">
      <div className={`card border bg-gradient-to-r ${accentClass} p-4 flex flex-wrap items-center justify-between gap-3`}>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{title}</h1>
          <p className="text-sm text-text-secondary">Metricas operativas, actividad reciente y reportes descargables.</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="btn-secondary inline-flex items-center gap-2" onClick={() => void loadMetrics()}>
            <RefreshCw size={14} />
            Actualizar
          </button>
          <button type="button" className="btn-primary inline-flex items-center gap-2" onClick={handleExcel}>
            <Download size={14} />
            Excel
          </button>
          <button type="button" className="btn-secondary inline-flex items-center gap-2" onClick={() => void handlePdf()}>
            <FileText size={14} />
            PDF
          </button>
        </div>
      </div>

      <div className="card p-4">
        <div className="flex items-center gap-2 text-xs font-medium text-text-secondary mb-3">
          <Filter size={13} />
          Filtros
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <select
            className="input-field"
            value={filters.dateWindow}
            onChange={(e) => setFilters((prev) => ({ ...prev, dateWindow: Number(e.target.value) as DateWindow }))}
          >
            <option value={7}>Ultimos 7 dias</option>
            <option value={30}>Ultimos 30 dias</option>
          </select>
          <select
            className="input-field"
            value={filters.status}
            onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value as WorkflowFilter }))}
          >
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
          <select
            className="input-field"
            value={filters.city}
            onChange={(e) => setFilters((prev) => ({ ...prev, city: e.target.value }))}
          >
            {metrics.uniqueCities.map((city) => (
              <option key={city} value={city}>{city === 'all' ? 'Todas las ciudades' : city}</option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className="card border border-error/30 bg-error/10 p-3 text-sm text-error">{error}</div>}
      {loading && <div className="card p-8 text-sm text-text-secondary">Cargando dashboard...</div>}

      {!loading && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="card p-4"><p className="text-xs text-text-secondary">Total casos</p><p className="text-2xl font-bold">{metrics.totalCases}</p></div>
            <div className="card p-4"><p className="text-xs text-text-secondary">Casos activos</p><p className="text-2xl font-bold">{metrics.activeCases}</p></div>
            <div className="card p-4"><p className="text-xs text-text-secondary">{role === 'admin' ? 'Usuarios recientes' : 'Casos pendientes'}</p><p className="text-2xl font-bold">{role === 'admin' ? metrics.recentUsersRegistered : metrics.pendingCases}</p></div>
            <div className="card p-4">
              <p className="text-xs text-text-secondary">{role === 'admin' ? 'Usuarios registrados' : 'Tasa de resolucion'}</p>
              <p className="text-2xl font-bold">{role === 'admin' ? metrics.usersRegistered : `${metrics.resolutionRate}%`}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="card p-4 h-80">
              <p className="text-sm font-semibold mb-3">Casos por fecha</p>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.byDate}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill={barColor} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="card p-4 h-80">
              <p className="text-sm font-semibold mb-3">Casos por ciudad</p>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={metrics.cityBreakdown} dataKey="count" nameKey="city" outerRadius={100} fill={pieColor} />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Activity size={14} />
              <p className="text-sm font-semibold">Actividad reciente</p>
            </div>
            {metrics.recentActivity.length === 0 ? (
              <p className="text-sm text-text-secondary">No hay actividad para los filtros seleccionados.</p>
            ) : (
              <ul className="space-y-2">
                {metrics.recentActivity.map((row) => (
                  <li key={row.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div>
                      <p className="text-xs text-primary font-mono">{row.numero_caso}</p>
                      <p className="text-sm font-semibold">{row.nombres} {row.apellidos}</p>
                      <p className="text-xs text-text-secondary">{row.ciudad ?? 'Sin ciudad'}</p>
                    </div>
                    <div className="text-right">
                      <StatusBadge status={toWorkflowStatus(row.workflow_status)} />
                      <p className="text-xs text-text-secondary mt-1">{new Date(row.created_at).toLocaleDateString('es-DO')}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {role === 'admin' && (
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users size={14} />
                <p className="text-sm font-semibold">Usuarios recientes y reporte</p>
              </div>
              <p className="text-sm text-text-secondary mb-3">Registrados en la ventana seleccionada ({filters.dateWindow} dias).</p>
              {metrics.recentUsers.length === 0 ? (
                <p className="text-sm text-text-secondary">No hay usuarios recientes.</p>
              ) : (
                <ul className="space-y-2">
                  {metrics.recentUsers.map((user) => (
                    <li key={user.id} className="rounded-lg border border-border p-2 text-sm">
                      <p className="font-medium text-text-primary">{`${user.name ?? ''} ${user.last_name ?? ''}`.trim() || 'Sin nombre'}</p>
                      <p className="text-xs text-text-secondary">{user.email ?? 'Sin email'}</p>
                    </li>
                  ))}
                </ul>
              )}
              <button type="button" className="btn-secondary mt-3 inline-flex items-center gap-2" onClick={() => void handleUsersExcel()}>
                <Download size={14} />
                Exportar usuarios (.xlsx)
              </button>
            </div>
          )}
        </>
      )}
    </section>
  )
}
