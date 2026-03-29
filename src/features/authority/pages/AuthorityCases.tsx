import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, MapPin, Calendar, RefreshCw, MessageSquare, CheckCircle2, XCircle, Trash2, Filter } from 'lucide-react'
import { AuthoritySidebar } from '../components/AuthoritySidebar'
import {
  createCaseComment,
  deleteCaseComment,
  getAuthorityCases,
  getCaseComments,
  softDeleteCase,
  subscribeToCasesRealtime,
  updateCaseComment,
  updateCaseWorkflowStatus,
  type AuthorityCaseRow,
} from '../../../lib/supabase/db'
import { useAuth } from '../../auth/hooks'
import { appToast, type WorkflowStatus } from '../../../shared/components/ui'
import { CommentItem } from '../components/moderation/CommentItem'
import { deriveWorkflowStatus, getCaseActionAvailability } from '../utils/case-workflow'
import { logCaseAction } from '../utils/case-history'

type StatusFilter = 'all' | WorkflowStatus
type CaseCommentItem = {
  id: string
  text: string
  authorId: string
  createdAt: string
}

function getLocation(caso: AuthorityCaseRow): string {
  return caso.ciudad || caso.estado_provincia || caso.lugar_ultima_vez || 'Sin ubicación'
}

function getDateLabel(caso: AuthorityCaseRow): string {
  const sourceDate = caso.fecha_desaparicion || caso.created_at
  const parsed = new Date(sourceDate)
  if (Number.isNaN(parsed.getTime())) return 'Fecha no disponible'
  return new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).format(parsed)
}

function getPersistedStatus(row: AuthorityCaseRow): WorkflowStatus {
  return deriveWorkflowStatus(row)
}

function getStatusSuccessMessage(status: WorkflowStatus) {
  if (status === 'approved') return 'Caso publicado correctamente.'
  if (status === 'found') return 'Caso marcado como reunificado.'
  if (status === 'closed') return 'Caso archivado correctamente.'
  if (status === 'rejected') return 'Caso rechazado correctamente.'
  return 'Estado del caso actualizado.'
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  all:      { label: 'Todos',      color: '#64748B', bg: 'rgba(100,116,139,0.08)', dot: '#94A3B8' },
  pending:  { label: 'Pendiente',  color: '#2B5CE6', bg: 'rgba(43,92,230,0.08)',  dot: '#2B5CE6' },
  approved: { label: 'Aprobado',   color: '#059669', bg: 'rgba(5,150,105,0.08)',  dot: '#059669' },
  rejected: { label: 'Rechazado',  color: '#DC2626', bg: 'rgba(220,38,38,0.08)',  dot: '#DC2626' },
  found:    { label: 'Encontrado', color: '#0284C7', bg: 'rgba(2,132,199,0.08)',  dot: '#0284C7' },
  closed:   { label: 'Cerrado',    color: '#6B7280', bg: 'rgba(107,114,128,0.08)', dot: '#9CA3AF' },
}

function InlineStatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending
  const isPending = status === 'pending'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '6px',
      padding: '3px 10px', borderRadius: '999px',
      background: cfg.bg, color: cfg.color,
      fontSize: '10px', fontFamily: "'JetBrains Mono', monospace",
      fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.12em',
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%', background: cfg.dot,
        animation: isPending ? 'dotPulse 2s ease-in-out infinite' : 'none',
        flexShrink: 0,
      }} />
      {cfg.label}
    </span>
  )
}

export default function AuthorityCases() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cases, setCases] = useState<AuthorityCaseRow[]>([])
  const [statusByCaseId, setStatusByCaseId] = useState<Record<string, WorkflowStatus>>({})
  const [deleteTarget, setDeleteTarget] = useState<AuthorityCaseRow | null>(null)
  const [commentTarget, setCommentTarget] = useState<AuthorityCaseRow | null>(null)
  const [commentDraft, setCommentDraft] = useState('')
  const [commentsByCaseId, setCommentsByCaseId] = useState<Record<string, CaseCommentItem[]>>({})
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [commentLoading, setCommentLoading] = useState(false)

  const loadCases = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getAuthorityCases({ limit: 200 })
      const statusMap: Record<string, WorkflowStatus> = {}
      data.forEach((row) => { statusMap[row.id] = getPersistedStatus(row) })
      const comments = await getCaseComments(data.map((item) => item.id))
      const commentsMap: Record<string, CaseCommentItem[]> = {}
      comments.forEach((comment) => {
        if (!commentsMap[comment.caso_id]) commentsMap[comment.caso_id] = []
        commentsMap[comment.caso_id].push({ id: comment.id, text: comment.comentario, authorId: comment.autor_id, createdAt: comment.created_at })
      })
      setCases(data)
      setStatusByCaseId(statusMap)
      setCommentsByCaseId(commentsMap)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los casos.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void loadCases() }, [loadCases])

  useEffect(() => {
    const unsubscribe = subscribeToCasesRealtime((payload) => {
      const caseId = payload.new.id || payload.old.id
      if (!caseId) return
      if (payload.new.eliminado === true) {
        setCases((prev) => prev.filter((item) => item.id !== caseId))
        setStatusByCaseId((prev) => { const next = { ...prev }; delete next[caseId]; return next })
        setCommentsByCaseId((prev) => { const next = { ...prev }; delete next[caseId]; return next })
        return
      }
      const nextStatus = deriveWorkflowStatus({
        workflow_status: payload.new.workflow_status ?? null,
        status: payload.new.status ?? null,
      })
      if (nextStatus) setStatusByCaseId((prev) => ({ ...prev, [caseId]: nextStatus }))
      setCases((prev) => prev.map((item) => item.id === caseId ? { ...item, status: payload.new.status ?? item.status, workflow_status: payload.new.workflow_status ?? item.workflow_status } : item))
    })
    return unsubscribe
  }, [])

  const filteredCases = useMemo(() => {
    const term = search.trim().toLowerCase()
    return cases.filter((item) => {
      const workflowStatus = statusByCaseId[item.id] ?? 'pending'
      const statusMatch = statusFilter === 'all' ? true : workflowStatus === statusFilter
      const fullName = `${item.nombres} ${item.apellidos}`.toLowerCase()
      const searchMatch = term.length === 0 ? true : fullName.includes(term)
      return statusMatch && searchMatch
    })
  }, [cases, search, statusByCaseId, statusFilter])

  const applyStatus = async (caseId: string, status: WorkflowStatus) => {
    setError(null)
    setActionLoadingId(caseId)
    try {
      const currentStatus = statusByCaseId[caseId] ?? 'pending'
      const availability = getCaseActionAvailability(currentStatus)
      if (status === 'approved' && !availability.canApprove) return
      if (status === 'rejected' && !availability.canReject) return
      await updateCaseWorkflowStatus(caseId, status)
      setStatusByCaseId((prev) => ({ ...prev, [caseId]: status }))
      appToast.success(getStatusSuccessMessage(status))
      if (user?.id) {
        const action = status === 'approved' ? 'approved' : 'rejected'
        await logCaseAction(caseId, user.id, action)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el estado del caso.')
    } finally { setActionLoadingId(null) }
  }

  const handleDeleteCase = async () => {
    if (!deleteTarget) return
    setError(null)
    setDeleteLoading(true)
    try {
      await softDeleteCase(deleteTarget.id)
      setCases((prev) => prev.filter((item) => item.id !== deleteTarget.id))
      appToast.success(`Caso ${deleteTarget.numero_caso} eliminado correctamente.`)
      setDeleteTarget(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar el caso.')
    } finally { setDeleteLoading(false) }
  }

  const submitComment = async () => {
    if (!commentTarget || !commentDraft.trim() || !user?.id) return
    setError(null)
    setCommentLoading(true)
    try {
      const text = commentDraft.trim()
      const created = await createCaseComment(commentTarget.id, user.id, text)
      setCommentsByCaseId((prev) => ({
        ...prev,
        [commentTarget.id]: [...(prev[commentTarget.id] ?? []), { id: created.id, text, authorId: user.id, createdAt: new Date().toISOString() }],
      }))
      appToast.info('Comentario guardado correctamente.')
      setCommentDraft('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el comentario.')
    } finally { setCommentLoading(false) }
  }

  const handleDeleteComment = async (caseId: string, commentId: string) => {
    setCommentLoading(true)
    try {
      await deleteCaseComment(commentId)
      setCommentsByCaseId((prev) => ({ ...prev, [caseId]: (prev[caseId] ?? []).filter((c) => c.id !== commentId) }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar el comentario.')
    } finally { setCommentLoading(false) }
  }

  const handleEditComment = async (caseId: string, commentId: string, newText: string) => {
    setCommentLoading(true)
    try {
      await updateCaseComment(commentId, newText)
      setCommentsByCaseId((prev) => ({ ...prev, [caseId]: (prev[caseId] ?? []).map((c) => c.id === commentId ? { ...c, text: newText } : c) }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el comentario.')
    } finally { setCommentLoading(false) }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#F2F4F7', fontFamily: "'Geist', 'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

        /* ─── KEYFRAMES ─── */
        @keyframes dotPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.75); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes overlayIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes rowIn {
          from { opacity: 0; transform: translateX(-6px); }
          to   { opacity: 1; transform: translateX(0); }
        }

        /* ─── SCROLL ─── */
        .auth-scroll::-webkit-scrollbar { width: 5px; height: 5px; }
        .auth-scroll::-webkit-scrollbar-thumb { background: rgba(100,116,139,0.25); border-radius: 999px; }

        /* ─── SECTION ANIMATION ─── */
        .section-in { animation: fadeUp 0.4s ease-out both; }
        .section-in-1 { animation-delay: 0.05s; }
        .section-in-2 { animation-delay: 0.1s; }
        .section-in-3 { animation-delay: 0.15s; }

        /* ─── TABLE ROWS ─── */
        .case-tr { animation: rowIn 0.35s ease-out both; }
        .case-tr:hover td { background: rgba(43,92,230,0.04) !important; }
        .case-tr:hover .row-accent { opacity: 1 !important; }

        /* ─── FILTER CHIPS ─── */
        .filter-chip {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 6px 14px; border-radius: 999px;
          border: 1px solid #E4E7EC;
          font-size: 12px; font-family: 'Geist', sans-serif; font-weight: 500;
          color: #64748B; background: #fff;
          cursor: pointer; transition: all 0.15s ease-out;
        }
        .filter-chip:hover { border-color: #CBD5E1; color: #334155; }
        .filter-chip.active { border-color: rgba(43,92,230,0.35); background: rgba(43,92,230,0.06); color: #2B5CE6; }

        /* ─── ACTION BUTTONS ─── */
        .act-btn {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 5px 10px; border-radius: 6px;
          font-size: 11px; font-family: 'Geist', sans-serif; font-weight: 500;
          cursor: pointer; transition: all 0.15s ease-out; border: 1px solid transparent;
        }
        .act-btn:hover { transform: translateY(-1px); }
        .act-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
        .act-approve { color: #059669; background: rgba(5,150,105,0.08); border-color: rgba(5,150,105,0.2); }
        .act-approve:hover { background: rgba(5,150,105,0.14); }
        .act-reject  { color: #DC2626; background: transparent; border-color: rgba(220,38,38,0.3); }
        .act-reject:hover  { background: rgba(220,38,38,0.06); }
        .act-note    { color: #0284C7; background: rgba(2,132,199,0.07); border-color: rgba(2,132,199,0.2); }
        .act-note:hover    { background: rgba(2,132,199,0.12); }
        .act-del     { color: #9CA3AF; background: transparent; border-color: transparent; padding: 5px 7px; }
        .act-del:hover     { color: #DC2626; background: rgba(220,38,38,0.07); }

        /* ─── INPUT FIELDS ─── */
        .auth-input {
          background: #fff; border: 1px solid #E4E7EC; color: #111827;
          border-radius: 8px; padding: 9px 14px; width: 100%; outline: none;
          font-size: 13px; font-family: 'Geist', sans-serif;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .auth-input:focus { border-color: #2B5CE6; box-shadow: 0 0 0 3px rgba(43,92,230,0.1); }
        .auth-input::placeholder { color: #9CA3AF; }

        .auth-textarea {
          background: #F8F9FB; border: 1px solid #E4E7EC; color: #111827;
          border-radius: 8px; padding: 11px 14px; width: 100%; outline: none;
          font-size: 13px; font-family: 'Geist', sans-serif; resize: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .auth-textarea:focus { border-color: #2B5CE6; box-shadow: 0 0 0 3px rgba(43,92,230,0.1); background: #fff; }

        /* ─── BUTTONS ─── */
        .btn-ghost {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 8px 16px; border-radius: 8px;
          border: 1px solid #E4E7EC; background: #fff;
          color: #64748B; font-size: 12px; font-family: 'Geist', sans-serif; font-weight: 500;
          cursor: pointer; transition: all 0.15s ease-out;
        }
        .btn-ghost:hover { border-color: #CBD5E1; color: #334155; box-shadow: 0 2px 6px rgba(0,0,0,0.06); }

        .btn-primary {
          display: inline-flex; align-items: center; justify-content: center; gap: 7px;
          padding: 9px 18px; border-radius: 8px;
          border: none; background: #2B5CE6; color: #fff;
          font-size: 13px; font-family: 'Geist', sans-serif; font-weight: 500;
          cursor: pointer; transition: all 0.15s ease-out;
        }
        .btn-primary:hover { background: #2450CC; box-shadow: 0 4px 12px rgba(43,92,230,0.25); }
        .btn-primary:disabled { opacity: 0.45; cursor: not-allowed; box-shadow: none; }

        .btn-danger {
          display: inline-flex; align-items: center; justify-content: center; gap: 7px;
          padding: 9px 18px; border-radius: 8px;
          border: none; background: #DC2626; color: #fff;
          font-size: 13px; font-family: 'Geist', sans-serif; font-weight: 500;
          cursor: pointer; transition: all 0.15s ease-out;
        }
        .btn-danger:hover { background: #B91C1C; box-shadow: 0 4px 12px rgba(220,38,38,0.25); }
        .btn-danger:disabled { opacity: 0.45; cursor: not-allowed; }

        /* ─── CARD ─── */
        .auth-card {
          background: #fff; border: 1px solid #E4E7EC;
          border-radius: 10px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 1px 4px rgba(0,0,0,0.04);
        }

        /* ─── MODAL ─── */
        .modal-overlay {
          position: fixed; inset: 0; z-index: 50;
          display: flex; align-items: center; justify-content: center; padding: 20px;
          background: rgba(17,24,39,0.45); backdrop-filter: blur(5px);
          animation: overlayIn 0.2s ease-out;
        }
        .modal-card {
          position: relative; width: 100%;
          background: #fff; border: 1px solid #E4E7EC;
          border-radius: 12px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.18);
          animation: slideUp 0.25s ease-out;
        }
      `}</style>

      <AuthoritySidebar />

      {/* ─── MAIN CONTENT ─── */}
      <main className="auth-scroll" style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '40px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* ─── PAGE HEADER ─── */}
          <div className="auth-card section-in" style={{ padding: '28px 32px', background: 'linear-gradient(135deg, #fff 0%, #F8F9FF 100%)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
              <div>
                <p style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", fontWeight: 500, color: '#2B5CE6', letterSpacing: '0.28em', textTransform: 'uppercase', marginBottom: 8 }}>
                  Sistema de Gestión · Casos
                </p>
                <h1 style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 32, color: '#111827', fontWeight: 400, letterSpacing: '-0.03em', marginBottom: 6 }}>
                  Registro de Casos
                </h1>
                <p style={{ fontSize: 13, color: '#6B7280', maxWidth: 480 }}>
                  Gestión y seguimiento de todos los casos registrados en el sistema.
                </p>
              </div>
              <button type="button" onClick={() => void loadCases()} className="btn-ghost">
                <RefreshCw size={12} />
                Actualizar
              </button>
              <button type="button" onClick={() => navigate('/authority/cases/new')} className="btn-primary">
                Registrar caso
              </button>
            </div>
          </div>

          {/* ─── FILTERS ─── */}
          <div className="auth-card section-in section-in-1" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: 220, maxWidth: 340 }}>
                <Search size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', pointerEvents: 'none' }} />
                <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nombre..." className="auth-input" style={{ paddingLeft: 36 }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#9CA3AF' }}>
                <Filter size={12} />
                <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.2em', textTransform: 'uppercase' }}>Estado</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {Object.entries(STATUS_CONFIG).map(([value, cfg]) => (
                <button key={value} type="button" onClick={() => setStatusFilter(value as StatusFilter)} className={`filter-chip ${statusFilter === value ? 'active' : ''}`}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* ─── ERROR ─── */}
          {error && (
            <div className="auth-card section-in" style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(220,38,38,0.04)', borderColor: 'rgba(220,38,38,0.2)' }}>
              <XCircle size={14} style={{ color: '#DC2626', flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: '#B91C1C' }}>{error}</span>
            </div>
          )}

          {/* ─── TABLE ─── */}
          <div className="auth-card section-in section-in-2" style={{ overflow: 'hidden' }}>
            {loading ? (
              <div style={{ padding: '64px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 22, height: 22, border: '2px solid rgba(43,92,230,0.2)', borderTopColor: '#2B5CE6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                <p style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: '#9CA3AF' }}>Cargando casos...</p>
              </div>
            ) : filteredCases.length === 0 ? (
              <div style={{ padding: '64px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <p style={{ fontSize: 14, color: '#6B7280', fontWeight: 500 }}>No se encontraron casos.</p>
                <p style={{ fontSize: 12, color: '#9CA3AF' }}>Intenta cambiar los filtros de búsqueda.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', minWidth: 960, borderCollapse: 'collapse' }}>
                  {/* ─── TABLE HEAD ─── */}
                  <thead>
                    <tr style={{ background: 'linear-gradient(180deg, #F8F9FB 0%, rgba(248,249,251,0) 100%)' }}>
                      {['No. Caso', 'Persona', 'Zona', 'Fecha', 'Estado', 'Acciones'].map((h) => (
                        <th key={h} style={{
                          padding: '13px 20px', textAlign: 'left',
                          fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
                          fontWeight: 500, color: '#9CA3AF',
                          letterSpacing: '0.2em', textTransform: 'uppercase',
                          borderBottom: '1px solid #F1F3F5',
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>

                  {/* ─── TABLE BODY ─── */}
                  <tbody>
                    {filteredCases.map((item, idx) => {
                      const workflowStatus = statusByCaseId[item.id] ?? 'pending'
                      const availability = getCaseActionAvailability(workflowStatus)
                      const commentsCount = commentsByCaseId[item.id]?.length ?? 0
                      const isActionLoading = actionLoadingId === item.id
                      return (
                        <tr key={item.id} className="case-tr" style={{ animationDelay: `${idx * 18}ms`, position: 'relative' }}>
                          {/* Row accent line */}
                          <td style={{ padding: '14px 20px', borderBottom: '1px solid #F1F3F5', background: idx % 2 !== 0 ? '#FAFBFC' : '#fff', position: 'relative' }}>
                            <span className="row-accent" style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, borderRadius: '0 2px 2px 0', background: '#2B5CE6', opacity: 0, transition: 'opacity 0.15s' }} />
                            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#2B5CE6', fontWeight: 500 }}>{item.numero_caso}</span>
                          </td>
                          <td style={{ padding: '14px 20px', borderBottom: '1px solid #F1F3F5', background: idx % 2 !== 0 ? '#FAFBFC' : '#fff' }}>
                            <button type="button" onClick={() => navigate(`/authority/cases/${item.id}`)} style={{
                              background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left',
                              fontSize: 13, fontFamily: "'Geist', sans-serif", fontWeight: 600, color: '#111827',
                              transition: 'color 0.15s',
                            }}
                              onMouseEnter={(e) => { e.currentTarget.style.color = '#2B5CE6' }}
                              onMouseLeave={(e) => { e.currentTarget.style.color = '#111827' }}
                            >
                              {item.nombres} {item.apellidos}
                            </button>
                          </td>
                          <td style={{ padding: '14px 20px', borderBottom: '1px solid #F1F3F5', background: idx % 2 !== 0 ? '#FAFBFC' : '#fff' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#6B7280' }}>
                              <MapPin size={11} style={{ color: '#9CA3AF', flexShrink: 0 }} />
                              {getLocation(item)}
                            </span>
                          </td>
                          <td style={{ padding: '14px 20px', borderBottom: '1px solid #F1F3F5', background: idx % 2 !== 0 ? '#FAFBFC' : '#fff' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#6B7280' }}>
                              <Calendar size={11} style={{ color: '#9CA3AF', flexShrink: 0 }} />
                              {getDateLabel(item)}
                            </span>
                          </td>
                          <td style={{ padding: '14px 20px', borderBottom: '1px solid #F1F3F5', background: idx % 2 !== 0 ? '#FAFBFC' : '#fff' }}>
                            <InlineStatusBadge status={workflowStatus} />
                          </td>
                          <td style={{ padding: '14px 20px', borderBottom: '1px solid #F1F3F5', background: idx % 2 !== 0 ? '#FAFBFC' : '#fff' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                              {availability.canApprove && (
                                <button type="button" onClick={() => void applyStatus(item.id, 'approved')} disabled={isActionLoading} className="act-btn act-approve">
                                  <CheckCircle2 size={11} /> Aprobar
                                </button>
                              )}
                              {availability.canReject && (
                                <button type="button" onClick={() => void applyStatus(item.id, 'rejected')} disabled={isActionLoading} className="act-btn act-reject">
                                  <XCircle size={11} /> Rechazar
                                </button>
                              )}
                              {availability.canMarkFound && (
                                <button type="button" onClick={() => { setCommentTarget(item); setCommentDraft('') }} className="act-btn act-note">
                                  <MessageSquare size={11} />
                                  {commentsCount > 0 ? `Notas (${commentsCount})` : 'Anotar'}
                                </button>
                              )}
                              <button type="button" onClick={() => setDeleteTarget(item)} className="act-btn act-del">
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>

                {/* ─── TABLE FOOTER ─── */}
                <div style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #F1F3F5' }}>
                  <p style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: '#9CA3AF' }}>
                    {filteredCases.length} caso{filteredCases.length !== 1 ? 's' : ''} mostrado{filteredCases.length !== 1 ? 's' : ''}
                  </p>
                  <p style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: '#9CA3AF' }}>
                    {cases.length} en total
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ─── DELETE MODAL ─── */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setDeleteTarget(null) }}>
          <div className="modal-card" style={{ maxWidth: 420, borderLeft: '3px solid #DC2626' }}>
            <div style={{ padding: '28px 28px 24px' }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
                <Trash2 size={18} style={{ color: '#DC2626' }} />
              </div>
              <h2 style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 22, color: '#111827', fontWeight: 400, marginBottom: 8 }}>Confirmar eliminación</h2>
              <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.6, marginBottom: 24 }}>
                Estás por eliminar el caso{' '}
                <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#2B5CE6', fontWeight: 500 }}>{deleteTarget.numero_caso}</span>.
                {' '}Esta acción no se puede deshacer.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={() => setDeleteTarget(null)} className="btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>Cancelar</button>
                <button type="button" onClick={() => void handleDeleteCase()} disabled={deleteLoading} className="btn-danger" style={{ flex: 1 }}>
                  {deleteLoading ? 'Eliminando...' : 'Eliminar caso'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── COMMENT MODAL ─── */}
      {commentTarget && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setCommentTarget(null) }}>
          <div className="modal-card" style={{ maxWidth: 580, borderLeft: '3px solid #0284C7' }}>
            <div style={{ padding: '28px 28px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(2,132,199,0.08)', border: '1px solid rgba(2,132,199,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <MessageSquare size={16} style={{ color: '#0284C7' }} />
                </div>
                <div>
                  <h2 style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 20, color: '#111827', fontWeight: 400 }}>Notas del caso</h2>
                  <p style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: '#2B5CE6', marginTop: 2 }}>{commentTarget.numero_caso}</p>
                </div>
              </div>

              {/* Comments list */}
              <div style={{ background: '#F8F9FB', border: '1px solid #E4E7EC', borderRadius: 8, padding: '12px 14px', maxHeight: 200, overflowY: 'auto', marginBottom: 14 }} className="auth-scroll">
                {(commentsByCaseId[commentTarget.id] ?? []).length === 0 ? (
                  <p style={{ fontSize: 12, color: '#9CA3AF', fontFamily: "'JetBrains Mono', monospace", padding: '8px 0' }}>Sin notas registradas para este caso.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {(commentsByCaseId[commentTarget.id] ?? []).map((comment) => (
                      <div key={comment.id}>
                        <CommentItem comment={comment} currentUserId={user?.id ?? ''} onDelete={() => void handleDeleteComment(commentTarget.id, comment.id)} onEdit={(newText) => void handleEditComment(commentTarget.id, comment.id, newText)} disabled={commentLoading} />
                        <p style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: '#9CA3AF', marginTop: 4, paddingLeft: 2 }}>
                          {new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(comment.createdAt))}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <textarea value={commentDraft} onChange={(e) => setCommentDraft(e.target.value)} rows={4} className="auth-textarea" placeholder="Escribe una observación para este caso..." style={{ marginBottom: 16, display: 'block' }} />

              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={() => setCommentTarget(null)} className="btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>Cancelar</button>
                <button type="button" onClick={() => void submitComment()} disabled={!commentDraft.trim() || commentLoading} className="btn-primary" style={{ flex: 1 }}>
                  {commentLoading ? 'Guardando...' : 'Guardar nota'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}