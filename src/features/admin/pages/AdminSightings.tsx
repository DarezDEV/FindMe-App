import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertCircle, Calendar, Eye, MapPin, RefreshCw, Search, UserRound } from 'lucide-react'
import AdminSidebar from '../components/Adminsidebar'
import {
  getAuthoritySightings,
  updateAuthoritySightingStatus,
  type AuthoritySightingRow,
  type SightingModerationStatus,
} from '../../../lib/supabase/db'

type SightingStatus = 'all' | 'pending' | 'approved' | 'rejected'

function normalizeStatus(status: string | null): Exclude<SightingStatus, 'all'> {
  const value = (status ?? '').toLowerCase()
  if (['approved', 'aprobado', 'verified', 'validado', 'confirmado'].includes(value)) return 'approved'
  if (['rejected', 'rechazado', 'discarded', 'descartado'].includes(value)) return 'rejected'
  return 'pending'
}

function formatDate(value: string): string {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'Sin fecha'
  return new Intl.DateTimeFormat('es-DO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed)
}

const STATUS_STYLES: Record<Exclude<SightingStatus, 'all'>, string> = {
  pending: 'text-amber-300 bg-amber-400/10 border-amber-400/25',
  approved: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/25',
  rejected: 'text-rose-300 bg-rose-400/10 border-rose-400/25',
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

  useEffect(() => {
    void loadSightings()
  }, [loadSightings])

  const filteredSightings = useMemo(() => {
    const term = search.trim().toLowerCase()
    return sightings.filter((item) => {
      const normalizedStatus = normalizeStatus(item.status)
      const statusMatch = statusFilter === 'all' ? true : normalizedStatus === statusFilter
      const searchTarget = `${item.caseNumber ?? ''} ${item.missingPersonName ?? ''} ${item.location ?? ''} ${item.details}`.toLowerCase()
      const searchMatch = term.length === 0 ? true : searchTarget.includes(term)
      return statusMatch && searchMatch
    })
  }, [search, sightings, statusFilter])

  const summary = useMemo(() => {
    let pending = 0
    let approved = 0
    let rejected = 0

    sightings.forEach((item) => {
      const status = normalizeStatus(item.status)
      if (status === 'approved') approved += 1
      else if (status === 'rejected') rejected += 1
      else pending += 1
    })

    return {
      total: sightings.length,
      pending,
      approved,
      rejected,
    }
  }, [sightings])

  const applyStatus = async (sightingId: string, status: SightingModerationStatus) => {
    setActionLoadingId(sightingId)
    try {
      await updateAuthoritySightingStatus(sightingId, status)
      setSightings((prev) =>
        prev.map((item) => (item.id === sightingId ? { ...item, status } : item)),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el estado del avistamiento.')
    } finally {
      setActionLoadingId(null)
    }
  }

  return (
    <AdminSidebar>
      <div className="min-h-screen bg-background">
        <style>{`
          .dark-input {
            background: #0f1117;
            border: 1px solid #1e2535;
            color: #e2e8f0;
            border-radius: 10px;
            padding: 10px 14px;
            width: 100%;
            outline: none;
            font-size: 13px;
          }
          .dark-input:focus { border-color: #fbbf24; }
        `}</style>

        <main className="overflow-y-auto">
          <div className="max-w-7xl mx-auto px-6 py-8 space-y-5">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[11px] font-mono text-amber-400/70 tracking-[0.2em] uppercase mb-1">Módulo de Avistamientos</p>
                <h1 className="text-3xl font-bold text-text-primary tracking-tight">Avistamientos</h1>
                <p className="text-sm text-text-secondary mt-1">Revisa reportes de posibles ubicaciones relacionadas a casos activos.</p>
              </div>
              <button
                type="button"
                onClick={() => void loadSightings()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border text-text-secondary hover:text-text-primary hover:border-border text-xs font-medium transition-all duration-150"
              >
                <RefreshCw size={13} />
                Actualizar
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="text-xs text-text-secondary">Total</p>
                <p className="text-2xl font-bold text-text-primary mt-1">{summary.total}</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="text-xs text-text-secondary">Pendientes</p>
                <p className="text-2xl font-bold text-amber-300 mt-1">{summary.pending}</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="text-xs text-text-secondary">Validados</p>
                <p className="text-2xl font-bold text-emerald-300 mt-1">{summary.approved}</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-4">
                <p className="text-xs text-text-secondary">Descartados</p>
                <p className="text-2xl font-bold text-rose-300 mt-1">{summary.rejected}</p>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar por caso, persona o ubicación..."
                    className="dark-input pl-9"
                  />
                </div>
                <div className="flex items-center gap-2">
                  {(['all', 'pending', 'approved', 'rejected'] as SightingStatus[]).map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setStatusFilter(status)}
                      className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${
                        statusFilter === status
                          ? 'bg-amber-400/10 text-amber-300 border-amber-400/30'
                          : 'bg-background text-text-secondary border-border hover:text-text-secondary'
                      }`}
                    >
                      {status === 'all' ? 'Todos' : status === 'pending' ? 'Pendientes' : status === 'approved' ? 'Validados' : 'Descartados'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-sm">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              {loading ? (
                <div className="p-14 text-center text-text-secondary text-sm">Cargando avistamientos...</div>
              ) : filteredSightings.length === 0 ? (
                <div className="p-14 text-center">
                  <Eye className="mx-auto text-text-secondary mb-3" size={22} />
                  <p className="text-text-secondary text-sm">No hay avistamientos disponibles.</p>
                  <p className="text-text-secondary text-xs mt-1">Si tus compañeros ya crearon la tabla, esta vista la detecta automáticamente.</p>
                </div>
              ) : (
                <ul className="divide-y divide-[#161b26]">
                  {filteredSightings.map((item) => {
                    const status = normalizeStatus(item.status)
                    const rowLoading = actionLoadingId === item.id
                    return (
                      <li key={item.id} className="p-5 space-y-3 hover:bg-white/[0.015] transition-colors">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wider border ${STATUS_STYLES[status]}`}>
                            {status === 'approved' ? 'Validado' : status === 'rejected' ? 'Descartado' : 'Pendiente'}
                          </span>
                          {item.caseNumber && (
                            <span className="text-[11px] font-mono text-amber-300 bg-amber-400/10 border border-amber-400/20 px-2 py-1 rounded-md">
                              Caso {item.caseNumber}
                            </span>
                          )}
                          <span className="text-[11px] text-text-secondary">Fuente: {item.sourceTable}</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center gap-2 text-text-secondary">
                            <UserRound size={14} className="text-text-secondary" />
                            <span>{item.missingPersonName ?? 'Persona no identificada'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-text-secondary">
                            <MapPin size={14} className="text-text-secondary" />
                            <span>{item.location ?? 'Ubicación no especificada'}</span>
                          </div>
                          <div className="flex items-center gap-2 text-text-secondary md:col-span-2">
                            <Calendar size={13} />
                            <span>{formatDate(item.created_at)}</span>
                            {item.reporterName && <span className="text-text-secondary">· Reportado por {item.reporterName}</span>}
                          </div>
                        </div>

                        <p className="text-sm leading-relaxed text-text-secondary bg-[#0b0e14] border border-border rounded-xl px-4 py-3">
                          {item.details}
                        </p>

                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <button
                            type="button"
                            disabled={rowLoading}
                            onClick={() => void applyStatus(item.id, 'pending')}
                            className="px-3 py-1.5 text-xs rounded-lg border border-amber-400/25 text-amber-300 bg-amber-400/10 hover:bg-amber-400/20 disabled:opacity-40"
                          >
                            Marcar pendiente
                          </button>
                          <button
                            type="button"
                            disabled={rowLoading}
                            onClick={() => void applyStatus(item.id, 'approved')}
                            className="px-3 py-1.5 text-xs rounded-lg border border-emerald-400/25 text-emerald-300 bg-emerald-400/10 hover:bg-emerald-400/20 disabled:opacity-40"
                          >
                            Validar
                          </button>
                          <button
                            type="button"
                            disabled={rowLoading}
                            onClick={() => void applyStatus(item.id, 'rejected')}
                            className="px-3 py-1.5 text-xs rounded-lg border border-rose-400/25 text-rose-300 bg-rose-400/10 hover:bg-rose-400/20 disabled:opacity-40"
                          >
                            Descartar
                          </button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>
        </main>
      </div>
    </AdminSidebar>
  )
}
