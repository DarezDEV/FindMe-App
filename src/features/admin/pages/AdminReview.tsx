import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../auth/hooks'
import AdminSidebar from '../components/Adminsidebar'
import { CaseDetailPanel } from '../../authority/components/moderation/CaseDetailPanel'
import { CommentItem } from '../../authority/components/moderation/CommentItem'
import { CommentModal } from '../../authority/components/moderation/CommentModal'
import { ModerationActions } from '../../authority/components/moderation/ModerationActions'
import { PendingList } from '../../authority/components/moderation/PendingList'
import type { PendingCaseItem } from '../../authority/components/moderation/types'
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

type CaseComment = {
  id: string
  text: string
  authorId: string
}

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

const FEEDBACK_META = {
  success: { color: '#059669', bg: 'rgba(5,150,105,0.06)', border: 'rgba(5,150,105,0.2)', dot: '#059669' },
  warning: { color: '#D97706', bg: 'rgba(217,119,6,0.06)', border: 'rgba(217,119,6,0.2)', dot: '#D97706' },
  error:   { color: '#DC2626', bg: 'rgba(220,38,38,0.06)', border: 'rgba(220,38,38,0.2)', dot: '#DC2626' },
  info:    { color: '#0284C7', bg: 'rgba(2,132,199,0.06)', border: 'rgba(2,132,199,0.2)', dot: '#0284C7' },
}

export default function AdminReview() {
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
      setFeedback(`Caso de ${selectedCase.name} aprobado.`)
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
  const feedbackMeta = feedback ? FEEDBACK_META[feedbackType] : null

  return (
    <AdminSidebar>
      <div style={{ minHeight: '100vh', background: '#F2F4F7', fontFamily: "'Geist', 'Inter', sans-serif" }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
          @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
          @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
          @keyframes spin { to { transform:rotate(360deg); } }
          @keyframes dotPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.75)} }

          .p-scroll::-webkit-scrollbar { width: 5px; }
          .p-scroll::-webkit-scrollbar-thumb { background: rgba(100,116,139,0.2); border-radius:999px; }

          .p-card { background:#fff; border:1px solid #E4E7EC; border-radius:10px; box-shadow:0 1px 2px rgba(0,0,0,0.04),0 1px 4px rgba(0,0,0,0.03); }
          .p-in { animation: fadeUp 0.4s ease-out both; }
          .p-in-1 { animation-delay:0.06s; }
          .p-in-2 { animation-delay:0.12s; }

          .p-ghost {
            display:inline-flex; align-items:center; gap:7px;
            padding:7px 14px; border-radius:8px;
            border:1px solid #E4E7EC; background:#fff;
            color:#64748B; font-size:12px; font-family:'Geist',sans-serif; font-weight:500;
            cursor:pointer; transition:all 0.15s;
          }
          .p-ghost:hover { border-color:#CBD5E1; color:#334155; }

          .feedback-bar { animation: fadeIn 0.25s ease-out; }
        `}</style>

        <main style={{ height: '100%' }}>
          <div style={{ maxWidth: 1400, margin: '0 auto', padding: '40px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }} className="p-in">
              <div>
                <p style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", fontWeight: 500, color: '#2B5CE6', letterSpacing: '0.28em', textTransform: 'uppercase', marginBottom: 8 }}>
                  Panel admin · Moderación
                </p>
                <h1 style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 32, color: '#111827', fontWeight: 400, letterSpacing: '-0.03em', marginBottom: 6 }}>
                  Revisión de publicaciones
                </h1>
                <p style={{ fontSize: 13, color: '#6B7280' }}>Flujo de revisión para casos pendientes antes de su publicación pública.</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {!loading && pendingCases.length > 0 && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderRadius: 999, background: 'rgba(43,92,230,0.06)', border: '1px solid rgba(43,92,230,0.2)' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#2B5CE6', animation: 'dotPulse 2s ease-in-out infinite' }} />
                    <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: '#2B5CE6' }}>
                      {pendingCases.length} pendiente{pendingCases.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
                <button type="button" onClick={() => void loadPendingCases()} className="p-ghost">
                  Recargar
                </button>
              </div>
            </div>

            {feedback && feedbackMeta && (
              <div className="p-card feedback-bar" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, background: feedbackMeta.bg, borderColor: feedbackMeta.border, color: feedbackMeta.color }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: feedbackMeta.dot, flexShrink: 0 }} />
                <span style={{ fontSize: 13 }}>{feedback}</span>
              </div>
            )}

            {loading ? (
              <div className="p-card p-in p-in-1" style={{ padding: '64px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 22, height: 22, border: '2px solid rgba(43,92,230,0.2)', borderTopColor: '#2B5CE6', borderRadius: '50%', animation: 'spin 0.9s linear infinite' }} />
                <p style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: '#9CA3AF' }}>Cargando casos pendientes...</p>
              </div>
            ) : pendingCases.length === 0 ? (
              <div className="p-card p-in p-in-1" style={{ padding: '64px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center' }}>
                <div style={{ width: 54, height: 54, borderRadius: 14, background: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 26, color: '#059669', lineHeight: 1 }}>✓</span>
                </div>
                <p style={{ fontSize: 14, color: '#111827', fontWeight: 600 }}>Sin casos pendientes</p>
                <p style={{ fontSize: 12, color: '#9CA3AF', maxWidth: 360 }}>
                  Todos los casos han sido revisados. El sistema está al día.
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 18, alignItems: 'start' }} className="p-in p-in-2">
                <div className="p-card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 200px)' }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F3F5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 2 }}>Cola de revisión</p>
                      <p style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: '#9CA3AF' }}>
                        {pendingCases.length} casos en espera
                      </p>
                    </div>
                  </div>
                  <div className="p-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                    <PendingList cases={pendingCases} selectedCaseId={selectedCaseId} onSelectCase={setSelectedCaseId} />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="p-card" style={{ overflow: 'hidden' }}>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F3F5' }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 2 }}>Detalle del caso</p>
                      {selectedCase && <p style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: '#2B5CE6' }}>{selectedCase.caseNumber}</p>}
                    </div>
                    <div style={{ padding: 20 }}>
                      <CaseDetailPanel selectedCase={selectedCaseWithPhoto} />
                    </div>
                  </div>

                  {selectedCase && (
                    <div className="p-card" style={{ overflow: 'hidden' }}>
                      <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F3F5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 2 }}>Notas de revisión</p>
                          <p style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: '#9CA3AF' }}>
                            {selectedCaseComments.length} nota{selectedCaseComments.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                        {selectedCaseComments.length > 0 && (
                          <span style={{ padding: '3px 10px', borderRadius: 6, background: 'rgba(2,132,199,0.08)', border: '1px solid rgba(2,132,199,0.2)', fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: '#0284C7', fontWeight: 500 }}>
                            {selectedCaseComments.length}
                          </span>
                        )}
                      </div>
                      <div style={{ padding: 20 }}>
                        {selectedCaseComments.length === 0 ? (
                          <p style={{ fontSize: 12, color: '#9CA3AF', fontFamily: "'JetBrains Mono', monospace" }}>Aún no hay notas registradas para este caso.</p>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {selectedCaseComments.map((comment) => (
                              <CommentItem key={comment.id} comment={comment} currentUserId={user?.id ?? ''} onDelete={() => void handleDeleteComment(comment.id)} onEdit={(newText) => void handleEditComment(comment.id, newText)} disabled={actionLoading} />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="p-card" style={{ overflow: 'hidden' }}>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F3F5' }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 2 }}>Acciones de revisión</p>
                      <p style={{ fontSize: 12, color: '#9CA3AF' }}>Revisa y decide el estado de este caso.</p>
                    </div>
                    <div style={{ padding: 20 }}>
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

        <CommentModal open={commentModalOpen} caseName={selectedCase?.name ?? ''} onClose={() => setCommentModalOpen(false)} onSave={(comment) => void saveComment(comment)} />
      </div>
    </AdminSidebar>
  )
}
