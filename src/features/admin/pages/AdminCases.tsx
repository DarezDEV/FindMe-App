import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronRight,
  FileText,
  MapPin,
  MessageSquare,
  RefreshCw,
  Search,
  Trash2,
  XCircle,
} from 'lucide-react'
import AdminSidebar from '../components/Adminsidebar'
import {
  createCaseComment,
  deleteCaseComment,
  getAuthorityCases,
  getCaseComments,
  normalizeAuthorityCaseRow,
  normalizeCaseCommentRow,
  softDeleteCase,
  updateCaseComment,
  updateCaseWorkflowStatus,
  type AuthorityCaseRow,
} from '../../../lib/supabase/db'
import { useRealtimeCaseComments } from '../../cases/hooks/useRealtimeCaseComments'
import { useRealtimeCases } from '../../cases/hooks/useRealtimeCases'
import { useAuth } from '../../auth/hooks'
import { appToast, type WorkflowStatus } from '../../../shared/components/ui'
import { CommentItem } from '../../authority/components/moderation/CommentItem'

type StatusFilter = 'all' | WorkflowStatus
type CaseCommentItem = { id: string; text: string; authorId: string; createdAt: string }

function getLocation(caso: AuthorityCaseRow): string {
  return caso.ciudad || caso.estado_provincia || caso.lugar_ultima_vez || 'Sin ubicación'
}
function getDateLabel(caso: AuthorityCaseRow): string {
  const parsed = new Date(caso.fecha_desaparicion || caso.created_at)
  if (Number.isNaN(parsed.getTime())) return 'Fecha no disponible'
  return new Intl.DateTimeFormat('es-DO', { day: '2-digit', month: 'short', year: 'numeric' }).format(parsed)
}
function getPersistedStatus(row: AuthorityCaseRow): WorkflowStatus {
  if (row.workflow_status) return row.workflow_status
  if (row.status === 'resuelto') return 'found'
  if (row.status === 'cerrado') return 'closed'
  return 'pending'
}
function getStatusSuccessMessage(status: WorkflowStatus) {
  const msgs: Record<WorkflowStatus, string> = {
    approved: 'Caso publicado correctamente.',
    found: 'Caso marcado como reunificado.',
    closed: 'Caso archivado correctamente.',
    rejected: 'Caso rechazado correctamente.',
    pending: 'Estado del caso actualizado.',
  }
  return msgs[status] ?? 'Estado actualizado.'
}
function deriveWorkflowStatus(ws: string | null | undefined, rs: string | null | undefined): WorkflowStatus | null {
  if (['pending','approved','rejected','found','closed'].includes(ws ?? '')) return ws as WorkflowStatus
  if (rs === 'resuelto') return 'found'
  if (rs === 'cerrado') return 'closed'
  return null
}

const STATUS_CONFIG: Record<string, { label: string; dot: string; activeCls: string }> = {
  all:      { label: 'Todos',      dot: 'bg-slate-400',   activeCls: 'bg-white text-slate-900 shadow-sm' },
  pending:  { label: 'Pendiente',  dot: 'bg-amber-400',   activeCls: 'bg-white text-slate-900 shadow-sm' },
  approved: { label: 'Aprobado',   dot: 'bg-emerald-500', activeCls: 'bg-white text-slate-900 shadow-sm' },
  rejected: { label: 'Rechazado',  dot: 'bg-rose-500',    activeCls: 'bg-white text-slate-900 shadow-sm' },
  found:    { label: 'Encontrado', dot: 'bg-sky-500',     activeCls: 'bg-white text-slate-900 shadow-sm' },
  closed:   { label: 'Cerrado',    dot: 'bg-slate-400',   activeCls: 'bg-white text-slate-900 shadow-sm' },
}

const BADGE_CLS: Record<string, string> = {
  pending:  'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-rose-50 text-rose-700 border-rose-200',
  found:    'bg-sky-50 text-sky-700 border-sky-200',
  closed:   'bg-slate-100 text-slate-600 border-slate-200',
}
const DOT_CLS: Record<string, string> = {
  pending: 'bg-amber-400', approved: 'bg-emerald-500', rejected: 'bg-rose-500',
  found: 'bg-sky-500', closed: 'bg-slate-400',
}

function StatusBadge({ status }: { status: string }) {
  const label = STATUS_CONFIG[status]?.label ?? 'Pendiente'
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${BADGE_CLS[status] ?? BADGE_CLS.pending}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${DOT_CLS[status] ?? DOT_CLS.pending}`} />
      {label}
    </span>
  )
}

export default function AdminCases() {
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
    setLoading(true); setError(null)
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
      setCases(data); setStatusByCaseId(statusMap); setCommentsByCaseId(commentsMap)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los casos.')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { void loadCases() }, [loadCases])

  useRealtimeCases({
    onEvent: (payload) => {
      const caseId = payload.new.id || payload.old.id
      if (!caseId) return

      if (payload.eventType === 'DELETE' || payload.new.eliminado === true) {
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

      const nextRow = normalizeAuthorityCaseRow(payload.new)
      if (!nextRow) return

      const nextStatus = deriveWorkflowStatus(nextRow.workflow_status, nextRow.status)
      if (nextStatus) setStatusByCaseId((prev) => ({ ...prev, [caseId]: nextStatus }))
      setCases((prev) =>
        [...prev.filter((item) => item.id !== caseId), nextRow].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        ),
      )
    },
  })

  useRealtimeCaseComments({
    onEvent: (payload) => {
      const caseId = payload.new.caso_id || payload.old.caso_id
      if (!caseId) return

      if (payload.eventType === 'DELETE') {
        setCommentsByCaseId((prev) => ({
          ...prev,
          [caseId]: (prev[caseId] ?? []).filter((item) => item.id !== payload.old.id),
        }))
        return
      }

      const normalized = normalizeCaseCommentRow({
        id: payload.new.id,
        caso_id: payload.new.caso_id,
        autor_id: payload.new.autor_id,
        comentario: payload.new.comentario,
        created_at: payload.new.created_at,
      })

      setCommentsByCaseId((prev) => ({
        ...prev,
        [caseId]: [...(prev[caseId] ?? []).filter((item) => item.id !== normalized.id), {
          id: normalized.id,
          text: normalized.comentario,
          authorId: normalized.autor_id,
          createdAt: normalized.created_at,
        }].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
      }))
    },
  })

  const filteredCases = useMemo(() => {
    const term = search.trim().toLowerCase()
    return cases.filter((item) => {
      const ws = statusByCaseId[item.id] ?? 'pending'
      const statusMatch = statusFilter === 'all' || ws === statusFilter
      const nameMatch = term.length === 0 || `${item.nombres} ${item.apellidos}`.toLowerCase().includes(term)
      return statusMatch && nameMatch
    })
  }, [cases, search, statusByCaseId, statusFilter])

  const applyStatus = async (caseId: string, status: WorkflowStatus) => {
    setError(null); setActionLoadingId(caseId)
    try {
      await updateCaseWorkflowStatus(caseId, status)
      setStatusByCaseId((prev) => ({ ...prev, [caseId]: status }))
      appToast.success(getStatusSuccessMessage(status))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el estado.')
    } finally { setActionLoadingId(null) }
  }

  const handleDeleteCase = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      await softDeleteCase(deleteTarget.id)
      setCases((prev) => prev.filter((item) => item.id !== deleteTarget.id))
      appToast.success(`Caso ${deleteTarget.numero_caso} eliminado.`)
      setDeleteTarget(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar el caso.')
    } finally { setDeleteLoading(false) }
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
      appToast.info('Nota guardada.')
      setCommentDraft('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la nota.')
    } finally { setCommentLoading(false) }
  }

  const handleDeleteComment = async (caseId: string, commentId: string) => {
    setCommentLoading(true)
    try {
      await deleteCaseComment(commentId)
      setCommentsByCaseId((prev) => ({ ...prev, [caseId]: (prev[caseId] ?? []).filter((c) => c.id !== commentId) }))
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo eliminar la nota.') }
    finally { setCommentLoading(false) }
  }

  const handleEditComment = async (caseId: string, commentId: string, newText: string) => {
    setCommentLoading(true)
    try {
      await updateCaseComment(commentId, newText)
      setCommentsByCaseId((prev) => ({ ...prev, [caseId]: (prev[caseId] ?? []).map((c) => c.id === commentId ? { ...c, text: newText } : c) }))
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo actualizar la nota.') }
    finally { setCommentLoading(false) }
  }

  return (
    <AdminSidebar>
      <div className="min-h-screen bg-slate-50">
        <style>{`
          @keyframes fadeIn  { from { opacity:0 } to { opacity:1 } }
          @keyframes slideUp { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:translateY(0) } }
          .modal-overlay { animation: fadeIn 0.15s ease; }
          .modal-card { animation: slideUp 0.2s cubic-bezier(0.16,1,0.3,1); }
          .case-row { transition: background 0.12s ease; }
          .case-row:hover { background: #f8fafc; }
          .action-btn { transition: all 0.12s ease; }
          ::-webkit-scrollbar { width: 4px; height: 4px; }
          ::-webkit-scrollbar-track { background: transparent; }
          ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
          input, textarea { outline: none; }
        `}</style>

        <main className="overflow-y-auto">
          <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">

            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold tracking-[0.25em] uppercase text-primary/60">FindMe</span>
                  <ChevronRight size={10} className="text-slate-300" />
                  <span className="text-[10px] font-bold tracking-[0.25em] uppercase text-slate-400">Casos</span>
                </div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Gestión de Casos</h1>
                <p className="text-sm text-slate-500 mt-0.5">Seguimiento y control de todos los casos registrados en el sistema.</p>
              </div>
              <button
                type="button"
                onClick={() => void loadCases()}
                className="action-btn inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 text-xs font-semibold shadow-sm"
              >
                <RefreshCw size={13} />
                Actualizar
              </button>
            </div>

            {/* Toolbar */}
            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="relative flex-1 max-w-xs">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar por nombre..."
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
                  />
                </div>
                <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 flex-wrap">
                  {Object.entries(STATUS_CONFIG).map(([value, cfg]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setStatusFilter(value as StatusFilter)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                        statusFilter === value ? cfg.activeCls : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                      {cfg.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm font-medium">
                <AlertCircle size={15} className="shrink-0" />
                {error}
              </div>
            )}

            {/* Table */}
            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
              {loading ? (
                <div className="p-16 flex flex-col items-center justify-center gap-3">
                  <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                  <p className="text-sm text-slate-500">Cargando casos...</p>
                </div>
              ) : filteredCases.length === 0 ? (
                <div className="p-16 flex flex-col items-center justify-center gap-2">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-1">
                    <FileText size={20} className="text-slate-400" />
                  </div>
                  <p className="text-sm font-semibold text-slate-600">Sin resultados</p>
                  <p className="text-xs text-slate-400">Intenta cambiar los filtros de búsqueda.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px]">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        {['Nº Caso', 'Persona', 'Zona', 'Fecha', 'Estado', 'Acciones'].map((h) => (
                          <th key={h} className="px-5 py-3.5 text-left text-[10px] font-bold tracking-widest uppercase text-slate-400">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredCases.map((item) => {
                        const ws = statusByCaseId[item.id] ?? 'pending'
                        const commentsCount = commentsByCaseId[item.id]?.length ?? 0
                        const isActionLoading = actionLoadingId === item.id
                        return (
                          <tr key={item.id} className="case-row">
                            <td className="px-5 py-4">
                              <span className="font-mono text-xs font-semibold text-primary">{item.numero_caso}</span>
                            </td>
                            <td className="px-5 py-4">
                              <button
                                type="button"
                                onClick={() => navigate(`/admin/revision?caseId=${item.id}`)}
                                className="text-left text-sm font-semibold text-slate-900 hover:text-primary transition-colors"
                              >
                                {item.nombres} {item.apellidos}
                              </button>
                            </td>
                            <td className="px-5 py-4">
                              <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                                <MapPin size={11} />{getLocation(item)}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                                <Calendar size={11} />{getDateLabel(item)}
                              </span>
                            </td>
                            <td className="px-5 py-4"><StatusBadge status={ws} /></td>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-1.5">
                                <button type="button" onClick={() => void applyStatus(item.id, 'approved')} disabled={isActionLoading}
                                  className="action-btn inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-40">
                                  <CheckCircle2 size={11} />Aprobar
                                </button>
                                <button type="button" onClick={() => void applyStatus(item.id, 'rejected')} disabled={isActionLoading}
                                  className="action-btn inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 disabled:opacity-40">
                                  <XCircle size={11} />Rechazar
                                </button>
                                <button type="button" onClick={() => { setCommentTarget(item); setCommentDraft('') }}
                                  className="action-btn inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-sky-700 bg-sky-50 border border-sky-200 hover:bg-sky-100">
                                  <MessageSquare size={11} />{commentsCount > 0 ? `Notas (${commentsCount})` : 'Anotar'}
                                </button>
                                <button type="button" onClick={() => setDeleteTarget(item)}
                                  className="action-btn inline-flex items-center px-2.5 py-1.5 rounded-lg text-[11px] text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100">
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
              {!loading && filteredCases.length > 0 && (
                <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                  <p className="text-xs text-slate-400 font-mono">{filteredCases.length} caso{filteredCases.length !== 1 ? 's' : ''} mostrado{filteredCases.length !== 1 ? 's' : ''}</p>
                  <p className="text-xs text-slate-400 font-mono">{cases.length} en total</p>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Delete Modal */}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay">
            <button type="button" className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
            <div className="relative modal-card bg-white border border-slate-200 rounded-2xl p-7 w-full max-w-md shadow-2xl">
              <div className="w-11 h-11 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center mb-5">
                <Trash2 size={18} className="text-rose-600" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 mb-1">Confirmar eliminación</h2>
              <p className="text-sm text-slate-600 mb-6">
                Estás por eliminar el caso <span className="font-mono font-semibold text-primary">{deleteTarget.numero_caso}</span>. Esta acción no se puede deshacer.
              </p>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setDeleteTarget(null)} className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold transition-all">Cancelar</button>
                <button type="button" onClick={() => void handleDeleteCase()} disabled={deleteLoading} className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold disabled:opacity-50 transition-all">
                  {deleteLoading ? 'Eliminando...' : 'Eliminar caso'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Comment Modal */}
        {commentTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay">
            <button type="button" className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setCommentTarget(null)} />
            <div className="relative modal-card bg-white border border-slate-200 rounded-2xl p-7 w-full max-w-2xl shadow-2xl">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center">
                  <MessageSquare size={16} className="text-sky-600" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Notas del caso</h2>
                  <p className="text-xs font-mono text-primary/70">{commentTarget.numero_caso}</p>
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2.5 max-h-52 overflow-y-auto mb-4">
                {(commentsByCaseId[commentTarget.id] ?? []).length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-3">Sin notas registradas para este caso.</p>
                ) : (
                  (commentsByCaseId[commentTarget.id] ?? []).map((comment) => (
                    <div key={comment.id} className="space-y-1.5">
                      <CommentItem
                        comment={comment}
                        currentUserId={user?.id ?? ''}
                        onDelete={() => void handleDeleteComment(commentTarget.id, comment.id)}
                        onEdit={(newText) => void handleEditComment(commentTarget.id, comment.id, newText)}
                        disabled={commentLoading}
                      />
                      <p className="pl-1 text-[11px] text-slate-400 font-mono">
                        {new Intl.DateTimeFormat('es-DO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(comment.createdAt))}
                      </p>
                    </div>
                  ))
                )}
              </div>
              <textarea
                value={commentDraft}
                onChange={(e) => setCommentDraft(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/10 resize-none transition-all mb-4"
                placeholder="Escribe una observación para este caso..."
              />
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setCommentTarget(null)} className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold transition-all">Cancelar</button>
                <button type="button" onClick={() => void submitComment()} disabled={!commentDraft.trim() || commentLoading} className="flex-1 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-sm font-bold disabled:opacity-40 transition-all">
                  {commentLoading ? 'Guardando...' : 'Guardar nota'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminSidebar>
  )
}
