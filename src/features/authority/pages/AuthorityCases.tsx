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
import { type WorkflowStatus } from '../../../shared/components/ui'
import { CommentItem } from '../components/moderation/CommentItem'

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
  if (row.workflow_status) return row.workflow_status
  if (row.status === 'resuelto') return 'found'
  if (row.status === 'cerrado') return 'closed'
  return 'pending'
}

function deriveWorkflowStatus(
  workflowStatus: string | null | undefined,
  rawStatus: string | null | undefined,
): WorkflowStatus | null {
  if (workflowStatus === 'pending' || workflowStatus === 'approved' || workflowStatus === 'rejected' || workflowStatus === 'found' || workflowStatus === 'closed') {
    return workflowStatus
  }
  if (rawStatus === 'resuelto') return 'found'
  if (rawStatus === 'cerrado') return 'closed'
  return null
}

const STATUS_CONFIG: Record<string, { label: string; dot: string; badge: string }> = {
  all:      { label: 'Todos',      dot: 'bg-slate-400',  badge: '' },
  pending:  { label: 'Pendiente',  dot: 'bg-amber-400',  badge: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
  approved: { label: 'Aprobado',   dot: 'bg-emerald-400',badge: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
  rejected: { label: 'Rechazado',  dot: 'bg-rose-400',   badge: 'text-rose-400 bg-rose-400/10 border-rose-400/20' },
  found:    { label: 'Encontrado', dot: 'bg-sky-400',    badge: 'text-sky-400 bg-sky-400/10 border-sky-400/20' },
  closed:   { label: 'Cerrado',    dot: 'bg-slate-400',  badge: 'text-slate-400 bg-slate-400/10 border-slate-400/20' },
}

function InlineStatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase tracking-widest border ${cfg.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
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
        setStatusByCaseId((prev) => {
          const next = { ...prev }
          delete next[caseId]
          return next
        })
        setCommentsByCaseId((prev) => {
          const next = { ...prev }
          delete next[caseId]
          return next
        })
        return
      }

      const nextStatus = deriveWorkflowStatus(payload.new.workflow_status, payload.new.status)
      if (nextStatus) {
        setStatusByCaseId((prev) => ({ ...prev, [caseId]: nextStatus }))
      }

      setCases((prev) =>
        prev.map((item) =>
          item.id === caseId
            ? {
                ...item,
                status: payload.new.status ?? item.status,
                workflow_status: payload.new.workflow_status ?? item.workflow_status,
              }
            : item,
        ),
      )
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
    setActionLoadingId(caseId)
    try {
      await updateCaseWorkflowStatus(caseId, status)
      setStatusByCaseId((prev) => ({ ...prev, [caseId]: status }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el estado del caso.')
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleDeleteCase = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      await softDeleteCase(deleteTarget.id)
      setCases((prev) => prev.filter((item) => item.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar el caso.')
    } finally {
      setDeleteLoading(false)
    }
  }

  const submitComment = async () => {
    if (!commentTarget || !commentDraft.trim() || !user?.id) return
    setCommentLoading(true)
    try {
      const text = commentDraft.trim()
      const created = await createCaseComment(commentTarget.id, user.id, text)
      setCommentsByCaseId((prev) => ({
        ...prev,
        [commentTarget.id]: [...(prev[commentTarget.id] ?? []), { id: created.id, text, authorId: user.id, createdAt: new Date().toISOString() }],
      }))
      setCommentDraft('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el comentario.')
    } finally {
      setCommentLoading(false)
    }
  }

  const handleDeleteComment = async (caseId: string, commentId: string) => {
    setCommentLoading(true)
    try {
      await deleteCaseComment(commentId)
      setCommentsByCaseId((prev) => ({
        ...prev,
        [caseId]: (prev[caseId] ?? []).filter((comment) => comment.id !== commentId),
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar el comentario.')
    } finally {
      setCommentLoading(false)
    }
  }

  const handleEditComment = async (caseId: string, commentId: string, newText: string) => {
    setCommentLoading(true)
    try {
      await updateCaseComment(commentId, newText)
      setCommentsByCaseId((prev) => ({
        ...prev,
        [caseId]: (prev[caseId] ?? []).map((comment) =>
          comment.id === commentId ? { ...comment, text: newText } : comment,
        ),
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el comentario.')
    } finally {
      setCommentLoading(false)
    }
  }

  return (
    <div className="flex h-screen bg-[#0a0c10] overflow-hidden font-['Syne',sans-serif]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');
        .case-row { transition: background 0.15s ease; }
        .case-row:hover { background: rgba(251,191,36,0.03); }
        .action-btn { transition: all 0.15s ease; }
        .status-pill { transition: all 0.12s ease; }
        .status-pill:hover { transform: translateY(-1px); }
        .modal-overlay { animation: fadeIn 0.15s ease; }
        .modal-card { animation: slideUp 0.2s ease; }
        @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes slideUp { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1e2535; border-radius: 4px; }
        .input-dark { background: #0f1117; border: 1px solid #1e2535; color: #e2e8f0; border-radius: 10px; padding: 10px 16px; width: 100%; outline: none; font-size: 13px; transition: border-color 0.15s; }
        .input-dark:focus { border-color: #fbbf24; }
        .input-dark::placeholder { color: #4a5568; }
        .textarea-dark { background: #0f1117; border: 1px solid #1e2535; color: #e2e8f0; border-radius: 10px; padding: 12px 16px; width: 100%; outline: none; font-size: 13px; transition: border-color 0.15s; resize: none; font-family: inherit; }
        .textarea-dark:focus { border-color: #fbbf24; }
        .textarea-dark::placeholder { color: #4a5568; }
      `}</style>

      <AuthoritySidebar />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 py-8 space-y-5">

          {/* Header */}
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[11px] font-mono text-amber-400/70 tracking-[0.2em] uppercase mb-1">Sistema de Gestión</p>
              <h1 className="text-3xl font-bold text-slate-100 tracking-tight">Registro de Casos</h1>
              <p className="text-sm text-slate-500 mt-1">Gestión y seguimiento de todos los casos registrados en el sistema.</p>
            </div>
            <button
              type="button"
              onClick={loadCases}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#12151f] border border-[#1e2535] text-slate-400 hover:text-slate-200 hover:border-slate-600 text-xs font-medium transition-all duration-150"
            >
              <RefreshCw size={13} />
              Actualizar
            </button>
          </div>

          {/* Filters */}
          <div className="bg-[#0d1018] border border-[#1a1f2e] rounded-2xl p-5 space-y-4">
            <div className="flex gap-3 items-center">
              <div className="relative flex-1 max-w-sm">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por nombre..."
                  className="input-dark pl-9"
                />
              </div>
              <div className="flex items-center gap-1.5 text-slate-500">
                <Filter size={13} />
                <span className="text-xs font-mono">Filtrar por estado:</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(STATUS_CONFIG).map(([value, cfg]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setStatusFilter(value as StatusFilter)}
                  className={`status-pill inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    statusFilter === value
                      ? 'bg-amber-400/10 text-amber-300 border-amber-400/30'
                      : 'bg-[#0f1117] text-slate-500 border-[#1e2535] hover:border-slate-600 hover:text-slate-300'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm">
              <XCircle size={16} />
              {error}
            </div>
          )}

          {/* Table */}
          <div className="bg-[#0d1018] border border-[#1a1f2e] rounded-2xl overflow-hidden">
            {loading ? (
              <div className="p-16 flex flex-col items-center justify-center gap-3">
                <div className="w-6 h-6 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
                <p className="text-xs text-slate-600 font-mono">Cargando casos...</p>
              </div>
            ) : filteredCases.length === 0 ? (
              <div className="p-16 flex flex-col items-center justify-center gap-2">
                <p className="text-slate-500 text-sm">No se encontraron casos.</p>
                <p className="text-slate-700 text-xs">Intenta cambiar los filtros de búsqueda.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px]">
                  <thead>
                    <tr className="border-b border-[#1a1f2e]">
                      {['Nº Caso', 'Persona', 'Zona', 'Fecha', 'Estado', 'Acciones'].map((h) => (
                        <th key={h} className="px-5 py-3.5 text-left text-[10px] font-mono font-medium text-slate-600 uppercase tracking-[0.15em]">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCases.map((item, idx) => {
                      const workflowStatus = statusByCaseId[item.id] ?? 'pending'
                      const commentsCount = commentsByCaseId[item.id]?.length ?? 0
                      const isActionLoading = actionLoadingId === item.id
                      return (
                        <tr
                          key={item.id}
                          className={`case-row border-b border-[#13161e] last:border-b-0 ${idx % 2 === 0 ? '' : 'bg-white/[0.01]'}`}
                        >
                          <td className="px-5 py-4">
                            <span className="font-mono text-xs text-amber-400/80 font-medium">{item.numero_caso}</span>
                          </td>
                          <td className="px-5 py-4">
                            <button
                              type="button"
                              onClick={() => navigate(`/authority/cases/pending?caseId=${item.id}`)}
                              className="text-left text-sm font-semibold text-slate-200 hover:text-amber-300 transition-colors"
                            >
                              {item.nombres} {item.apellidos}
                            </button>
                          </td>
                          <td className="px-5 py-4">
                            <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                              <MapPin size={11} className="text-slate-600" />
                              {getLocation(item)}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                              <Calendar size={11} className="text-slate-600" />
                              {getDateLabel(item)}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <InlineStatusBadge status={workflowStatus} />
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => void applyStatus(item.id, 'approved')}
                                disabled={isActionLoading}
                                className="action-btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-emerald-400 bg-emerald-400/8 border border-emerald-400/15 hover:bg-emerald-400/15 hover:border-emerald-400/30 disabled:opacity-40 transition-all"
                              >
                                <CheckCircle2 size={11} />
                                Aprobar
                              </button>
                              <button
                                type="button"
                                onClick={() => void applyStatus(item.id, 'rejected')}
                                disabled={isActionLoading}
                                className="action-btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-amber-400 bg-amber-400/8 border border-amber-400/15 hover:bg-amber-400/15 hover:border-amber-400/30 disabled:opacity-40 transition-all"
                              >
                                <XCircle size={11} />
                                Rechazar
                              </button>
                              <button
                                type="button"
                                onClick={() => { setCommentTarget(item); setCommentDraft('') }}
                                className="action-btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-sky-400 bg-sky-400/8 border border-sky-400/15 hover:bg-sky-400/15 hover:border-sky-400/30 transition-all"
                              >
                                <MessageSquare size={11} />
                                {commentsCount > 0 ? `Notas (${commentsCount})` : 'Anotar'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteTarget(item)}
                                className="action-btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-rose-400 bg-rose-400/8 border border-rose-400/15 hover:bg-rose-400/15 hover:border-rose-400/30 transition-all"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Footer */}
            {!loading && filteredCases.length > 0 && (
              <div className="px-5 py-3 border-t border-[#1a1f2e] flex items-center justify-between">
                <p className="text-xs font-mono text-slate-600">
                  {filteredCases.length} caso{filteredCases.length !== 1 ? 's' : ''} mostrado{filteredCases.length !== 1 ? 's' : ''}
                </p>
                <p className="text-xs font-mono text-slate-700">{cases.length} en total</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Delete Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay">
          <button type="button" className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
          <div className="relative modal-card bg-[#0d1018] border border-[#1a1f2e] rounded-2xl p-7 w-full max-w-md shadow-2xl">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-5">
              <Trash2 size={20} className="text-rose-400" />
            </div>
            <h2 className="text-lg font-bold text-slate-100 mb-1">Confirmar eliminación</h2>
            <p className="text-sm text-slate-500 mb-6">
              Estás por eliminar el caso{' '}
              <span className="font-mono text-amber-400">{deleteTarget.numero_caso}</span>.
              Esta acción no se puede deshacer.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-[#0f1117] border border-[#1e2535] text-slate-400 hover:text-slate-200 text-sm font-medium transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteCase()}
                disabled={deleteLoading}
                className="flex-1 px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold disabled:opacity-50 transition-all"
              >
                {deleteLoading ? 'Eliminando...' : 'Eliminar caso'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comment Modal */}
      {commentTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay">
          <button type="button" className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setCommentTarget(null)} />
          <div className="relative modal-card bg-[#0d1018] border border-[#1a1f2e] rounded-2xl p-7 w-full max-w-2xl shadow-2xl">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-sky-400/10 border border-sky-400/20 flex items-center justify-center">
                <MessageSquare size={16} className="text-sky-400" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-100">Notas del caso</h2>
                <p className="text-xs font-mono text-amber-400/70">{commentTarget.numero_caso}</p>
              </div>
            </div>

            <div className="rounded-xl border border-[#1a1f2e] bg-[#090b0f] p-4 space-y-2.5 max-h-52 overflow-y-auto mb-4">
              {(commentsByCaseId[commentTarget.id] ?? []).length === 0 ? (
                <p className="text-xs text-slate-600 font-mono text-center py-3">Sin notas registradas para este caso.</p>
              ) : (
                (commentsByCaseId[commentTarget.id] ?? []).map((comment) => (
                  <div key={comment.id} className="space-y-2">
                    <CommentItem
                      comment={comment}
                      currentUserId={user?.id ?? ''}
                      onDelete={() => void handleDeleteComment(commentTarget.id, comment.id)}
                      onEdit={(newText) => void handleEditComment(commentTarget.id, comment.id, newText)}
                      disabled={commentLoading}
                    />
                    <p className="px-1 text-[11px] font-mono text-slate-700">
                      {new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(comment.createdAt))}
                    </p>
                  </div>
                ))
              )}
            </div>

            <textarea
              value={commentDraft}
              onChange={(e) => setCommentDraft(e.target.value)}
              rows={4}
              className="textarea-dark mb-4"
              placeholder="Escribe una observación para este caso..."
            />

            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setCommentTarget(null)} className="flex-1 px-4 py-2.5 rounded-xl bg-[#0f1117] border border-[#1e2535] text-slate-400 hover:text-slate-200 text-sm font-medium transition-all">
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void submitComment()}
                disabled={!commentDraft.trim() || commentLoading}
                className="flex-1 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#0a0c10] text-sm font-bold disabled:opacity-40 transition-all"
              >
                {commentLoading ? 'Guardando...' : 'Guardar nota'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
