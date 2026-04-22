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

type CaseComment = { id: string; text: string; authorId: string }

function formatDate(dateIso: string) {
  const parsed = new Date(dateIso)
  if (Number.isNaN(parsed.getTime())) return 'Sin fecha'
  return new Intl.DateTimeFormat('es-DO', { day: '2-digit', month: 'short', year: 'numeric' }).format(parsed)
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
    case 'activo': return 'Activo'; case 'en_proceso': return 'En proceso'
    case 'resuelto': return 'Resuelto'; case 'cerrado': return 'Cerrado'; default: return 'Sin estado'
  }
}
function formatWorkflowStatus(status: string | null | undefined) {
  switch (status) {
    case 'pending': return 'Pendiente'; case 'approved': return 'Aprobado'
    case 'rejected': return 'Rechazado'; case 'found': return 'Encontrado'; case 'closed': return 'Cerrado'; default: return 'Pendiente'
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
    description: row.descripcion_general || 'Sin descripción registrada.',
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

const FEEDBACK_META = {
  success: { color: '#059669', bg: 'rgba(5,150,105,0.06)', border: 'rgba(5,150,105,0.2)', dot: '#059669' },
  warning: { color: '#D97706', bg: 'rgba(217,119,6,0.06)', border: 'rgba(217,119,6,0.2)', dot: '#D97706' },
  error:   { color: '#DC2626', bg: 'rgba(220,38,38,0.06)', border: 'rgba(220,38,38,0.2)', dot: '#DC2626' },
  info:    { color: '#0284C7', bg: 'rgba(2,132,199,0.06)', border: 'rgba(2,132,199,0.2)', dot: '#0284C7' },
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
    setLoading(true); setFeedback(null)
    try {
      const data = await getPendingModerationCases(200)
      const userIds = data.map((item) => item.publicado_por).filter((v): v is string => Boolean(v))
      let profileMap: Record<string, { name: string | null; lastName: string | null; email: string | null }> = {}
      try {
        const profiles = await getProfilesBasicByIds(userIds)
        profileMap = profiles.reduce<typeof profileMap>((acc, p) => { acc[p.id] = { name: p.name, lastName: p.last_name, email: p.email }; return acc }, {})
      } catch (error) {
        handleError('PendingCasesPage.getProfilesBasicByIds', error, {
          fallbackMessage: 'No se pudieron cargar los datos de los usuarios.',
          toast: false,
        })
        profileMap = {}
      }

      const mapped: PendingCaseItem[] = data.map((item) => {
        const profile = item.publicado_por ? profileMap[item.publicado_por] : undefined
        return {
          id: item.id, caseNumber: item.numero_caso,
          name: `${item.nombres} ${item.apellidos}`.trim(),
          age: item.edad ?? 0, gender: item.genero ?? null,
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

      setPendingCases(mapped); setCommentsByCaseId(commentMap)
      if (requestedCaseId && mapped.some((item) => item.id === requestedCaseId)) { setSelectedCaseId(requestedCaseId) }
      else { setSelectedCaseId(mapped[0]?.id ?? null) }
      if (requestedCaseId && !mapped.some((item) => item.id === requestedCaseId)) { setFeedbackType('warning'); setFeedback('El caso seleccionado desde "Casos" ya no está pendiente de revisión.') }
    } catch (err) {
      handleError('PendingCasesPage.loadPendingCases', err, {
        fallbackMessage: 'No se pudieron cargar los casos pendientes.',
        toast: false,
      })
      setFeedbackType('error'); setFeedback(err instanceof Error ? err.message : 'No se pudieron cargar los casos pendientes.')
      setPendingCases([]); setSelectedCaseId(null)
    } finally { setLoading(false) }
  }, [requestedCaseId])

  useEffect(() => { void loadPendingCases() }, [loadPendingCases])

  useEffect(() => {
    if (!selectedCaseId || selectedCaseId in photoUrlByCaseId) return
    let cancelled = false
    const loadPhoto = async () => {
      try { const url = await getCasePhotoUrlFromStorage(selectedCaseId); if (!cancelled) setPhotoUrlByCaseId((prev) => ({ ...prev, [selectedCaseId]: url })) }
      catch (error) {
        handleError('PendingCasesPage.getCasePhotoUrlFromStorage', error, {
          fallbackMessage: 'No se pudo cargar la foto del caso.',
          toast: false,
        })
        if (!cancelled) setPhotoUrlByCaseId((prev) => ({ ...prev, [selectedCaseId]: null }))
      }
    }
    void loadPhoto()
    return () => { cancelled = true }
  }, [selectedCaseId, photoUrlByCaseId])

  const selectedCase = useMemo(() => pendingCases.find((item) => item.id === selectedCaseId) ?? null, [pendingCases, selectedCaseId])
  const selectedCaseWithPhoto = useMemo(() => { if (!selectedCase) return null; return { ...selectedCase, photoUrl: photoUrlByCaseId[selectedCase.id] ?? undefined } }, [photoUrlByCaseId, selectedCase])

  const removeFromPending = useCallback((caseId: string) => {
    setPendingCases((prev) => { const next = prev.filter((item) => item.id !== caseId); setSelectedCaseId(next[0]?.id ?? null); return next })
  }, [])

  useRealtimeCases({
    onEvent: (payload) => {
      const caseId = payload.new.id || payload.old.id
      if (!caseId) return

      if (payload.eventType === 'DELETE' || payload.new.eliminado === true || (payload.new.workflow_status && payload.new.workflow_status !== 'pending')) {
        removeFromPending(caseId)
        return
      }

      const nextRow = normalizeAuthorityCaseRow(payload.new)
      if (!nextRow) return

      const nextItem = toPendingCaseItemFromRealtime(nextRow)
      setPendingCases((prev) =>
        [...prev.filter((item) => item.id !== caseId), nextItem].sort(
          (a, b) => toSortTime(b.missingDateIso) - toSortTime(a.missingDateIso),
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
        }],
      }))
    },
  })

  const approveCase = async () => {
    if (!selectedCase) return; setActionLoading(true)
    try {
      await updateCaseWorkflowStatus(selectedCase.id, 'approved')
      if (user?.id) await logCaseAction(selectedCase.id, user.id, 'approved')
      removeFromPending(selectedCase.id); setFeedbackType('success'); setFeedback(`Caso de ${selectedCase.name} aprobado exitosamente.`)
    }
    catch (err) {
      handleError('PendingCasesPage.approveCase', err, { fallbackMessage: 'No se pudo aprobar el caso.', toast: false })
      setFeedbackType('error'); setFeedback(err instanceof Error ? err.message : 'No se pudo aprobar el caso.')
    }
    finally { setActionLoading(false) }
  }
  const rejectCase = async () => {
    if (!selectedCase) return; setActionLoading(true)
    try {
      await updateCaseWorkflowStatus(selectedCase.id, 'rejected')
      if (user?.id) await logCaseAction(selectedCase.id, user.id, 'rejected')
      removeFromPending(selectedCase.id); setFeedbackType('warning'); setFeedback(`Caso de ${selectedCase.name} rechazado.`)
    }
    catch (err) {
      handleError('PendingCasesPage.rejectCase', err, { fallbackMessage: 'No se pudo rechazar el caso.', toast: false })
      setFeedbackType('error'); setFeedback(err instanceof Error ? err.message : 'No se pudo rechazar el caso.')
    }
    finally { setActionLoading(false) }
  }
  const markAsFalse = async () => {
    if (!selectedCase) return; setActionLoading(true)
    try { await softDeleteCase(selectedCase.id); removeFromPending(selectedCase.id); setFeedbackType('error'); setFeedback(`Caso de ${selectedCase.name} marcado como falso y eliminado.`) }
    catch (err) {
      handleError('PendingCasesPage.markAsFalse', err, { fallbackMessage: 'No se pudo marcar como falso.', toast: false })
      setFeedbackType('error'); setFeedback(err instanceof Error ? err.message : 'No se pudo marcar como falso.')
    }
    finally { setActionLoading(false) }
  }
  const saveComment = async (comment: string) => {
    if (!selectedCase || !comment || !user?.id) return; setActionLoading(true)
    try {
      const created = await createCaseComment(selectedCase.id, user.id, comment)
      setCommentsByCaseId((prev) => ({ ...prev, [selectedCase.id]: [...(prev[selectedCase.id] ?? []), { id: created.id, text: comment, authorId: user.id }] }))
      setCommentModalOpen(false); setFeedbackType('info'); setFeedback('Nota agregada correctamente.')
    } catch (err) {
      handleError('PendingCasesPage.saveComment', err, { fallbackMessage: 'No se pudo guardar la nota.', toast: false })
      setFeedbackType('error'); setFeedback(err instanceof Error ? err.message : 'No se pudo guardar la nota.')
    }
    finally { setActionLoading(false) }
  }
  const handleDeleteComment = async (commentId: string) => {
    if (!selectedCase) return; setActionLoading(true)
    try { await deleteCaseComment(commentId); setCommentsByCaseId((prev) => ({ ...prev, [selectedCase.id]: (prev[selectedCase.id] ?? []).filter((c) => c.id !== commentId) })); setFeedbackType('info'); setFeedback('Nota eliminada.') }
    catch (err) {
      handleError('PendingCasesPage.deleteCaseComment', err, { fallbackMessage: 'No se pudo eliminar la nota.', toast: false })
      setFeedbackType('error'); setFeedback(err instanceof Error ? err.message : 'No se pudo eliminar la nota.')
    }
    finally { setActionLoading(false) }
  }
  const handleEditComment = async (commentId: string, newText: string) => {
    if (!selectedCase) return; setActionLoading(true)
    try { await updateCaseComment(commentId, newText); setCommentsByCaseId((prev) => ({ ...prev, [selectedCase.id]: (prev[selectedCase.id] ?? []).map((c) => c.id === commentId ? { ...c, text: newText } : c) })); setFeedbackType('info'); setFeedback('Nota actualizada.') }
    catch (err) {
      handleError('PendingCasesPage.updateCaseComment', err, { fallbackMessage: 'No se pudo editar la nota.', toast: false })
      setFeedbackType('error'); setFeedback(err instanceof Error ? err.message : 'No se pudo editar la nota.')
    }
    finally { setActionLoading(false) }
  }

  const selectedCaseComments = selectedCase ? (commentsByCaseId[selectedCase.id] ?? []) : []

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--color-background, #f8fafc)', fontFamily: 'system-ui, sans-serif' }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes spin { to { transform:rotate(360deg); } }

        .p-scroll::-webkit-scrollbar { width: 5px; }
        .p-scroll::-webkit-scrollbar-thumb { background: rgba(100,116,139,0.2); border-radius:999px; }

        .p-card { background:#fff; border:1px solid #E4E7EC; border-radius:10px; box-shadow:0 1px 2px rgba(0,0,0,0.04),0 1px 4px rgba(0,0,0,0.03); }
        .p-in { animation: fadeUp 0.4s ease-out both; }
        .p-in-1 { animation-delay:0.06s; }
        .p-in-2 { animation-delay:0.12s; }
        .p-review-grid { display:grid; grid-template-columns:minmax(0, 1fr); gap:20px; align-items:start; }
        .p-review-queue { max-height:none; }

        .p-ghost {
          display:inline-flex; align-items:center; gap:7px;
          padding:7px 14px; border-radius:8px;
          border:1px solid #E4E7EC; background:#fff;
          color:#64748B; font-size:12px; font-family: system-ui, sans-serif; font-weight:500;
          cursor:pointer; transition:all 0.15s;
        }
        .p-ghost:hover { border-color:#CBD5E1; color:#334155; }

        .feedback-bar { animation: fadeIn 0.25s ease-out; }

        @media (min-width: 1280px) {
          .p-review-grid { grid-template-columns:360px minmax(0, 1fr); }
          .p-review-queue { max-height:calc(100dvh - 200px); }
        }
      `}</style>

      <AuthoritySidebar />

      <main className="p-scroll" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '40px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* ─── HEADER ─── */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }} className="p-in">
            <div>
              <p style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 500, color: 'var(--color-primary, #3266db)', letterSpacing: '0.28em', textTransform: 'uppercase', marginBottom: 8 }}>
                Módulo de Moderación · Publicaciones
              </p>
              <h1 style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 32, color: 'var(--color-text-primary, #0f172a)', fontWeight: 400, letterSpacing: '-0.03em', marginBottom: 6 }}>
                Revisión de Publicaciones
              </h1>
              <p style={{ fontSize: 13, color: 'var(--color-text-secondary, #475569)' }}>Flujo de moderación para casos pendientes antes de su publicación pública.</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {!loading && pendingCases.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', borderRadius: 8, background: 'rgba(43,92,230,0.07)', border: '1px solid rgba(43,92,230,0.2)' }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#2B5CE6', animation: 'dotPulse 2s ease-in-out infinite' }} />
                  <span style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--color-primary, #3266db)' }}>
                    {pendingCases.length} pendiente{pendingCases.length !== 1 ? 's' : ''}
                  </span>
                  <style>{`@keyframes dotPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.7)} }`}</style>
                </div>
              )}
              <button type="button" onClick={() => void loadPendingCases()} className="p-ghost">
                Recargar
              </button>
            </div>
          </div>

          {/* ─── FEEDBACK ─── */}
          {feedback && (() => {
            const meta = FEEDBACK_META[feedbackType]
            return (
              <div className="feedback-bar" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px', borderRadius: 10, border: `1px solid ${meta.border}`, background: meta.bg }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: meta.dot, flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: meta.color }}>{feedback}</span>
              </div>
            )
          })()}

          {/* ─── LOADING ─── */}
          {loading ? (
            <div className="p-card" style={{ padding: '64px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 22, height: 22, border: '2px solid rgba(43,92,230,0.2)', borderTopColor: '#2B5CE6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <p style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--color-text-secondary, #475569)' }}>Cargando casos pendientes...</p>
            </div>
          ) : pendingCases.length === 0 ? (
            <div className="p-card p-in p-in-1" style={{ padding: '64px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(5,150,105,0.07)', border: '1px solid rgba(5,150,105,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 22 }}>✓</span>
              </div>
              <p style={{ fontSize: 14, color: 'var(--color-text-primary, #0f172a)', fontWeight: 600 }}>Sin casos pendientes</p>
              <p style={{ fontSize: 13, color: 'var(--color-text-secondary, #475569)', textAlign: 'center', maxWidth: 320 }}>Todos los casos han sido revisados. El sistema está al día.</p>
            </div>
          ) : (
            <div className="p-review-grid p-in p-in-1">

              {/* ─── PENDING LIST ─── */}
              <div className="p-card p-review-queue" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border, #e2e8f0)' }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary, #0f172a)', marginBottom: 2 }}>Cola de revisión</p>
                  <p style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--color-text-secondary, #475569)' }}>
                    {pendingCases.length} casos en espera
                  </p>
                </div>
                <div className="p-scroll" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                  <PendingList cases={pendingCases} selectedCaseId={selectedCaseId} onSelectCase={setSelectedCaseId} />
                </div>
              </div>

              {/* ─── DETAIL COLUMN ─── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minHeight: 0, minWidth: 0 }}>

                {/* Case Detail */}
                <div className="p-card" style={{ overflow: 'hidden' }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border, #e2e8f0)' }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary, #0f172a)', marginBottom: 2 }}>Detalle del caso</p>
                    {selectedCase && <p style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--color-primary, #3266db)' }}>{selectedCase.caseNumber}</p>}
                  </div>
                  <div style={{ padding: 20 }}>
                    <CaseDetailPanel selectedCase={selectedCaseWithPhoto} />
                  </div>
                </div>

                {/* Review Notes */}
                {selectedCase && (
                  <div className="p-card" style={{ overflow: 'hidden' }}>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border, #e2e8f0)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary, #0f172a)', marginBottom: 2 }}>Notas de revisión</p>
                        <p style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--color-text-secondary, #475569)' }}>
                          {selectedCaseComments.length} nota{selectedCaseComments.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      {selectedCaseComments.length > 0 && (
                        <span style={{ padding: '3px 10px', borderRadius: 6, background: 'rgba(2,132,199,0.08)', border: '1px solid rgba(2,132,199,0.2)', fontSize: 11, fontFamily: 'monospace', color: '#0284C7', fontWeight: 500 }}>
                          {selectedCaseComments.length}
                        </span>
                      )}
                    </div>
                    <div style={{ padding: 20 }}>
                      {selectedCaseComments.length === 0 ? (
                        <p style={{ fontSize: 12, color: 'var(--color-text-secondary, #475569)', fontFamily: 'monospace' }}>Aún no hay notas registradas para este caso.</p>
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

                {/* Moderation Actions */}
                <div className="p-card" style={{ overflow: 'hidden' }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border, #e2e8f0)' }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary, #0f172a)', marginBottom: 2 }}>Acciones de moderación</p>
                    <p style={{ fontSize: 12, color: 'var(--color-text-secondary, #475569)' }}>Revisa y decide el estado de este caso.</p>
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
  )
}
