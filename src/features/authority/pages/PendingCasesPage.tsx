import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { useAuth } from '../../auth/hooks'
import { AuthoritySidebar } from '../components/AuthoritySidebar'
import AuthorityTopbar from '../components/AuthorityTopbar'
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
  normalizeAuthorityCaseRow,
  normalizeCaseCommentRow,
  softDeleteCase,
  updateCaseComment,
  updateCaseWorkflowStatus,
} from '../../../lib/supabase/db'
import { useRealtimeCaseComments } from '../../cases/hooks/useRealtimeCaseComments'
import { useRealtimeCases } from '../../cases/hooks/useRealtimeCases'
import { handleError } from '../../../shared/utils/handleError'
import { logCaseAction } from '../utils/case-history'
import { ModerationWorkspace } from '../../../shared/components/ui/ModerationWorkspace'

type CaseComment = { id: string; text: string; authorId: string }

function formatDate(dateIso: string) {
  const parsed = new Date(dateIso)
  if (Number.isNaN(parsed.getTime())) return 'Sin fecha'
  return new Intl.DateTimeFormat('es-DO', { day: '2-digit', month: 'short', year: 'numeric' }).format(parsed)
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

function toSortTime(value: string | null | undefined) {
  if (!value) return 0
  const parsed = new Date(value).getTime()
  return Number.isNaN(parsed) ? 0 : parsed
}

function toPendingCaseItemFromRealtime(row: NonNullable<ReturnType<typeof normalizeAuthorityCaseRow>>): PendingCaseItem {
  return {
    id: row.id,
    caseNumber: row.numero_caso,
    name: `${row.nombres} ${row.apellidos}`.trim(),
    age: row.edad ?? 0,
    gender: row.genero ?? null,
    location: formatLocation(row.ciudad, row.estado_provincia, row.lugar_ultima_vez),
    lastSeenPlace: row.lugar_ultima_vez || 'Sin dato',
    description: row.descripcion_general || 'Sin descripcion registrada.',
    createdBy: formatCreatedBy(row.publicado_por),
    createdAt: formatDate(row.created_at),
    missingDate: row.fecha_desaparicion ? formatDate(row.fecha_desaparicion) : 'Sin fecha',
    birthDate: row.fecha_nacimiento ? formatDate(row.fecha_nacimiento) : null,
    missingDateIso: row.fecha_desaparicion || row.created_at,
    contactPhone: row.telefono_contacto ?? null,
    contactEmail: row.email_contacto ?? null,
    caseStatusLabel: formatCaseStatus(row.status),
    workflowStatusLabel: formatWorkflowStatus(row.workflow_status),
    status: 'pending',
  }
}

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
        profileMap = profiles.reduce<typeof profileMap>((accumulator, profile) => {
          accumulator[profile.id] = { name: profile.name, lastName: profile.last_name, email: profile.email }
          return accumulator
        }, {})
      } catch (error) {
        handleError('PendingCasesPage.getProfilesBasicByIds', error, {
          fallbackMessage: 'No se pudieron cargar los datos de los usuarios.',
          toast: false,
        })
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

      const comments = await getCaseComments(mapped.map((item) => item.id))
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
        setFeedback('El caso seleccionado ya no esta pendiente de revision.')
      }
    } catch (err) {
      handleError('PendingCasesPage.loadPendingCases', err, {
        fallbackMessage: 'No se pudieron cargar los casos pendientes.',
        toast: false,
      })
      setFeedbackType('error')
      setFeedback(err instanceof Error ? err.message : 'No se pudieron cargar los casos pendientes.')
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
    if (!selectedCaseId || selectedCaseId in photoUrlByCaseId) return

    let cancelled = false

    const loadPhoto = async () => {
      try {
        const url = await getCasePhotoUrlFromStorage(selectedCaseId)
        if (!cancelled) {
          setPhotoUrlByCaseId((prev) => ({ ...prev, [selectedCaseId]: url }))
        }
      } catch (error) {
        handleError('PendingCasesPage.getCasePhotoUrlFromStorage', error, {
          fallbackMessage: 'No se pudo cargar la foto del caso.',
          toast: false,
        })
        if (!cancelled) {
          setPhotoUrlByCaseId((prev) => ({ ...prev, [selectedCaseId]: null }))
        }
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
    return { ...selectedCase, photoUrl: photoUrlByCaseId[selectedCase.id] ?? undefined }
  }, [photoUrlByCaseId, selectedCase])

  const removeFromPending = useCallback((caseId: string) => {
    setPendingCases((prev) => {
      const next = prev.filter((item) => item.id !== caseId)
      setSelectedCaseId(next[0]?.id ?? null)
      return next
    })
  }, [])

  useRealtimeCases({
    onEvent: (payload) => {
      const caseId = payload.new.id || payload.old.id
      if (!caseId) return

      if (
        payload.eventType === 'DELETE' ||
        payload.new.eliminado === true ||
        (payload.new.workflow_status && payload.new.workflow_status !== 'pending')
      ) {
        removeFromPending(caseId)
        return
      }

      const nextRow = normalizeAuthorityCaseRow(payload.new)
      if (!nextRow) return

      const nextItem = toPendingCaseItemFromRealtime(nextRow)
      setPendingCases((prev) =>
        [...prev.filter((item) => item.id !== caseId), nextItem].sort(
          (first, second) => toSortTime(second.missingDateIso) - toSortTime(first.missingDateIso),
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
        [caseId]: [
          ...(prev[caseId] ?? []).filter((item) => item.id !== normalized.id),
          { id: normalized.id, text: normalized.comentario, authorId: normalized.autor_id },
        ],
      }))
    },
  })

  const approveCase = async () => {
    if (!selectedCase) return
    setActionLoading(true)
    try {
      await updateCaseWorkflowStatus(selectedCase.id, 'approved')
      if (user?.id) await logCaseAction(selectedCase.id, user.id, 'approved')
      removeFromPending(selectedCase.id)
      setFeedbackType('success')
      setFeedback(`Caso de ${selectedCase.name} aprobado exitosamente.`)
    } catch (err) {
      handleError('PendingCasesPage.approveCase', err, { fallbackMessage: 'No se pudo aprobar el caso.', toast: false })
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
      if (user?.id) await logCaseAction(selectedCase.id, user.id, 'rejected')
      removeFromPending(selectedCase.id)
      setFeedbackType('warning')
      setFeedback(`Caso de ${selectedCase.name} rechazado.`)
    } catch (err) {
      handleError('PendingCasesPage.rejectCase', err, { fallbackMessage: 'No se pudo rechazar el caso.', toast: false })
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
      handleError('PendingCasesPage.markAsFalse', err, { fallbackMessage: 'No se pudo marcar como falso.', toast: false })
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
      handleError('PendingCasesPage.saveComment', err, { fallbackMessage: 'No se pudo guardar la nota.', toast: false })
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
        [selectedCase.id]: (prev[selectedCase.id] ?? []).filter((comment) => comment.id !== commentId),
      }))
      setFeedbackType('info')
      setFeedback('Nota eliminada.')
    } catch (err) {
      handleError('PendingCasesPage.deleteCaseComment', err, { fallbackMessage: 'No se pudo eliminar la nota.', toast: false })
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
        [selectedCase.id]: (prev[selectedCase.id] ?? []).map((comment) =>
          comment.id === commentId ? { ...comment, text: newText } : comment,
        ),
      }))
      setFeedbackType('info')
      setFeedback('Nota actualizada.')
    } catch (err) {
      handleError('PendingCasesPage.updateCaseComment', err, { fallbackMessage: 'No se pudo editar la nota.', toast: false })
      setFeedbackType('error')
      setFeedback(err instanceof Error ? err.message : 'No se pudo editar la nota.')
    } finally {
      setActionLoading(false)
    }
  }

  const selectedCaseComments = selectedCase ? (commentsByCaseId[selectedCase.id] ?? []) : []

  return (
    <div className="flex min-h-screen bg-background">
      <AuthoritySidebar />

      <div className="min-w-0 flex-1">
        <ModerationWorkspace
          title="Revision de publicaciones"
          subtitle="Una vista mas clara y comoda para validar casos pendientes antes de su publicacion publica."
          sectionLabel="Authority · Moderacion"
          queueTitle="Cola de revision"
          queueSubtitle="Selecciona un caso para inspeccionar su ficha completa."
          pendingCount={pendingCases.length}
          commentsCount={selectedCaseComments.length}
          selectedCaseNumber={selectedCase?.caseNumber ?? null}
          feedback={feedback}
          feedbackType={feedbackType}
          loading={loading}
          hasSelection={Boolean(selectedCase)}
          onRefresh={() => void loadPendingCases()}
          queue={<PendingList cases={pendingCases} selectedCaseId={selectedCaseId} onSelectCase={setSelectedCaseId} />}
          detail={<CaseDetailPanel selectedCase={selectedCaseWithPhoto} />}
          notes={
            selectedCase ? (
              selectedCaseComments.length === 0 ? (
                <div className="rounded-[22px] border border-dashed border-border bg-slate-50 px-5 py-8 text-center">
                  <p className="text-sm font-semibold text-text-primary">Sin notas registradas</p>
                  <p className="mt-2 text-sm leading-6 text-text-secondary">
                    Agrega una nota si necesitas dejar observaciones para el equipo.
                  </p>
                </div>
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
              )
            ) : undefined
          }
          actions={
            <ModerationActions
              disabled={!selectedCase || actionLoading}
              commentsCount={selectedCaseComments.length}
              onApprove={() => void approveCase()}
              onReject={() => void rejectCase()}
              onAddComment={() => setCommentModalOpen(true)}
              onMarkFalse={() => void markAsFalse()}
            />
          }
          loadingState={
            <div className="flex flex-col items-center justify-center rounded-[28px] border border-border bg-card px-6 py-16 shadow-sm shadow-slate-200/40">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/15 border-t-primary" />
              <p className="mt-4 text-sm text-text-secondary">Cargando casos pendientes...</p>
            </div>
          }
          emptyState={
            <div className="flex flex-col items-center justify-center rounded-[28px] border border-border bg-card px-6 py-16 text-center shadow-sm shadow-slate-200/40">
              <div className="flex h-16 w-16 items-center justify-center rounded-[22px] border border-success/20 bg-success/8">
                <CheckCircle2 size={28} className="text-success" />
              </div>
              <h2 className="mt-5 text-xl font-semibold text-text-primary">No hay casos pendientes</h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-text-secondary">
                Todo el flujo de revision esta al dia. Cuando llegue un nuevo caso aparecera aqui con su ficha lista para evaluar.
              </p>
            </div>
          }
        />
      </div>

      <CommentModal
        open={commentModalOpen}
        caseName={selectedCase?.name ?? ''}
        onClose={() => setCommentModalOpen(false)}
        onSave={(comment) => void saveComment(comment)}
      />
    </div>
  )
}
