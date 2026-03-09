import { useMemo, type ElementType } from 'react'
import { Link } from 'react-router-dom'
import {
  CheckCircle2,
  Clock,
  FileSearch,
  RefreshCw,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  UserPlus,
  Users,
} from 'lucide-react'
import { useAuth } from '../../auth/hooks'
import { Alert, Spinner, StatusBadge, type WorkflowStatus } from '../../../shared/components/ui'
import {
  type AdminDashboardActivityItem,
  type AdminDashboardSummary,
  type AuthorityCaseRow,
} from '../../../lib/supabase/db'
import { useAdminDashboardSummary } from '../hooks/useAdminDashboardSummary'

type StatColor = 'primary' | 'warning' | 'success' | 'error'

interface Stat {
  label: string
  value: string | number
  icon: ElementType
  color: StatColor
  trend: string
  up: boolean
}

const EMPTY_SUMMARY: AdminDashboardSummary = {
  totalUsers: 0,
  usersThisMonth: 0,
  usersPreviousMonth: 0,
  activeAuthorities: 0,
  authoritiesThisMonth: 0,
  authoritiesPreviousMonth: 0,
  activeCases: 0,
  casesThisWeek: 0,
  casesPreviousWeek: 0,
  resolvedCases: 0,
  resolvedThisMonth: 0,
  resolvedPreviousMonth: 0,
  pendingCases: 0,
  recentCases: [],
  recentActivity: [],
}

const colorMap: Record<StatColor, { bg: string; text: string; pill: string }> = {
  primary: {
    bg: 'bg-primary/10',
    text: 'text-primary',
    pill: 'border-t-2 border-t-primary',
  },
  warning: {
    bg: 'bg-warning/10',
    text: 'text-warning',
    pill: 'border-t-2 border-t-warning',
  },
  success: {
    bg: 'bg-success/10',
    text: 'text-success',
    pill: 'border-t-2 border-t-success',
  },
  error: {
    bg: 'bg-error/10',
    text: 'text-error',
    pill: 'border-t-2 border-t-error',
  },
}

function formatRelativeTime(dateIso: string) {
  const timestamp = new Date(dateIso).getTime()
  if (Number.isNaN(timestamp)) return 'Sin fecha'

  const diffMs = timestamp - Date.now()
  const diffMinutes = Math.round(diffMs / (1000 * 60))

  if (Math.abs(diffMinutes) < 60) {
    return new Intl.RelativeTimeFormat('es', { numeric: 'auto' }).format(diffMinutes, 'minute')
  }

  const diffHours = Math.round(diffMinutes / 60)
  if (Math.abs(diffHours) < 24) {
    return new Intl.RelativeTimeFormat('es', { numeric: 'auto' }).format(diffHours, 'hour')
  }

  const diffDays = Math.round(diffHours / 24)
  return new Intl.RelativeTimeFormat('es', { numeric: 'auto' }).format(diffDays, 'day')
}

function formatLocation(caso: AuthorityCaseRow) {
  return caso.ciudad || caso.estado_provincia || caso.lugar_ultima_vez || 'Sin ubicacion'
}

function resolveWorkflowStatus(caso: AuthorityCaseRow): WorkflowStatus {
  if (caso.workflow_status === 'approved') return 'approved'
  if (caso.workflow_status === 'rejected') return 'rejected'
  if (caso.workflow_status === 'found') return 'found'
  if (caso.workflow_status === 'closed') return 'closed'

  const normalizedStatus = caso.status.trim().toLowerCase()
  if (normalizedStatus === 'resuelto' || normalizedStatus === 'encontrado') return 'found'
  if (normalizedStatus === 'cerrado') return 'closed'

  return 'pending'
}

function getActivityVisual(type: AdminDashboardActivityItem['type']) {
  if (type === 'user') {
    return {
      icon: UserPlus,
      color: 'primary' as const,
    }
  }

  if (type === 'resolved') {
    return {
      icon: CheckCircle2,
      color: 'success' as const,
    }
  }

  return {
    icon: FileSearch,
    color: 'warning' as const,
  }
}

function StatCard({ label, value, icon: Icon, color, trend, up }: Stat) {
  const c = colorMap[color]

  return (
    <div className={`card p-6 ${c.pill} flex flex-col gap-3`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${c.bg}`}>
        <Icon size={20} className={c.text} />
      </div>
      <div>
        <p className={`text-3xl font-bold ${c.text}`}>{value}</p>
        <p className="text-sm text-text-secondary mt-0.5">{label}</p>
      </div>
      <div className={`flex items-center gap-1 text-xs font-medium ${up ? 'text-success' : 'text-error'}`}>
        {up ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
        {trend}
      </div>
    </div>
  )
}

function RecentCaseRow({ caso }: { caso: AuthorityCaseRow }) {
  const initials = `${caso.nombres[0] ?? ''}${caso.apellidos[0] ?? ''}`.toUpperCase()

  return (
    <li>
      <Link
        to={`/authority/cases/pending?caseId=${caso.id}`}
        className="flex items-center gap-3 py-3 border-b border-border last:border-none hover:bg-primary-soft/30 rounded-lg px-2 -mx-2 transition-colors"
      >
        <div className="w-9 h-9 rounded-lg bg-primary-soft border border-primary/20 flex items-center justify-center shrink-0">
          <span className="text-xs font-bold text-primary">{initials || 'CA'}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text-primary truncate">
            {caso.nombres} {caso.apellidos}
          </p>
          <p className="text-xs text-text-secondary mt-0.5 truncate">
            {formatRelativeTime(caso.created_at)} - {formatLocation(caso)}
          </p>
        </div>
        <div className="shrink-0">
          <StatusBadge status={resolveWorkflowStatus(caso)} />
        </div>
      </Link>
    </li>
  )
}

function ActivityRow({ item }: { item: AdminDashboardActivityItem }) {
  const visual = getActivityVisual(item.type)
  const c = colorMap[visual.color]
  const Icon = visual.icon

  return (
    <li className="flex gap-3 py-3 border-b border-border last:border-none">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${c.bg}`}>
        <Icon size={14} className={c.text} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-text-primary leading-snug font-semibold">{item.title}</p>
        <p className="text-sm text-text-secondary truncate">{item.detail}</p>
        <p className="text-xs text-text-secondary mt-1 flex items-center gap-1">
          <Clock size={10} />
          {formatRelativeTime(item.created_at)}
        </p>
      </div>
    </li>
  )
}

export default function AdminDashboard() {
  const { user } = useAuth()
  const {
    data: summary = EMPTY_SUMMARY,
    error,
    isLoading,
    isFetching,
    refetch,
  } = useAdminDashboardSummary()

  const today = new Intl.DateTimeFormat('es-DO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date())

  const stats = useMemo<Stat[]>(
    () => [
      {
        label: 'Usuarios registrados',
        value: summary.totalUsers,
        icon: Users,
        color: 'primary',
        trend: `${summary.usersThisMonth} nuevos este mes`,
        up: summary.usersThisMonth >= summary.usersPreviousMonth,
      },
      {
        label: 'Autoridades activas',
        value: summary.activeAuthorities,
        icon: ShieldCheck,
        color: 'warning',
        trend: `${summary.authoritiesThisMonth} nuevas este mes`,
        up: summary.authoritiesThisMonth >= summary.authoritiesPreviousMonth,
      },
      {
        label: 'Casos activos',
        value: summary.activeCases,
        icon: FileSearch,
        color: 'error',
        trend: `${summary.casesThisWeek} nuevos esta semana`,
        up: summary.casesThisWeek <= summary.casesPreviousWeek,
      },
      {
        label: 'Casos resueltos',
        value: summary.resolvedCases,
        icon: CheckCircle2,
        color: 'success',
        trend: `${summary.resolvedThisMonth} actualizados este mes`,
        up: summary.resolvedThisMonth >= summary.resolvedPreviousMonth,
      },
    ],
    [summary],
  )

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="card p-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
            <p className="text-sm text-text-secondary mt-0.5">
              Bienvenido,{' '}
              <span className="text-text-primary font-medium">
                {user?.name} {user?.last_nmae}
              </span>{' '}
              - {today}
            </p>
            <p className="text-xs text-text-secondary mt-2">Resumen dinamico del sistema para administracion.</p>
          </div>

          <button type="button" onClick={() => void refetch()} className="btn-secondary inline-flex items-center gap-2">
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
            Actualizar
          </button>
        </div>

        {error && <Alert type="error" message={error instanceof Error ? error.message : 'No se pudo cargar el dashboard.'} />}

        {isLoading ? (
          <div className="card p-10 flex items-center justify-center">
            <Spinner size="lg" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {stats.map((stat) => (
                <StatCard key={stat.label} {...stat} />
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4 gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-text-primary">Casos recientes</h2>
                    <p className="text-xs text-text-secondary mt-1">
                      {summary.pendingCases} pendientes de revision en este momento.
                    </p>
                  </div>
                  <Link to="/authority/cases" className="text-xs font-medium text-primary hover:underline">
                    Ver casos
                  </Link>
                </div>

                {summary.recentCases.length === 0 ? (
                  <p className="text-sm text-text-secondary">No hay casos registrados todavia.</p>
                ) : (
                  <ul>
                    {summary.recentCases.map((caso) => (
                      <RecentCaseRow key={caso.id} caso={caso} />
                    ))}
                  </ul>
                )}
              </div>

              <div className="card p-6">
                <div className="flex items-center justify-between mb-4 gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-text-primary">Actividad reciente</h2>
                    <p className="text-xs text-text-secondary mt-1">Usuarios y casos cargados desde Supabase.</p>
                  </div>
                  <span className="text-xs text-text-secondary flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                    Actualizado
                  </span>
                </div>

                {summary.recentActivity.length === 0 ? (
                  <p className="text-sm text-text-secondary">No hay actividad reciente disponible.</p>
                ) : (
                  <ul>
                    {summary.recentActivity.map((item) => (
                      <ActivityRow key={item.id} item={item} />
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
