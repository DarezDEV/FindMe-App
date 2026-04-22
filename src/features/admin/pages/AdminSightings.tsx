import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertCircle, Calendar, Eye, MapPin, RefreshCw, Search, UserRound, CheckCircle2, XCircle, Clock } from 'lucide-react'
import AdminSidebar from '../components/Adminsidebar'
import {
  getAuthoritySightings,
  normalizeAuthoritySightingRow,
  updateAuthoritySightingStatus,
  type AuthoritySightingRow,
  type SightingModerationStatus,
} from '../../../lib/supabase/db'
import { useRealtimeSightings } from '../../sightings/hooks/useRealtimeSightings'

type SightingStatus = 'all' | 'pending' | 'approved' | 'rejected'

function normalizeStatus(status: string | null): Exclude<SightingStatus, 'all'> {
  const value = (status ?? '').toLowerCase()
  if (['approved', 'aprobado', 'verified', 'validado', 'confirmado'].includes(value)) return 'approved'
  if (['rejected', 'rechazado', 'discarded', 'descartado'].includes(value)) return 'rejected'
  return 'pending'
}

function formatDate(value: string): string {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '—'
  return new Intl.DateTimeFormat('es-DO', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(parsed)
}

const STATUS_LABEL: Record<Exclude<SightingStatus, 'all'>, string> = {
  pending: 'Pendiente', approved: 'Validado', rejected: 'Descartado',
}

const STATUS_BADGE: Record<Exclude<SightingStatus, 'all'>, string> = {
  pending:  'text-amber-700 bg-amber-50 border-amber-200',
  approved: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  rejected: 'text-red-700 bg-red-50 border-red-200',
}

const STATUS_DOT: Record<Exclude<SightingStatus, 'all'>, string> = {
  pending: 'bg-amber-400', approved: 'bg-emerald-400', rejected: 'bg-red-400',
}

export default function AdminSightings() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<SightingStatus>('all')
  const [sightings, setSightings] = useState<AuthoritySightingRow[]>([])
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)

  const loadSightings = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getAuthoritySightings(300)
      setSightings(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los avistamientos.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void loadSightings() }, [loadSightings])

  useRealtimeSightings({
    onEvent: (payload) => {
      const sightingId = payload.new.id || payload.new.avistamiento_id || payload.old.id || payload.old.avistamiento_id
      if (!sightingId) return

      if (payload.eventType === 'DELETE' || payload.new.eliminado === true) {
        setSightings((prev) => prev.filter((item) => item.id !== sightingId))
        return
      }

      const nextRow = normalizeAuthoritySightingRow(payload.new as Record<string, unknown>)
      setSightings((prev) =>
        [...prev.filter((item) => item.id !== sightingId), nextRow].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        ),
      )
    },
  })

  const filteredSightings = useMemo(() => {
    const term = search.trim().toLowerCase()
    return sightings.filter((item) => {
      const normalizedStatus = normalizeStatus(item.status)
      if (statusFilter !== 'all' && normalizedStatus !== statusFilter) return false
      if (!term) return true
      const target = `${item.caseNumber ?? ''} ${item.missingPersonName ?? ''} ${item.location ?? ''} ${item.details}`.toLowerCase()
      return target.includes(term)
    })
  }, [search, sightings, statusFilter])

  const summary = useMemo(() => {
    let pending = 0, approved = 0, rejected = 0
    sightings.forEach((item) => {
      const s = normalizeStatus(item.status)
      if (s === 'approved') approved++
      else if (s === 'rejected') rejected++
      else pending++
    })
    return { total: sightings.length, pending, approved, rejected }
  }, [sightings])

  const applyStatus = async (sightingId: string, status: SightingModerationStatus) => {
    setActionLoadingId(sightingId)
    try {
      await updateAuthoritySightingStatus(sightingId, status)
      setSightings((prev) => prev.map((item) => (item.id === sightingId ? { ...item, status } : item)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el estado.')
    } finally {
      setActionLoadingId(null)
    }
  }

  return (
    <AdminSidebar>
      <div className="min-h-screen bg-slate-50">
        <style>{`
          .fm-input{width:100%;padding:8px 12px 8px 36px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;background:white;color:#0f172a;outline:none;font-family:inherit;transition:border-color 0.15s}
          .fm-input:focus{border-color:#94a3b8}
          .act-btn{display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:6px;font-size:11px;font-weight:500;border:1px solid;cursor:pointer;font-family:inherit;transition:all 0.1s}
          .act-btn:disabled{opacity:0.4;cursor:not-allowed}
        `}</style>

        <main>
          <div className="max-w-screen-xl mx-auto px-6 py-8 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-400 tracking-widest uppercase mb-1">Administración</p>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Avistamientos</h1>
                <p className="text-sm text-slate-500 mt-0.5">Revisa reportes de posibles ubicaciones relacionadas a casos activos.</p>
              </div>
              <button type="button" onClick={() => void loadSightings()} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 text-sm font-medium transition-all shadow-sm">
                <RefreshCw size={14} />Actualizar
              </button>
            </div>

            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
              {[
                { label: 'Total', value: summary.total, color: 'text-slate-700' },
                { label: 'Pendientes', value: summary.pending, color: 'text-amber-600' },
                { label: 'Validados', value: summary.approved, color: 'text-emerald-600' },
                { label: 'Descartados', value: summary.rejected, color: 'text-red-500' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-white border border-slate-200 rounded-xl px-5 py-4 shadow-sm">
                  <p className="text-xs text-slate-400 font-medium mb-1.5">{label}</p>
                  <p className={`text-2xl font-bold tracking-tight ${color}`}>{value}</p>
                </div>
              ))}
            </div>

            <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="relative flex-1 min-w-0">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por caso, persona o ubicación..." className="fm-input" />
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {(['all', 'pending', 'approved', 'rejected'] as SightingStatus[]).map((s) => (
                  <button key={s} type="button" onClick={() => setStatusFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${statusFilter === s ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700'}`}>
                    {s === 'all' ? 'Todos' : STATUS_LABEL[s as Exclude<SightingStatus,'all'>]}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                <AlertCircle size={15} className="shrink-0" />{error}
              </div>
            )}

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              {loading ? (
                <div className="py-20 flex flex-col items-center gap-3 text-slate-400">
                  <div className="w-5 h-5 border-2 border-slate-200 border-t-slate-500 rounded-full animate-spin" />
                  <p className="text-sm">Cargando avistamientos...</p>
                </div>
              ) : filteredSightings.length === 0 ? (
                <div className="py-20 flex flex-col items-center gap-2">
                  <Eye className="text-slate-300 mb-1" size={28} />
                  <p className="text-slate-500 text-sm font-medium">No hay avistamientos disponibles</p>
                  <p className="text-slate-400 text-xs">Ajusta los filtros o actualiza la lista</p>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {filteredSightings.map((item) => {
                    const status = normalizeStatus(item.status)
                    const rowLoading = actionLoadingId === item.id
                    return (
                      <li key={item.id} className="p-5 hover:bg-slate-50/60 transition-colors">
                        <div className="flex flex-col gap-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide border ${STATUS_BADGE[status]}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[status]}`} />{STATUS_LABEL[status]}
                            </span>
                            {item.caseNumber && <span className="font-mono text-[11px] text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">{item.caseNumber}</span>}
                            <span className="text-[11px] text-slate-400">Fuente: {item.sourceTable}</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                            <div className="flex items-center gap-1.5 text-slate-500">
                              <UserRound size={12} className="text-slate-400 shrink-0" />{item.missingPersonName ?? 'Persona no identificada'}
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-500">
                              <MapPin size={12} className="text-slate-400 shrink-0" />{item.location ?? 'Ubicación no especificada'}
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-400">
                              <Calendar size={11} />{formatDate(item.created_at)}
                              {item.reporterName && <span className="text-slate-300">· {item.reporterName}</span>}
                            </div>
                          </div>

                          <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">{item.details}</p>

                          <div className="flex flex-wrap items-center gap-2 pt-0.5">
                            <button type="button" disabled={rowLoading} onClick={() => void applyStatus(item.id, 'pending')} className="act-btn text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100">
                              <Clock size={10} />Pendiente
                            </button>
                            <button type="button" disabled={rowLoading} onClick={() => void applyStatus(item.id, 'approved')} className="act-btn text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100">
                              <CheckCircle2 size={10} />Validar
                            </button>
                            <button type="button" disabled={rowLoading} onClick={() => void applyStatus(item.id, 'rejected')} className="act-btn text-red-600 bg-red-50 border-red-200 hover:bg-red-100">
                              <XCircle size={10} />Descartar
                            </button>
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}

              {!loading && filteredSightings.length > 0 && (
                <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50">
                  <p className="text-xs text-slate-400 font-mono">{filteredSightings.length} de {sightings.length} avistamientos</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </AdminSidebar>
  )
}
