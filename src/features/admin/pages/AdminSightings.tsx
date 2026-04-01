import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertCircle, Calendar, CheckCircle2, Eye, MapPin, RefreshCw, Search, UserRound, XCircle } from 'lucide-react'
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

const STATUS_META: Record<Exclude<SightingStatus, 'all'>, { label: string; color: string; bg: string; dot: string }> = {
  pending:  { label: 'Pendiente', color: '#2B5CE6', bg: 'rgba(43,92,230,0.08)', dot: '#2B5CE6' },
  approved: { label: 'Aceptado', color: '#059669', bg: 'rgba(5,150,105,0.08)', dot: '#059669' },
  rejected: { label: 'Rechazado', color: '#DC2626', bg: 'rgba(220,38,38,0.08)', dot: '#DC2626' },
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

  const statCards = [
    { label: 'Total', value: summary.total, color: '#111827', bg: '#F8F9FB', border: '#E4E7EC' },
    { label: 'Pendientes', value: summary.pending, color: '#2B5CE6', bg: 'rgba(43,92,230,0.05)', border: 'rgba(43,92,230,0.2)' },
    { label: 'Aceptados', value: summary.approved, color: '#059669', bg: 'rgba(5,150,105,0.05)', border: 'rgba(5,150,105,0.2)' },
    { label: 'Rechazados', value: summary.rejected, color: '#DC2626', bg: 'rgba(220,38,38,0.05)', border: 'rgba(220,38,38,0.2)' },
  ]

  return (
    <AdminSidebar>
      <div style={{ height: '100vh', overflow: 'hidden', background: '#F2F4F7', fontFamily: "'Geist', 'Inter', sans-serif" }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
          @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
          @keyframes dotPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.75)} }
          @keyframes rowIn { from { opacity:0; transform:translateX(-4px); } to { opacity:1; transform:translateX(0); } }
          @keyframes spin { to { transform: rotate(360deg); } }

          .sight-scroll::-webkit-scrollbar { width: 5px; }
          .sight-scroll::-webkit-scrollbar-thumb { background: rgba(100,116,139,0.2); border-radius: 999px; }

          .si-card { background:#fff; border:1px solid #E4E7EC; border-radius:10px; box-shadow:0 1px 2px rgba(0,0,0,0.04),0 1px 4px rgba(0,0,0,0.03); }
          .si-in { animation: fadeUp 0.4s ease-out both; }
          .si-in-1 { animation-delay:0.05s; }
          .si-in-2 { animation-delay:0.1s; }
          .si-in-3 { animation-delay:0.15s; }

          .sight-row { animation: rowIn 0.3s ease-out both; transition: background 0.15s; }
          .sight-row:hover { background: rgba(43,92,230,0.025) !important; }

          .filter-pill {
            display:inline-flex; align-items:center; gap:6px;
            padding:5px 13px; border-radius:999px;
            border:1px solid #E4E7EC; background:#fff;
            font-size:12px; font-family:'Geist',sans-serif; font-weight:500;
            color:#64748B; cursor:pointer; transition:all 0.15s;
          }
          .filter-pill:hover { border-color:#CBD5E1; color:#334155; }
          .filter-pill.active { background:rgba(43,92,230,0.06); border-color:rgba(43,92,230,0.3); color:#2B5CE6; }

          .si-input {
            background:#fff; border:1px solid #E4E7EC; color:#111827;
            border-radius:8px; padding:9px 14px 9px 36px; width:100%; outline:none;
            font-size:13px; font-family:'Geist',sans-serif;
            transition:border-color 0.15s, box-shadow 0.15s;
          }
          .si-input:focus { border-color:#2B5CE6; box-shadow:0 0 0 3px rgba(43,92,230,0.1); }
          .si-input::placeholder { color:#9CA3AF; }

          .si-btn-approve {
            display:inline-flex; align-items:center; gap:5px;
            padding:6px 12px; border-radius:7px;
            font-size:12px; font-family:'Geist',sans-serif; font-weight:500;
            color:#059669; background:rgba(5,150,105,0.08); border:1px solid rgba(5,150,105,0.2);
            cursor:pointer; transition:all 0.15s;
          }
          .si-btn-approve:hover { background:rgba(5,150,105,0.14); }
          .si-btn-approve:disabled { opacity:0.4; cursor:not-allowed; }

          .si-btn-reject {
            display:inline-flex; align-items:center; gap:5px;
            padding:6px 12px; border-radius:7px;
            font-size:12px; font-family:'Geist',sans-serif; font-weight:500;
            color:#DC2626; background:transparent; border:1px solid rgba(220,38,38,0.25);
            cursor:pointer; transition:all 0.15s;
          }
          .si-btn-reject:hover { background:rgba(220,38,38,0.06); }
          .si-btn-reject:disabled { opacity:0.4; cursor:not-allowed; }
        `}</style>

        <main className="sight-scroll" style={{ height: '100%', overflowY: 'auto' }}>
          <div style={{ maxWidth: 1280, margin: '0 auto', padding: '40px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="si-card si-in" style={{ padding: '28px 32px', background: 'linear-gradient(135deg, #fff 0%, #F8F9FF 100%)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                <div>
                  <p style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", fontWeight: 500, color: '#2B5CE6', letterSpacing: '0.28em', textTransform: 'uppercase', marginBottom: 8 }}>
                    Panel admin · Avistamientos
                  </p>
                  <h1 style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 32, color: '#111827', fontWeight: 400, letterSpacing: '-0.03em', marginBottom: 6 }}>
                    Avistamientos
                  </h1>
                  <p style={{ fontSize: 13, color: '#6B7280' }}>
                    Revisa reportes de posibles ubicaciones relacionadas a casos activos.
                  </p>
                </div>
                <button type="button" onClick={() => void loadSightings()} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 16px',
                  borderRadius: 8, border: '1px solid #E4E7EC', background: '#fff',
                  color: '#64748B', fontSize: 12, fontFamily: "'Geist', sans-serif", fontWeight: 500,
                  cursor: 'pointer', transition: 'all 0.15s',
                }}>
                  <RefreshCw size={12} /> Actualizar
                </button>
              </div>
            </div>

            <div className="si-in si-in-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              {statCards.map((s) => (
                <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 10, padding: '18px 20px' }}>
                  <p style={{ fontSize: 11, color: '#6B7280', fontWeight: 500, marginBottom: 8 }}>{s.label}</p>
                  <p style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 30, color: s.color, fontWeight: 400, lineHeight: 1 }}>{s.value}</p>
                </div>
              ))}
            </div>

            <div className="si-card si-in si-in-1" style={{ padding: '18px 22px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
                <div style={{ position: 'relative', flex: 1, minWidth: 240, maxWidth: 380 }}>
                  <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', pointerEvents: 'none' }} />
                  <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por caso, persona o ubicación..." className="si-input" />
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {(['all', 'pending', 'approved', 'rejected'] as SightingStatus[]).map((s) => {
                    const meta = s === 'all' ? { dot: '#94A3B8', label: 'Todos' } : STATUS_META[s]
                    return (
                      <button key={s} type="button" onClick={() => setStatusFilter(s)} className={`filter-pill ${statusFilter === s ? 'active' : ''}`}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: meta.dot }} />
                        {meta.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {error && (
              <div className="si-card" style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(220,38,38,0.04)', borderColor: 'rgba(220,38,38,0.2)' }}>
                <AlertCircle size={14} style={{ color: '#DC2626', flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: '#B91C1C' }}>{error}</span>
              </div>
            )}

            <div className="si-card si-in si-in-2" style={{ overflow: 'hidden' }}>
              {loading ? (
                <div style={{ padding: '64px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 22, height: 22, border: '2px solid rgba(43,92,230,0.2)', borderTopColor: '#2B5CE6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  <p style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: '#9CA3AF' }}>Cargando avistamientos...</p>
                </div>
              ) : filteredSightings.length === 0 ? (
                <div style={{ padding: '64px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: '#F8F9FB', border: '1px solid #E4E7EC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Eye size={20} style={{ color: '#9CA3AF' }} />
                  </div>
                  <p style={{ fontSize: 14, color: '#6B7280', fontWeight: 500 }}>No hay avistamientos disponibles.</p>
                  <p style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center', maxWidth: 320 }}>Si tus compañeros ya crearon la tabla, esta vista la detecta automáticamente.</p>
                </div>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {filteredSightings.map((item, idx) => {
                    const status = normalizeStatus(item.status)
                    const meta = STATUS_META[status]
                    const rowLoading = actionLoadingId === item.id
                    return (
                      <li key={item.id} className="sight-row" style={{ padding: '20px 24px', borderBottom: '1px solid #F1F3F5', animationDelay: `${idx * 20}ms`, background: idx % 2 !== 0 ? '#FAFBFC' : '#fff', position: 'relative' }}>
                        <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: meta.color, opacity: 0.5, borderRadius: '0 2px 2px 0' }} />

                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            padding: '3px 10px', borderRadius: 999,
                            background: meta.bg, color: meta.color,
                            fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
                            fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.12em',
                          }}>
                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: meta.dot, animation: status === 'pending' ? 'dotPulse 2s ease-in-out infinite' : 'none' }} />
                            {meta.label}
                          </span>
                          {item.caseNumber && (
                            <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: '#2B5CE6', background: 'rgba(43,92,230,0.07)', border: '1px solid rgba(43,92,230,0.15)', padding: '3px 9px', borderRadius: 6 }}>
                              Caso {item.caseNumber}
                            </span>
                          )}
                          <span style={{ fontSize: 11, color: '#9CA3AF', fontFamily: "'JetBrains Mono', monospace" }}>
                            {item.sourceTable}
                          </span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: '#374151' }}>
                            <UserRound size={13} style={{ color: '#9CA3AF', flexShrink: 0 }} />
                            {item.missingPersonName ?? 'Persona no identificada'}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: '#374151' }}>
                            <MapPin size={13} style={{ color: '#9CA3AF', flexShrink: 0 }} />
                            {item.location ?? 'Ubicación no especificada'}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#9CA3AF', gridColumn: '1 / -1' }}>
                            <Calendar size={11} />
                            {formatDate(item.created_at)}
                            {item.reporterName && <span style={{ color: '#6B7280' }}>· Reportado por {item.reporterName}</span>}
                          </div>
                        </div>

                        <p style={{ fontSize: 13, lineHeight: 1.65, color: '#374151', background: '#F8F9FB', border: '1px solid #E4E7EC', borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}>
                          {item.details}
                        </p>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <button type="button" disabled={rowLoading || status === 'approved'} onClick={() => { if (status !== 'approved') void applyStatus(item.id, 'approved') }} className="si-btn-approve">
                            <CheckCircle2 size={12} /> Aceptar
                          </button>
                          <button type="button" disabled={rowLoading || status === 'rejected'} onClick={() => { if (status !== 'rejected') void applyStatus(item.id, 'rejected') }} className="si-btn-reject">
                            <XCircle size={12} /> Rechazar
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
