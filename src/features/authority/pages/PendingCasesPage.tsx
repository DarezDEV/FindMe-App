import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Alert, Spinner } from '../../../shared/components/ui'
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
  return city || state || fallback || 'Sin ubicacion'
}

function formatCreatedBy(userId: string | null | undefined, name?: string | null, lastName?: string | null) {
  const fullName = `${name ?? ''} ${lastName ?? ''}`.trim()
  if (fullName) return fullName
  if (!userId) return 'Usuario desconocido'
  return `Usuario ${userId.slice(0, 8)}`
}

function formatCaseStatus(status: string | null | undefined) {
  switch (status) {
    case 'activo':
      return 'Activo'
    case 'en_proceso':
      return 'En proceso'
    case 'resuelto':
      return 'Resuelto'
    case 'cerrado':
      return 'Cerrado'
    default:
      return 'Sin estado'
  }
}

function formatWorkflowStatus(status: string | null | undefined) {
  switch (status) {
    case 'pending':
      return 'Pendiente'
    case 'approved':
      return 'Aprobado'
    case 'rejected':
      return 'Rechazado'
    case 'found':
      return 'Encontrado'
    case 'closed':
      return 'Cerrado'
    default:
      return 'Pendiente'
  }
}

// ─── CommentItem ──────────────────────────────────────────────────────────────

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
        profileMap = profiles.reduce<Record<string, { name: string | null; lastName: string | null; email: string | null }>>(
          (acc, profile) => {
            acc[profile.id] = {
              name: profile.name,
              lastName: profile.last_name,
              email: profile.email,
            }
            return acc
          },
          {},
        )
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
          description: item.descripcion_general || 'Sin descripcion registrada.',
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
        commentMap[entry.caso_id].push({
          id: entry.id,
          text: entry.comentario,
          authorId: entry.autor_id,
        })
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
        setFeedback('El caso seleccionado desde "Casos" ya no esta pendiente de revision.')
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

  useEffect(() => {
    void loadPendingCases()
  }, [loadPendingCases])

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

    return () => {
      cancelled = true
    }
  }, [selectedCaseId, photoUrlByCaseId])

  const selectedCase = useMemo(
    () => pendingCases.find((item) => item.id === selectedCaseId) ?? null,
    [pendingCases, selectedCaseId],
  )

  const selectedCaseWithPhoto = useMemo(() => {
    if (!selectedCase) return null
    return {
      ...selectedCase,
      photoUrl: photoUrlByCaseId[selectedCase.id] ?? undefined,
    }
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
      setFeedback(`Caso ${selectedCase.name} aprobado.`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo aprobar el caso.'
      setFeedbackType('error')
      setFeedback(message)
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
      setFeedback(`Caso ${selectedCase.name} rechazado.`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo rechazar el caso.'
      setFeedbackType('error')
      setFeedback(message)
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
      setFeedback(`Caso ${selectedCase.name} marcado como falso.`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo marcar como falso.'
      setFeedbackType('error')
      setFeedback(message)
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
        [selectedCase.id]: [
          ...(prev[selectedCase.id] ?? []),
          { id: created.id, text: comment, authorId: user.id },
        ],
      }))
      setCommentModalOpen(false)
      setFeedbackType('info')
      setFeedback('Comentario agregado correctamente.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo guardar el comentario.'
      setFeedbackType('error')
      setFeedback(message)
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
      setFeedback('Comentario eliminado.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo eliminar el comentario.'
      setFeedbackType('error')
      setFeedback(message)
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
        [selectedCase.id]: (prev[selectedCase.id] ?? []).map((c) =>
          c.id === commentId ? { ...c, text: newText } : c,
        ),
      }))
      setFeedbackType('info')
      setFeedback('Comentario actualizado.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo editar el comentario.'
      setFeedbackType('error')
      setFeedback(message)
    } finally {
      setActionLoading(false)
    }
  }

  const selectedCaseComments = selectedCase ? (commentsByCaseId[selectedCase.id] ?? []) : []

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AuthoritySidebar />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-4">
          <div className="card p-6 flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-text-primary">Revision de publicaciones</h1>
              <p className="text-sm text-text-secondary mt-1">
                Flujo de moderacion para casos pendientes antes de ser publicados.
              </p>
            </div>
            <button type="button" onClick={() => void loadPendingCases()} className="btn-secondary">
              Recargar
            </button>
          </div>

          {feedback && <Alert type={feedbackType} message={feedback} />}

          {loading ? (
            <div className="card p-12 flex items-center justify-center">
              <Spinner size="lg" />
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-4">
              <PendingList
                cases={pendingCases}
                selectedCaseId={selectedCaseId}
                onSelectCase={setSelectedCaseId}
              />

              <div className="space-y-4">
                <CaseDetailPanel selectedCase={selectedCaseWithPhoto} />

                {selectedCase && selectedCaseComments.length > 0 && (
                  <div className="card p-5">
                    <h3 className="text-sm font-semibold text-text-primary mb-3">Comentarios de revision</h3>
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
                  </div>
                )}

                <ModerationActions
                  disabled={!selectedCase || actionLoading}
                  onApprove={() => void approveCase()}
                  onReject={() => void rejectCase()}
                  onAddComment={() => setCommentModalOpen(true)}
                  onMarkFalse={() => void markAsFalse()}
                />
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
