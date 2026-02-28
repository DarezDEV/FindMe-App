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
  TrendingUp,
  Activity,
} from 'lucide-react'
import { useAuth } from '../../auth/hooks'
import { getAuthorityDashboardSummary, type AuthorityCaseRow, type AuthorityDashboardSummary } from '../../../lib/supabase/db'

// ─── Types ────────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string
  value: string | number
  icon: ReactNode
  accent: string
  accentBg: string
  accentBorder: string
  trend?: string
  trendLabel?: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateIso: string) {
  const parsed = new Date(dateIso)
  if (Number.isNaN(parsed.getTime())) return 'Sin fecha'
  return new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).format(parsed)
}

function formatLocation(caso: AuthorityCaseRow) {
  return caso.ciudad || caso.estado_provincia || caso.lugar_ultima_vez || 'Sin ubicación'
}

// ─── Components ───────────────────────────────────────────────────────────────

function StatCard({ label, value, icon, accent, accentBg, accentBorder, trend, trendLabel }: StatCardProps) {
  return (
    <div className="relative bg-[#0d1018] border border-[#1a1f2e] rounded-2xl p-6 overflow-hidden group hover:border-[#252d3d] transition-all duration-300">
      {/* Subtle glow on hover */}
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl ${accentBg} blur-xl scale-75`} />

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${accentBg} ${accentBorder}`}>
            <span className={accent}>{icon}</span>
          </div>
          {trend !== undefined && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/[0.03] border border-white/5">
              <TrendingUp size={10} className="text-slate-600" />
              <span className="text-[10px] font-mono text-slate-600">{trend}</span>
            </div>
          )}
        </div>

        <p className={`text-3xl font-bold tracking-tight mb-1 ${accent}`}>{value}</p>
        <p className="text-sm text-slate-500 font-medium">{label}</p>
        {trendLabel && (
          <p className="text-xs text-slate-700 font-mono mt-1.5">{trendLabel}</p>
        )}
      </div>
    </div>
  )
}

function QuickStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-[#090b0f] border border-[#1a1f2e] hover:border-[#252d3d] transition-colors">
      <div className="flex items-center gap-2.5">
        <span className={`w-2 h-2 rounded-full ${color}`} />
        <span className="text-xs text-slate-500">{label}</span>
      </div>
      <span className="text-sm font-semibold font-mono text-slate-300">{value}</span>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AuthorityDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [summary, setSummary] = useState<AuthorityDashboardSummary>(EMPTY_SUMMARY)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const loadSummary = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getAuthorityDashboardSummary()
      setSummary(data)
      setLastUpdated(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el dashboard.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void loadSummary() }, [loadSummary])

  const resolutionRate = summary.total > 0
    ? Math.round(((summary.resolved + summary.found) / summary.total) * 100)
    : 0

  return (
    <div className="min-h-screen bg-[#0a0c10] font-['Syne',sans-serif]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1e2535; border-radius: 4px; }
        .stat-bar { animation: growBar 1.2s cubic-bezier(0.16,1,0.3,1) forwards; transform-origin: left; }
        @keyframes growBar { from { transform: scaleX(0); } to { transform: scaleX(1); } }
        .card-enter { animation: cardEnter 0.3s ease forwards; }
        @keyframes cardEnter { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-7">

        {/* Header */}
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-amber-400/10 border border-amber-400/25 rounded-2xl flex items-center justify-center">
              <ShieldCheck className="w-7 h-7 text-amber-400" />
            </div>
            <div>
              <p className="text-[11px] font-mono text-amber-400/70 tracking-[0.2em] uppercase mb-1">Panel de Control</p>
              <h1 className="text-2xl font-bold text-slate-100 tracking-tight">
                {user?.name ? `Bienvenido, ${user.name}` : 'Panel de Autoridad'}
              </h1>
              <p className="text-sm text-slate-600 mt-0.5">
                {lastUpdated
                  ? `Actualizado a las ${lastUpdated.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`
                  : 'Sistema de gestión en tiempo real'
                }
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={loadSummary}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#12151f] border border-[#1e2535] text-slate-400 hover:text-slate-200 hover:border-slate-600 text-xs font-medium transition-all disabled:opacity-40"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Actualizar
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 px-4 py-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm">
            <AlertTriangle size={15} />
            {error}
          </div>
        )}

        {loading ? (
          <div className="bg-[#0d1018] border border-[#1a1f2e] rounded-2xl p-16 flex flex-col items-center justify-center gap-3">
            <div className="w-6 h-6 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
            <p className="text-xs text-slate-600 font-mono">Cargando estadísticas...</p>
          </div>
        ) : (
          <>
            {/* KPI Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="card-enter" style={{ animationDelay: '0ms' }}>
                <StatCard
                  label="Casos activos"
                  value={summary.active}
                  icon={<AlertTriangle size={18} />}
                  accent="text-rose-400"
                  accentBg="bg-rose-400/8"
                  accentBorder="border-rose-400/20"
                  trend={`${summary.pending}`}
                  trendLabel={`${summary.pending} pendiente${summary.pending !== 1 ? 's' : ''} de revisión`}
                />
              </div>
              <div className="card-enter" style={{ animationDelay: '60ms' }}>
                <StatCard
                  label="En proceso"
                  value={summary.inProgress}
                  icon={<Clock size={18} />}
                  accent="text-sky-400"
                  accentBg="bg-sky-400/8"
                  accentBorder="border-sky-400/20"
                  trend={`${summary.approved}`}
                  trendLabel={`${summary.approved} aprobado${summary.approved !== 1 ? 's' : ''}`}
                />
              </div>
              <div className="card-enter" style={{ animationDelay: '120ms' }}>
                <StatCard
                  label="Casos resueltos"
                  value={summary.resolved}
                  icon={<CheckCircle2 size={18} />}
                  accent="text-emerald-400"
                  accentBg="bg-emerald-400/8"
                  accentBorder="border-emerald-400/20"
                  trend={`${summary.found}`}
                  trendLabel={`${summary.found} persona${summary.found !== 1 ? 's' : ''} encontrada${summary.found !== 1 ? 's' : ''}`}
                />
              </div>
              <div className="card-enter" style={{ animationDelay: '180ms' }}>
                <StatCard
                  label="Total registros"
                  value={summary.total}
                  icon={<Eye size={18} />}
                  accent="text-slate-400"
                  accentBg="bg-slate-400/8"
                  accentBorder="border-slate-400/20"
                  trend={`${resolutionRate}%`}
                  trendLabel={`Tasa de resolución global`}
                />
              </div>
            </div>

            {/* Resolution Progress */}
            <div className="bg-[#0d1018] border border-[#1a1f2e] rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-200">Tasa de resolución</h3>
                  <p className="text-xs text-slate-600 mt-0.5">Progreso global del sistema</p>
                </div>
                <span className="text-2xl font-bold font-mono text-amber-400">{resolutionRate}%</span>
              </div>
              <div className="h-2 rounded-full bg-[#1a1f2e] overflow-hidden">
                <div
                  className="stat-bar h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-300"
                  style={{ width: `${resolutionRate}%` }}
                />
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-[11px] font-mono text-slate-700">0%</span>
                <span className="text-[11px] font-mono text-slate-700">100%</span>
              </div>
            </div>

            {/* Bottom Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

              {/* Recent Cases */}
              <div className="lg:col-span-2 bg-[#0d1018] border border-[#1a1f2e] rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-[#1a1f2e] flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-200">Últimos casos registrados</h2>
                    <p className="text-xs text-slate-600 mt-0.5">Actividad reciente en el sistema</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/authority/cases')}
                    className="inline-flex items-center gap-1.5 text-xs text-amber-400/70 hover:text-amber-400 font-medium transition-colors"
                  >
                    Ver todos
                    <ArrowRight size={12} />
                  </button>
                </div>

                {summary.recentCases.length === 0 ? (
                  <div className="p-10 flex flex-col items-center justify-center gap-2">
                    <Activity size={20} className="text-slate-700" />
                    <p className="text-sm text-slate-600">Sin casos registrados.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-[#13161e]">
                    {summary.recentCases.map((caso) => (
                      <button
                        key={caso.id}
                        type="button"
                        onClick={() => navigate('/authority/cases')}
                        className="w-full text-left px-6 py-4 hover:bg-white/[0.02] transition-colors group"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[11px] font-mono text-amber-400/60">{caso.numero_caso}</span>
                              <span className="w-1 h-1 rounded-full bg-slate-700" />
                              <span className="text-sm font-semibold text-slate-200 group-hover:text-amber-300 transition-colors truncate">
                                {caso.nombres} {caso.apellidos}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-slate-600">
                              <span className="inline-flex items-center gap-1">
                                <MapPin size={10} />
                                {formatLocation(caso)}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Calendar size={10} />
                                {formatDate(caso.created_at)}
                              </span>
                            </div>
                          </div>
                          <ArrowRight size={14} className="text-slate-700 group-hover:text-slate-500 transition-colors mt-0.5 shrink-0" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Stats */}
              <div className="bg-[#0d1018] border border-[#1a1f2e] rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-[#1a1f2e]">
                  <h2 className="text-sm font-semibold text-slate-200">Resumen de estados</h2>
                  <p className="text-xs text-slate-600 mt-0.5">Distribución por workflow</p>
                </div>
                <div className="p-5 space-y-2.5">
                  <QuickStat label="Pendientes" value={summary.pending} color="bg-amber-400" />
                  <QuickStat label="Aprobados" value={summary.approved} color="bg-emerald-400" />
                  <QuickStat label="Rechazados" value={summary.rejected} color="bg-rose-400" />
                  <QuickStat label="Encontrados" value={summary.found} color="bg-sky-400" />
                  <QuickStat label="Cerrados" value={summary.closed} color="bg-slate-500" />

                  <div className="pt-3 mt-1 border-t border-[#1a1f2e]">
                    <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-amber-400/5 border border-amber-400/15">
                      <div className="flex items-center gap-2.5">
                        <Users size={12} className="text-amber-400/70" />
                        <span className="text-xs text-slate-400 font-medium">Total global</span>
                      </div>
                      <span className="text-sm font-bold font-mono text-amber-400">{summary.total}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}