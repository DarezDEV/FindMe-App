import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../auth/hooks'
import { AuthoritySidebar } from '../components/AuthoritySidebar'
import { CaseDetailPanel } from '../components/moderation/CaseDetailPanel'
import { CommentItem } from '../components/moderation/CommentItem'
import { CommentModal } from '../components/moderation/CommentModal'
import { ModerationActions } from '../components/moderation/ModerationActions'
import { PendingList } from '../components/moderation/PendingList'
import type { PendingCaseItem } from '../components/moderation/types'
import {
  createCaseComment,
  deleteCaseComment,
  getCaseComments,
  getCasePhotoUrlFromStorage,
  getPendingModerationCases,
  getProfilesBasicByIds,
  softDeleteCase,
  updateCaseComment,
  updateCaseWorkflowStatus,
} from '../../../lib/supabase/db'

// ─── Types ────────────────────────────────────────────────────────────────────

type CaseComment = {
  id: string
  text: string
  authorId: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateIso: string) {
  const parsed = new Date(dateIso)
  if (Number.isNaN(parsed.getTime())) return 'Sin fecha'
  return new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).format(parsed)
}

function formatLocation(city: string | null, state: string | null, fallback: string | null) {
  return city || state || fallback || 'Sin ubicación'
}

function formatCreatedBy(userId: string | null | undefined, name?: string | null, lastName?: string | null) {
  const fullName = `${name ?? ''} ${lastName ?? ''}`.trim()
  if (fullName) return fullName
  if (!userId) return 'Usuario desconocido'
  return `Usuario ${userId.slice(0, 8)}`
}

function formatCaseStatus(status: string | null | undefined) {
  switch (status) {
    case 'activo': return 'Activo'
    case 'en_proceso': return 'En proceso'
    case 'resuelto': return 'Resuelto'
    case 'cerrado': return 'Cerrado'
    default: return 'Sin estado'
  }
}

function formatWorkflowStatus(status: string | null | undefined) {
  switch (status) {
    case 'pending': return 'Pendiente'
    case 'approved': return 'Aprobado'
    case 'rejected': return 'Rechazado'
    case 'found': return 'Encontrado'
    case 'closed': return 'Cerrado'
    default: return 'Pendiente'
  }
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PendingCasesPage() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const requestedCaseId = searchParams.get('caseId')

  const [pendingCases, setPendingCases] = useState<PendingCaseItem[]>([])
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [feedbackType, setFeedbackType] = useState<'success' | 'warning' | 'info' | 'error'>('success')
  const [commentModalOpen, setCommentModalOpen] = useState(false)
  const [commentsByCaseId, setCommentsByCaseId] = useState<Record<string, CaseComment[]>>({})
  const [photoUrlByCaseId, setPhotoUrlByCaseId] = useState<Record<string, string | null>>({})
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  const loadPendingCases = useCallback(async () => {
    setLoading(true)
    setFeedback(null)

    try {
      const data = await getPendingModerationCases(200)
      const userIds = data.map((item) => item.publicado_por).filter((value): value is string => Boolean(value))
      let profileMap: Record<string, { name: string | null; lastName: string | null; email: string | null }> = {}

      try {
        const profiles = await getProfilesBasicByIds(userIds)
        profileMap = profiles.reduce<Record<string, { name: string | null; lastName: string | null; email: string | null }>>((acc, profile) => {
          acc[profile.id] = { name: profile.name, lastName: profile.last_name, email: profile.email }
          return acc
        }, {})
      } catch {
        profileMap = {}
      }

      const mapped: PendingCaseItem[] = data.map((item) => {
        const profile = item.publicado_por ? profileMap[item.publicado_por] : undefined
        return {
          id: item.id,
          caseNumber: item.numero_caso,
          name: `${item.nombres} ${item.apellidos}`.trim(),
          age: item.edad ?? 0,
          gender: item.genero ?? null,
          location: formatLocation(item.ciudad, item.estado_provincia, item.lugar_ultima_vez),
          lastSeenPlace: item.lugar_ultima_vez || 'Sin dato',
          description: item.descripcion_general || 'Sin descripción registrada.',
          createdBy: formatCreatedBy(item.publicado_por, profile?.name, profile?.lastName),
          createdAt: formatDate(item.created_at),
          missingDate: item.fecha_desaparicion ? formatDate(item.fecha_desaparicion) : 'Sin fecha',
          birthDate: item.fecha_nacimiento ? formatDate(item.fecha_nacimiento) : null,
          missingDateIso: item.fecha_desaparicion || item.created_at,
          contactPhone: item.telefono_contacto ?? null,
          contactEmail: item.email_contacto || profile?.email || null,
          caseStatusLabel: formatCaseStatus(item.status),
          workflowStatusLabel: formatWorkflowStatus(item.workflow_status),
          status: 'pending',
        }
      })

      const comments = await getCaseComments(mapped.map((c) => c.id))
      const commentMap: Record<string, CaseComment[]> = {}
      comments.forEach((entry) => {
        if (!commentMap[entry.caso_id]) commentMap[entry.caso_id] = []
        commentMap[entry.caso_id].push({ id: entry.id, text: entry.comentario, authorId: entry.autor_id })
      })

      setPendingCases(mapped)
      setCommentsByCaseId(commentMap)

      if (requestedCaseId && mapped.some((item) => item.id === requestedCaseId)) {
        setSelectedCaseId(requestedCaseId)
      } else {
        setSelectedCaseId(mapped[0]?.id ?? null)
      }

      if (requestedCaseId && !mapped.some((item) => item.id === requestedCaseId)) {
        setFeedbackType('warning')
        setFeedback('El caso seleccionado desde "Casos" ya no está pendiente de revisión.')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudieron cargar los casos pendientes.'
      setFeedbackType('error')
      setFeedback(message)
      setPendingCases([])
      setSelectedCaseId(null)
    } finally {
      setLoading(false)
    }
  }, [requestedCaseId])

  useEffect(() => { void loadPendingCases() }, [loadPendingCases])

  useEffect(() => {
    if (!selectedCaseId) return
    if (selectedCaseId in photoUrlByCaseId) return
    let cancelled = false
    const loadPhoto = async () => {
      try {
        const url = await getCasePhotoUrlFromStorage(selectedCaseId)
        if (cancelled) return
        setPhotoUrlByCaseId((prev) => ({ ...prev, [selectedCaseId]: url }))
      } catch {
        if (cancelled) return
        setPhotoUrlByCaseId((prev) => ({ ...prev, [selectedCaseId]: null }))
      }
    }
    void loadPhoto()
    return () => { cancelled = true }
  }, [selectedCaseId, photoUrlByCaseId])

  const selectedCase = useMemo(
    () => pendingCases.find((item) => item.id === selectedCaseId) ?? null,
    [pendingCases, selectedCaseId],
  )

  const selectedCaseWithPhoto = useMemo(() => {
    if (!selectedCase) return null
    return { ...selectedCase, photoUrl: photoUrlByCaseId[selectedCase.id] ?? undefined }
  }, [photoUrlByCaseId, selectedCase])

  const removeFromPending = (caseId: string) => {
    setPendingCases((prev) => {
      const next = prev.filter((item) => item.id !== caseId)
      setSelectedCaseId(next[0]?.id ?? null)
      return next
    })
  }

  const approveCase = async () => {
    if (!selectedCase) return
    setActionLoading(true)
    try {
      await updateCaseWorkflowStatus(selectedCase.id, 'approved')
      removeFromPending(selectedCase.id)
      setFeedbackType('success')
      setFeedback(`Caso de ${selectedCase.name} aprobado exitosamente.`)
    } catch (err) {
      setFeedbackType('error')
      setFeedback(err instanceof Error ? err.message : 'No se pudo aprobar el caso.')
    } finally {
      setActionLoading(false)
    }
  }

  const rejectCase = async () => {
    if (!selectedCase) return
    setActionLoading(true)
    try {
      await updateCaseWorkflowStatus(selectedCase.id, 'rejected')
      removeFromPending(selectedCase.id)
      setFeedbackType('warning')
      setFeedback(`Caso de ${selectedCase.name} rechazado.`)
    } catch (err) {
      setFeedbackType('error')
      setFeedback(err instanceof Error ? err.message : 'No se pudo rechazar el caso.')
    } finally {
      setActionLoading(false)
    }
  }

  const markAsFalse = async () => {
    if (!selectedCase) return
    setActionLoading(true)
    try {
      await softDeleteCase(selectedCase.id)
      removeFromPending(selectedCase.id)
      setFeedbackType('error')
      setFeedback(`Caso de ${selectedCase.name} marcado como falso y eliminado.`)
    } catch (err) {
      setFeedbackType('error')
      setFeedback(err instanceof Error ? err.message : 'No se pudo marcar como falso.')
    } finally {
      setActionLoading(false)
    }
  }

  const saveComment = async (comment: string) => {
    if (!selectedCase || !comment || !user?.id) return
    setActionLoading(true)
    try {
      const created = await createCaseComment(selectedCase.id, user.id, comment)
      setCommentsByCaseId((prev) => ({
        ...prev,
        [selectedCase.id]: [...(prev[selectedCase.id] ?? []), { id: created.id, text: comment, authorId: user.id }],
      }))
      setCommentModalOpen(false)
      setFeedbackType('info')
      setFeedback('Nota agregada correctamente.')
    } catch (err) {
      setFeedbackType('error')
      setFeedback(err instanceof Error ? err.message : 'No se pudo guardar la nota.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!selectedCase) return
    setActionLoading(true)
    try {
      await deleteCaseComment(commentId)
      setCommentsByCaseId((prev) => ({
        ...prev,
        [selectedCase.id]: (prev[selectedCase.id] ?? []).filter((c) => c.id !== commentId),
      }))
      setFeedbackType('info')
      setFeedback('Nota eliminada.')
    } catch (err) {
      setFeedbackType('error')
      setFeedback(err instanceof Error ? err.message : 'No se pudo eliminar la nota.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleEditComment = async (commentId: string, newText: string) => {
    if (!selectedCase) return
    setActionLoading(true)
    try {
      await updateCaseComment(commentId, newText)
      setCommentsByCaseId((prev) => ({
        ...prev,
        [selectedCase.id]: (prev[selectedCase.id] ?? []).map((c) => c.id === commentId ? { ...c, text: newText } : c),
      }))
      setFeedbackType('info')
      setFeedback('Nota actualizada.')
    } catch (err) {
      setFeedbackType('error')
      setFeedback(err instanceof Error ? err.message : 'No se pudo editar la nota.')
    } finally {
      setActionLoading(false)
    }
  }

  const selectedCaseComments = selectedCase ? (commentsByCaseId[selectedCase.id] ?? []) : []

  const feedbackStyles: Record<string, string> = {
    success: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    warning: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    error:   'bg-rose-500/10 border-rose-500/20 text-rose-400',
    info:    'bg-sky-500/10 border-sky-500/20 text-sky-400',
  }

  return (
    <div className="flex h-screen bg-[#0a0c10] overflow-hidden font-['Syne',sans-serif]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1e2535; border-radius: 4px; }
        .fade-in { animation: fadeIn 0.2s ease; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <AuthoritySidebar />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[1400px] mx-auto px-6 py-8 space-y-5">

          {/* Header */}
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[11px] font-mono text-amber-400/70 tracking-[0.2em] uppercase mb-1">Módulo de Moderación</p>
              <h1 className="text-3xl font-bold text-slate-100 tracking-tight">Revisión de Publicaciones</h1>
              <p className="text-sm text-slate-500 mt-1">
                Flujo de moderación para casos pendientes antes de su publicación pública.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {!loading && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-400/8 border border-amber-400/20">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <span className="text-xs font-mono text-amber-400">{pendingCases.length} pendiente{pendingCases.length !== 1 ? 's' : ''}</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => void loadPendingCases()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#12151f] border border-[#1e2535] text-slate-400 hover:text-slate-200 hover:border-slate-600 text-xs font-medium transition-all"
              >
                Recargar
              </button>
            </div>
          </div>

          {/* Feedback */}
          {feedback && (
            <div className={`fade-in flex items-center gap-3 px-4 py-3 rounded-xl border text-sm ${feedbackStyles[feedbackType]}`}>
              <div className="w-1.5 h-1.5 rounded-full bg-current" />
              {feedback}
            </div>
          )}

          {/* Content */}
          {loading ? (
            <div className="bg-[#0d1018] border border-[#1a1f2e] rounded-2xl p-16 flex flex-col items-center justify-center gap-3">
              <div className="w-6 h-6 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
              <p className="text-xs text-slate-600 font-mono">Cargando casos pendientes...</p>
            </div>
          ) : pendingCases.length === 0 ? (
            <div className="bg-[#0d1018] border border-[#1a1f2e] rounded-2xl p-16 flex flex-col items-center justify-center gap-2">
              <div className="w-14 h-14 rounded-2xl bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center mb-2">
                <span className="text-2xl">✓</span>
              </div>
              <p className="text-slate-300 text-sm font-semibold">Sin casos pendientes</p>
              <p className="text-slate-600 text-xs text-center max-w-xs">
                Todos los casos han sido revisados. El sistema está al día.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-5">

              {/* Pending List */}
              <div className="bg-[#0d1018] border border-[#1a1f2e] rounded-2xl overflow-hidden flex flex-col" style={{ maxHeight: 'calc(100vh - 180px)' }}>
                <div className="px-5 py-4 border-b border-[#1a1f2e] flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-200">Cola de revisión</h2>
                    <p className="text-xs font-mono text-slate-600 mt-0.5">{pendingCases.length} casos en espera</p>
                  </div>
                </div>
                <div className="overflow-y-auto flex-1">
                  <PendingList
                    cases={pendingCases}
                    selectedCaseId={selectedCaseId}
                    onSelectCase={setSelectedCaseId}
                  />
                </div>
              </div>

              {/* Detail + Actions */}
              <div className="space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 180px)' }}>

                {/* Case Detail */}
                <div className="bg-[#0d1018] border border-[#1a1f2e] rounded-2xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-[#1a1f2e]">
                    <h2 className="text-sm font-semibold text-slate-200">Detalle del caso</h2>
                    {selectedCase && (
                      <p className="text-xs font-mono text-amber-400/70 mt-0.5">{selectedCase.caseNumber}</p>
                    )}
                  </div>
                  <div className="p-5">
                    <CaseDetailPanel selectedCase={selectedCaseWithPhoto} />
                  </div>
                </div>

                {/* Comments */}
                {selectedCase && (
                  <div className="bg-[#0d1018] border border-[#1a1f2e] rounded-2xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-[#1a1f2e] flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-200">Notas de revisión</h3>
                        <p className="text-xs font-mono text-slate-600 mt-0.5">{selectedCaseComments.length} nota{selectedCaseComments.length !== 1 ? 's' : ''}</p>
                      </div>
                      {selectedCaseComments.length > 0 && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-medium text-sky-400 bg-sky-400/10 border border-sky-400/20">
                          {selectedCaseComments.length}
                        </span>
                      )}
                    </div>
                    <div className="p-5">
                      {selectedCaseComments.length === 0 ? (
                        <p className="text-xs text-slate-600 font-mono">Aún no hay notas registradas para este caso.</p>
                      ) : (
                        <div className="space-y-3">
                          {selectedCaseComments.map((comment) => (
                            <CommentItem
                              key={comment.id}
                              comment={comment}
                              currentUserId={user?.id ?? ''}
                              onDelete={() => void handleDeleteComment(comment.id)}
                              onEdit={(newText) => void handleEditComment(comment.id, newText)}
                              disabled={actionLoading}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Moderation Actions */}
                <div className="bg-[#0d1018] border border-[#1a1f2e] rounded-2xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-[#1a1f2e]">
                    <h3 className="text-sm font-semibold text-slate-200">Acciones de moderación</h3>
                    <p className="text-xs text-slate-600 mt-0.5">Revisa y decide el estado de este caso.</p>
                  </div>
                  <div className="p-5">
                    <ModerationActions
                      disabled={!selectedCase || actionLoading}
                      commentsCount={selectedCaseComments.length}
                      onApprove={() => void approveCase()}
                      onReject={() => void rejectCase()}
                      onAddComment={() => setCommentModalOpen(true)}
                      onMarkFalse={() => void markAsFalse()}
                    />
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>
      </main>

      <CommentModal
        open={commentModalOpen}
        caseName={selectedCase?.name ?? ''}
        onClose={() => setCommentModalOpen(false)}
        onSave={(comment) => void saveComment(comment)}
      />
    </div>
  )
}
