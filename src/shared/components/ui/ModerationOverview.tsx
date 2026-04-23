import { Link } from 'react-router-dom'
import { Calendar, CheckCircle2, Clock3, Eye, FileSearch, MapPin, RefreshCw, XCircle } from 'lucide-react'
import type { AuthorityCaseRow, AuthorityDashboardSummary } from '../../../lib/supabase/db'

interface ModerationOverviewProps {
  title: string
  subtitle: string
  loading: boolean
  error: string | null
  summary: AuthorityDashboardSummary
  onRefresh: () => void
  viewAllPath: string
  getCasePath: (caseId: string) => string
}

function formatLocation(caso: AuthorityCaseRow): string {
  return caso.ciudad || caso.estado_provincia || caso.lugar_ultima_vez || 'Sin ubicacion'
}

function formatDate(dateIso: string): string {
  const parsed = new Date(dateIso)
  if (Number.isNaN(parsed.getTime())) return 'Sin fecha'
  return new Intl.DateTimeFormat('es-DO', { day: '2-digit', month: 'short', year: 'numeric' }).format(parsed)
}

function getWorkflowLabel(status: AuthorityCaseRow['workflow_status']): string {
  switch (status) {
    case 'approved':
      return 'Aprobado'
    case 'rejected':
      return 'Rechazado'
    case 'found':
      return 'Encontrado'
    case 'closed':
      return 'Cerrado'
    default:
      return 'Pendiente'
  }
}

export function ModerationOverview({
  title,
  subtitle,
  loading,
  error,
  summary,
  onRefresh,
  viewAllPath,
  getCasePath,
}: ModerationOverviewProps) {
  const approvalRate = summary.total === 0 ? 0 : Math.round((summary.approved / summary.total) * 100)

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">{title}</h1>
            <p className="mt-0.5 text-sm text-text-secondary">{subtitle}</p>
          </div>
          <button onClick={onRefresh} className="btn-secondary flex items-center gap-2" disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Actualizar
          </button>
        </div>

        {error && (
          <div className="card border border-error/25 bg-error/10 p-4 text-sm text-error">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <div className="card border-t-2 border-t-primary p-5">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <FileSearch size={18} className="text-primary" />
            </div>
            <p className="text-2xl font-bold text-text-primary">{summary.total}</p>
            <p className="text-sm text-text-secondary">Total casos</p>
          </div>
          <div className="card border-t-2 border-t-warning p-5">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-warning/10">
              <Clock3 size={18} className="text-warning" />
            </div>
            <p className="text-2xl font-bold text-text-primary">{summary.pending}</p>
            <p className="text-sm text-text-secondary">Pendientes</p>
          </div>
          <div className="card border-t-2 border-t-success p-5">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-success/10">
              <CheckCircle2 size={18} className="text-success" />
            </div>
            <p className="text-2xl font-bold text-text-primary">{summary.approved}</p>
            <p className="text-sm text-text-secondary">Aprobados</p>
          </div>
          <div className="card border-t-2 border-t-error p-5">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-error/10">
              <XCircle size={18} className="text-error" />
            </div>
            <p className="text-2xl font-bold text-text-primary">{summary.rejected}</p>
            <p className="text-sm text-text-secondary">Rechazados</p>
          </div>
          <div className="card border-t-2 border-t-info p-5">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-info/10">
              <Eye size={18} className="text-info" />
            </div>
            <p className="text-2xl font-bold text-text-primary">{approvalRate}%</p>
            <p className="text-sm text-text-secondary">Tasa aprobacion</p>
          </div>
        </div>

        <div className="card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-text-primary">Casos recientes (en vivo)</h2>
            <Link to={viewAllPath} className="text-xs font-medium text-primary hover:underline">
              Ver modulo
            </Link>
          </div>
          {summary.recentCases.length === 0 ? (
            <p className="text-sm text-text-secondary">Sin casos recientes.</p>
          ) : (
            <ul className="space-y-2">
              {summary.recentCases.map((caso) => (
                <li key={caso.id}>
                  <Link
                    to={getCasePath(caso.id)}
                    className="block rounded-lg border border-border bg-background p-3 transition-colors hover:border-primary/25 hover:bg-primary/5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-mono text-xs text-primary">{caso.numero_caso}</p>
                        <p className="text-sm font-semibold text-text-primary">{caso.nombres} {caso.apellidos}</p>
                      </div>
                      <span className="text-xs text-text-secondary">{getWorkflowLabel(caso.workflow_status)}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-text-secondary">
                      <span className="inline-flex items-center gap-1">
                        <MapPin size={12} />
                        {formatLocation(caso)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Calendar size={12} />
                        {formatDate(caso.created_at)}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
