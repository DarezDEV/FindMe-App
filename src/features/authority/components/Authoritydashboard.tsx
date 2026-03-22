import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ShieldCheck, AlertTriangle, Clock, CheckCircle2, Eye,
  Users, ArrowRight, RefreshCw, MapPin, Calendar, TrendingUp, Activity,
} from 'lucide-react'
import { useAuth } from '../../auth/hooks'
import {
  getAuthorityDashboardSummary,
  subscribeToCasesRealtime,
  type AuthorityCaseRow,
  type AuthorityDashboardSummary,
} from '../../../lib/supabase/db'

interface StatCardProps {
  label: string
  value: string | number
  icon: ReactNode
  color: string
  bg: string
  border: string
  trend?: string
  trendLabel?: string
}

const EMPTY_SUMMARY: AuthorityDashboardSummary = {
  total: 0, active: 0, inProgress: 0, resolved: 0,
  pending: 0, approved: 0, rejected: 0, found: 0, closed: 0, recentCases: [],
}

function formatDate(dateIso: string) {
  const parsed = new Date(dateIso)
  if (Number.isNaN(parsed.getTime())) return 'Sin fecha'
  return new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).format(parsed)
}
function formatLocation(caso: AuthorityCaseRow) {
  return caso.ciudad || caso.estado_provincia || caso.lugar_ultima_vez || 'Sin ubicación'
}

function StatCard({ label, value, icon, color, bg, border, trend, trendLabel }: StatCardProps) {
  return (
    <div style={{
      background: bg, border: `1px solid ${border}`, borderRadius: 12,
      padding: '22px 24px', position: 'relative', overflow: 'hidden',
      transition: 'box-shadow 0.2s, transform 0.2s', cursor: 'default',
      boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)'; e.currentTarget.style.transform = 'none' }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.7)', border: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color }}>{icon}</span>
        </div>
        {trend !== undefined && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(0,0,0,0.06)' }}>
            <TrendingUp size={9} style={{ color: '#6B7280' }} />
            <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: '#6B7280' }}>{trend}</span>
          </div>
        )}
      </div>
      <p style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 34, color, fontWeight: 400, lineHeight: 1, marginBottom: 6 }}>{value}</p>
      <p style={{ fontSize: 12, color: '#6B7280', fontWeight: 500 }}>{label}</p>
      {trendLabel && <p style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: '#6B7280', marginTop: 6 }}>{trendLabel}</p>}
    </div>
  )
}

const QUICK_STATS = [
  { key: 'pending',  label: 'Pendientes',  dot: '#f59e0b' },
  { key: 'approved', label: 'Aprobados',   dot: '#10b981' },
  { key: 'rejected', label: 'Rechazados',  dot: '#ef4444' },
  { key: 'found',    label: 'Encontrados', dot: '#3b82f6' },
  { key: 'closed',   label: 'Cerrados',    dot: '#6B7280' },
]

export function AuthorityDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [summary, setSummary] = useState<AuthorityDashboardSummary>(EMPTY_SUMMARY)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const loadSummary = useCallback(async () => {
    setLoading(true); setError(null)
    try { setSummary(await getAuthorityDashboardSummary()); setLastUpdated(new Date()) }
    catch (err) { setError(err instanceof Error ? err.message : 'No se pudo cargar el dashboard.') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { void loadSummary() }, [loadSummary])
  useEffect(() => { const u = subscribeToCasesRealtime(() => void loadSummary()); return u }, [loadSummary])

  const resolutionRate = summary.total > 0 ? Math.round(((summary.resolved + summary.found) / summary.total) * 100) : 0

  return (
    <div style={{ minHeight: '100vh', background: '#f5f7fb', fontFamily: "'Geist', 'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to { transform:rotate(360deg); } }
        @keyframes growBar { from{transform:scaleX(0)} to{transform:scaleX(1)} }
        @keyframes dotPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.7)} }

        .d-scroll::-webkit-scrollbar { width:5px; }
        .d-scroll::-webkit-scrollbar-thumb { background:rgba(100,116,139,0.2); border-radius:999px; }

        .d-card { background:#fff; border:1px solid #e5e7eb; border-radius:12px; box-shadow:0 4px 12px rgba(0,0,0,0.05); }
        .d-in { animation: fadeUp 0.4s ease-out both; }
        .d-in-1 { animation-delay:0.06s; }
        .d-in-2 { animation-delay:0.12s; }
        .d-in-3 { animation-delay:0.18s; }
        .d-in-4 { animation-delay:0.24s; }

        .recent-row { transition: background 0.12s; }
        .recent-row:hover { background: #f9fafb !important; }

        .d-ghost {
          display:inline-flex; align-items:center; gap:7px;
          padding:8px 16px; border-radius:8px;
          border:1px solid #e5e7eb; background:#fff;
          color:#6B7280; font-size:12px; font-family:'Geist',sans-serif; font-weight:500;
          cursor:pointer; transition:all 0.15s;
        }
        .d-ghost:hover { border-color:#CBD5E1; color:#334155; }
        .d-ghost:disabled { opacity:0.45; cursor:not-allowed; }

        .bar-grow { animation: growBar 1.2s cubic-bezier(0.16,1,0.3,1) forwards; transform-origin: left; }

        .see-all {
          display:inline-flex; align-items:center; gap:4px;
          font-size:12px; color:#6B7280; font-weight:500;
          cursor:pointer; background:none; border:none;
          transition:color 0.15s;
        }
        .see-all:hover { color:#2563eb; }
      `}</style>

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '40px 32px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* ─── HEADER ─── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20 }} className="d-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck size={24} style={{ color: '#2563eb' }} />
            </div>
            <div>
              <p style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", fontWeight: 500, color: '#2563eb', letterSpacing: '0.28em', textTransform: 'uppercase', marginBottom: 6 }}>
                Panel de Control · Autoridad
              </p>
              <h1 style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 30, color: '#111827', fontWeight: 400, letterSpacing: '-0.03em', marginBottom: 4 }}>
                {user?.name ? `Bienvenido, ${user.name}` : 'Panel de Autoridad'}
              </h1>
              <p style={{ fontSize: 12, color: '#6B7280', fontFamily: "'JetBrains Mono', monospace" }}>
                {lastUpdated
                  ? `Actualizado · ${lastUpdated.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`
                  : 'Sistema de gestión en tiempo real'
                }
              </p>
            </div>
          </div>
          <button type="button" onClick={loadSummary} disabled={loading} className="d-ghost" style={{ marginTop: 6 }}>
            <RefreshCw size={12} style={{ animation: loading ? 'spin 0.8s linear infinite' : 'none' }} />
            Actualizar
          </button>
        </div>

        {/* ─── ERROR ─── */}
        {error && (
          <div className="d-card" style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(239,68,68,0.04)', borderColor: 'rgba(239,68,68,0.2)' }}>
            <AlertTriangle size={14} style={{ color: '#ef4444', flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: '#B91C1C' }}>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="d-card" style={{ padding: '64px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 22, height: 22, border: '2px solid rgba(37,99,235,0.2)', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: '#6B7280' }}>Cargando estadísticas...</p>
          </div>
        ) : (
          <>
            {/* ─── KPI CARDS ─── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
              {[
                { label: 'Casos activos',   value: summary.active,    icon: <AlertTriangle size={17} />, color: '#ef4444', bg: '#ffffff',   border: '#e5e7eb',   trend: `${summary.pending}`, trendLabel: `${summary.pending} pendiente${summary.pending !== 1 ? 's' : ''} de revisión`, delay: '0ms' },
                { label: 'En proceso',       value: summary.inProgress, icon: <Clock size={17} />,         color: '#3b82f6', bg: '#ffffff',   border: '#e5e7eb',   trend: `${summary.approved}`, trendLabel: `${summary.approved} aprobado${summary.approved !== 1 ? 's' : ''}`, delay: '60ms' },
                { label: 'Casos resueltos',  value: summary.resolved,  icon: <CheckCircle2 size={17} />,   color: '#10b981', bg: '#ffffff',  border: '#e5e7eb',  trend: `${summary.found}`, trendLabel: `${summary.found} persona${summary.found !== 1 ? 's' : ''} encontrada${summary.found !== 1 ? 's' : ''}`, delay: '120ms' },
                { label: 'Total registros',  value: summary.total,     icon: <Eye size={17} />,            color: '#111827', bg: '#ffffff',                border: '#e5e7eb',               trend: `${resolutionRate}%`, trendLabel: 'Tasa de resolución global', delay: '180ms' },
              ].map((card) => (
                <div key={card.label} className="d-in" style={{ animationDelay: card.delay }}>
                  <StatCard {...card} />
                </div>
              ))}
            </div>

            {/* ─── RESOLUTION BAR ─── */}
            <div className="d-card d-in d-in-2" style={{ padding: '24px 28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 4 }}>Tasa de resolución</p>
                  <p style={{ fontSize: 12, color: '#6B7280' }}>Progreso global del sistema</p>
                </div>
                <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 28, color: '#2563eb', fontWeight: 400 }}>{resolutionRate}%</span>
              </div>
              <div style={{ height: 6, borderRadius: 999, background: '#e5e7eb', overflow: 'hidden' }}>
                <div className="bar-grow" style={{ height: '100%', borderRadius: 999, background: 'linear-gradient(90deg, #2563eb, #5B8BF5)', width: `${resolutionRate}%` }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: '#6B7280' }}>0%</span>
                <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: '#6B7280' }}>100%</span>
              </div>
            </div>

            {/* ─── BOTTOM GRID ─── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16 }} className="d-in d-in-3">

              {/* Recent Cases */}
              <div className="d-card" style={{ overflow: 'hidden' }}>
                <div style={{ padding: '18px 22px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 2 }}>Últimos casos registrados</p>
                    <p style={{ fontSize: 12, color: '#6B7280' }}>Actividad reciente en el sistema</p>
                  </div>
                  <button type="button" onClick={() => navigate('/authority/cases')} className="see-all">
                    Ver todos <ArrowRight size={12} />
                  </button>
                </div>

                {summary.recentCases.length === 0 ? (
                  <div style={{ padding: '48px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                    <Activity size={18} style={{ color: '#D1D5DB' }} />
                    <p style={{ fontSize: 13, color: '#6B7280' }}>Sin casos registrados.</p>
                  </div>
                ) : (
                  <div>
                    {summary.recentCases.map((caso, idx) => (
                      <button
                        key={caso.id}
                        type="button"
                        onClick={() => navigate(`/authority/cases/${caso.id}`)}
                        className="recent-row"
                        style={{
                          width: '100%', textAlign: 'left', padding: '14px 22px',
                          borderBottom: idx < summary.recentCases.length - 1 ? '1px solid #F7F8FA' : 'none',
                          background: 'transparent', border: 'none', cursor: 'pointer',
                          display: 'block', transition: 'background 0.12s',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                              <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: '#6B7280' }}>{caso.numero_caso}</span>
                              <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#D1D5DB', flexShrink: 0 }} />
                              <span style={{ fontSize: 13, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {caso.nombres} {caso.apellidos}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#6B7280' }}>
                                <MapPin size={10} style={{ flexShrink: 0 }} /> {formatLocation(caso)}
                              </span>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#6B7280' }}>
                                <Calendar size={10} style={{ flexShrink: 0 }} /> {formatDate(caso.created_at)}
                              </span>
                            </div>
                          </div>
                          <ArrowRight size={13} style={{ color: '#D1D5DB', marginTop: 2, flexShrink: 0, transition: 'color 0.12s' }} />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Stats */}
              <div className="d-card" style={{ overflow: 'hidden' }}>
                <div style={{ padding: '18px 20px', borderBottom: '1px solid #e5e7eb' }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 2 }}>Resumen de estados</p>
                  <p style={{ fontSize: 12, color: '#6B7280' }}>Distribución por workflow</p>
                </div>
                <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {QUICK_STATS.map(({ key, label, dot }) => (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', borderRadius: 8, background: '#f9fafb', border: '1px solid #e5e7eb', transition: 'border-color 0.15s' }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#e5e7eb' }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e5e7eb' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: dot, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: '#6B7280' }}>{label}</span>
                      </div>
                      <span style={{ fontSize: 13, fontFamily: "'JetBrains Mono', monospace", fontWeight: 500, color: '#111827' }}>
                        {summary[key as keyof typeof summary] as number}
                      </span>
                    </div>
                  ))}

                  {/* Total */}
                  <div style={{ marginTop: 6, padding: '10px 12px', borderRadius: 8, background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Users size={12} style={{ color: '#2563eb' }} />
                      <span style={{ fontSize: 12, color: '#2563eb', fontWeight: 500 }}>Total global</span>
                    </div>
                    <span style={{ fontSize: 14, fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', color: '#2563eb', fontWeight: 400 }}>
                      {summary.total}
                    </span>
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
