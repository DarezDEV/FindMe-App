import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileSearch, CheckCircle2, Clock3, XCircle, RefreshCw, Eye, MapPin, Calendar } from 'lucide-react'
import { useAuth } from '../../auth/hooks'
import {
  getAuthorityDashboardSummary,
  subscribeToCasesRealtime,
  type AuthorityCaseRow,
  type AuthorityDashboardSummary,
} from '../../../lib/supabase/db'

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

function formatLocation(caso: AuthorityCaseRow): string {
  return caso.ciudad || caso.estado_provincia || caso.lugar_ultima_vez || 'Sin ubicacion'
}

function formatDate(dateIso: string): string {
  const parsed = new Date(dateIso)
  if (Number.isNaN(parsed.getTime())) return 'Sin fecha'
  return new Intl.DateTimeFormat('es-DO', { day: '2-digit', month: 'short', year: 'numeric' }).format(parsed)
}

export default function AdminDashboard() {
  const { user } = useAuth()
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
      setError(err instanceof Error ? err.message : 'No se pudo cargar el dashboard de admin.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadSummary()
  }, [loadSummary])

  useEffect(() => {
    const unsubscribe = subscribeToCasesRealtime(() => {
      void loadSummary()
    })

    return unsubscribe
  }, [loadSummary])

  const approvalRate = useMemo(() => {
    if (summary.total === 0) return 0
    return Math.round((summary.approved / summary.total) * 100)
  }, [summary.approved, summary.total])

  const today = new Date().toLocaleDateString('es-DO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Dashboard Admin</h1>
            <p className="text-sm text-text-secondary mt-0.5">
              {user ? `${user.name} ${user.last_nmae}` : 'Administrador'} · {today}
            </p>
          </div>
          <button onClick={() => void loadSummary()} className="btn-secondary flex items-center gap-2" disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Actualizar
          </button>
        </div>

        {error && (
          <div className="card p-4 border border-error/25 bg-error/10 text-error text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
          <div className="card p-5 border-t-2 border-t-primary">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mb-3"><FileSearch size={18} className="text-primary" /></div>
            <p className="text-2xl font-bold text-text-primary">{summary.total}</p>
            <p className="text-sm text-text-secondary">Total casos</p>
          </div>
          <div className="card p-5 border-t-2 border-t-warning">
            <div className="w-9 h-9 rounded-lg bg-warning/10 flex items-center justify-center mb-3"><Clock3 size={18} className="text-warning" /></div>
            <p className="text-2xl font-bold text-text-primary">{summary.pending}</p>
            <p className="text-sm text-text-secondary">Pendientes</p>
          </div>
          <div className="card p-5 border-t-2 border-t-success">
            <div className="w-9 h-9 rounded-lg bg-success/10 flex items-center justify-center mb-3"><CheckCircle2 size={18} className="text-success" /></div>
            <p className="text-2xl font-bold text-text-primary">{summary.approved}</p>
            <p className="text-sm text-text-secondary">Aprobados</p>
          </div>
          <div className="card p-5 border-t-2 border-t-error">
            <div className="w-9 h-9 rounded-lg bg-error/10 flex items-center justify-center mb-3"><XCircle size={18} className="text-error" /></div>
            <p className="text-2xl font-bold text-text-primary">{summary.rejected}</p>
            <p className="text-sm text-text-secondary">Rechazados</p>
          </div>
          <div className="card p-5 border-t-2 border-t-info">
            <div className="w-9 h-9 rounded-lg bg-info/10 flex items-center justify-center mb-3"><Eye size={18} className="text-info" /></div>
            <p className="text-2xl font-bold text-text-primary">{approvalRate}%</p>
            <p className="text-sm text-text-secondary">Tasa aprobacion</p>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-text-primary">Casos recientes (en vivo)</h2>
                  <Link to="/admin/cases" className="text-xs font-medium text-primary hover:underline">Ver modulo</Link>
          </div>
          {summary.recentCases.length === 0 ? (
            <p className="text-sm text-text-secondary">Sin casos recientes.</p>
          ) : (
            <ul className="space-y-2">
              {summary.recentCases.map((caso) => (
                <li key={caso.id} className="p-3 rounded-lg border border-border bg-background">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs text-primary font-mono">{caso.numero_caso}</p>
                      <p className="text-sm font-semibold text-text-primary">{caso.nombres} {caso.apellidos}</p>
                    </div>
                    <span className="text-xs text-text-secondary">{caso.workflow_status ?? 'pending'}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-text-secondary">
                    <span className="inline-flex items-center gap-1"><MapPin size={12} />{formatLocation(caso)}</span>
                    <span className="inline-flex items-center gap-1"><Calendar size={12} />{formatDate(caso.created_at)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

