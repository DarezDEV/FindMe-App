import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, MapPin, Calendar, RefreshCw, MessageSquare } from 'lucide-react'
import { AuthoritySidebar } from '../components/AuthoritySidebar'
import {
  createCaseComment,
  getAuthorityCases,
  getCaseComments,
  softDeleteCase,
  updateCaseWorkflowStatus,
  type AuthorityCaseRow,
} from '../../../lib/supabase/db'
import { useAuth } from '../../auth/hooks'
import { Alert, Spinner, StatusBadge, type WorkflowStatus } from '../../../shared/components/ui'

type StatusFilter = 'all' | WorkflowStatus

function getLocation(caso: AuthorityCaseRow): string {
  return caso.ciudad || caso.estado_provincia || caso.lugar_ultima_vez || 'Sin ubicacion'
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
  const [commentsByCaseId, setCommentsByCaseId] = useState<Record<string, string[]>>({})
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [commentLoading, setCommentLoading] = useState(false)

  const loadCases = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getAuthorityCases({ limit: 200 })
      const statusMap: Record<string, WorkflowStatus> = {}
      data.forEach((row) => {
        statusMap[row.id] = getPersistedStatus(row)
      })
      const comments = await getCaseComments(data.map((item) => item.id))
      const commentsMap: Record<string, string[]> = {}
      comments.forEach((comment) => {
        if (!commentsMap[comment.caso_id]) commentsMap[comment.caso_id] = []
        commentsMap[comment.caso_id].push(comment.comentario)
      })
      setCases(data)
      setStatusByCaseId(statusMap)
      setCommentsByCaseId(commentsMap)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudieron cargar los casos.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadCases()
  }, [loadCases])

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
      await createCaseComment(commentTarget.id, user.id, commentDraft.trim())
      setCommentsByCaseId((prev) => ({
        ...prev,
        [commentTarget.id]: [...(prev[commentTarget.id] ?? []), commentDraft.trim()],
      }))
      setCommentDraft('')
      setCommentTarget(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el comentario.')
    } finally {
      setCommentLoading(false)
    }
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AuthoritySidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-4">
          <div className="card p-6">
            <h1 className="text-2xl font-bold text-text-primary">Casos</h1>
            <p className="text-sm text-text-secondary mt-1">Gestion y seguimiento de casos registrados.</p>
          </div>

          <div className="card p-4 md:p-5 space-y-4">
            <label className="relative block">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre"
                className="input-field pl-9"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'all', label: 'Todos' },
                { value: 'pending', label: 'Pendiente' },
                { value: 'approved', label: 'Publicada' },
                { value: 'rejected', label: 'Rechazado' },
                { value: 'found', label: 'Reunificada' },
                { value: 'closed', label: 'Archivada' },
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setStatusFilter(item.value as StatusFilter)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                    statusFilter === item.value ? 'bg-primary-soft text-primary border-primary/20' : 'bg-card border-border'
                  }`}
                >
                  {item.label}
                </button>
              ))}
              <button type="button" onClick={loadCases} className="ml-auto btn-secondary inline-flex items-center gap-2">
                <RefreshCw size={14} />
                Recargar
              </button>
            </div>
          </div>

          {error && <Alert type="error" message={error} />}

          <div className="card overflow-hidden">
            {loading ? (
              <div className="p-10 flex items-center justify-center">
                <Spinner size="lg" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px]">
                  <thead className="bg-primary-soft/40 border-b border-border">
                    <tr className="text-left text-xs uppercase tracking-wide text-text-secondary">
                      <th className="px-4 py-3 font-semibold">Caso</th>
                      <th className="px-4 py-3 font-semibold">Persona</th>
                      <th className="px-4 py-3 font-semibold">Zona</th>
                      <th className="px-4 py-3 font-semibold">Fecha</th>
                      <th className="px-4 py-3 font-semibold">Estado</th>
                      <th className="px-4 py-3 font-semibold">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCases.map((item) => {
                      const workflowStatus = statusByCaseId[item.id] ?? 'pending'
                      const commentsCount = commentsByCaseId[item.id]?.length ?? 0
                      const isActionLoading = actionLoadingId === item.id
                      return (
                        <tr key={item.id} className="border-b border-border/80 last:border-b-0 hover:bg-primary-soft/30">
                          <td className="px-4 py-3 text-sm font-semibold text-text-primary">{item.numero_caso}</td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => navigate(`/authority/cases/pending?caseId=${item.id}`)}
                              className="text-left text-sm font-medium text-text-primary hover:text-primary"
                            >
                              {item.nombres} {item.apellidos}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-sm text-text-secondary inline-flex items-center gap-1.5">
                            <MapPin size={12} />
                            {getLocation(item)}
                          </td>
                          <td className="px-4 py-3 text-sm text-text-secondary inline-flex items-center gap-1.5">
                            <Calendar size={12} />
                            {getDateLabel(item)}
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={workflowStatus} />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => void applyStatus(item.id, 'approved')}
                                className="px-2.5 py-1 rounded-md text-xs font-medium bg-success/10 text-success"
                                disabled={isActionLoading || workflowStatus === 'approved'}
                              >
                                Publicar
                              </button>
                              <button
                                type="button"
                                onClick={() => void applyStatus(item.id, 'found')}
                                className="px-2.5 py-1 rounded-md text-xs font-medium bg-info/10 text-info"
                                disabled={isActionLoading || workflowStatus === 'found'}
                              >
                                Reunificar
                              </button>
                              <button
                                type="button"
                                onClick={() => void applyStatus(item.id, 'closed')}
                                className="px-2.5 py-1 rounded-md text-xs font-medium bg-text-secondary/10 text-text-secondary"
                                disabled={isActionLoading || workflowStatus === 'closed'}
                              >
                                Archivar
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setCommentTarget(item)
                                  setCommentDraft('')
                                }}
                                className="px-2.5 py-1 rounded-md text-xs font-medium bg-primary-soft text-primary inline-flex items-center gap-1"
                              >
                                <MessageSquare size={12} />
                                Comentar {commentsCount > 0 ? `(${commentsCount})` : ''}
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteTarget(item)}
                                className="px-2.5 py-1 rounded-md text-xs font-medium bg-error/10 text-error"
                              >
                                Eliminar
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
          </div>
        </div>
      </main>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button type="button" className="absolute inset-0 bg-black/30" onClick={() => setDeleteTarget(null)} />
          <div className="relative card p-6 w-full max-w-md space-y-4">
            <h2 className="text-lg font-semibold text-text-primary">Confirmar eliminacion</h2>
            <p className="text-sm text-text-secondary">
              Se eliminara el caso <span className="font-semibold">{deleteTarget.numero_caso}</span>.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setDeleteTarget(null)}>
                Cancelar
              </button>
              <button type="button" className="btn-primary bg-error hover:bg-error/90" onClick={() => void handleDeleteCase()} disabled={deleteLoading}>
                {deleteLoading ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {commentTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button type="button" className="absolute inset-0 bg-black/30" onClick={() => setCommentTarget(null)} />
          <div className="relative card p-6 w-full max-w-lg space-y-4">
            <h2 className="text-lg font-semibold text-text-primary">Agregar comentario</h2>
            <textarea
              value={commentDraft}
              onChange={(e) => setCommentDraft(e.target.value)}
              rows={5}
              className="input-field resize-none"
            />
            <div className="flex items-center justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setCommentTarget(null)}>
                Cancelar
              </button>
              <button type="button" className="btn-primary" onClick={() => void submitComment()} disabled={!commentDraft.trim() || commentLoading}>
                {commentLoading ? 'Guardando...' : 'Guardar comentario'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
