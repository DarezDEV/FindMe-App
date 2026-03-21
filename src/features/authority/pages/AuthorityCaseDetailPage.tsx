import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronLeft, Eye, Mail, MapPin, MessageSquare, Phone, UserSearch, Video, Calendar, User, Hash, AlertCircle, X } from 'lucide-react'
import { AuthoritySidebar } from '../components/AuthoritySidebar'
import { Spinner } from '../../../shared/components/ui'
import { useCasoDetalle } from '../../user/hooks/useMisCasos'
import { useAuth } from '../../auth/hooks'
import { createCaseClosure, createCaseComment, getCasesByPersonId, updateCaseWorkflowStatus, type PersonCaseHistoryRow } from '../../../lib/supabase/db'
import { getCaseActionAvailability, deriveWorkflowStatus } from '../utils/case-workflow'
import { logCaseAction } from '../utils/case-history'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTime(value: string | null) {
  if (!value) return 'Sin fecha'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleString('es-DO', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function formatEstado(value: string | null) {
  if (!value) return null
  return value.replace(/_/g, ' ')
}

function formatCommentContent(content: string) {
  const normalized = content.trim()
  if (normalized.toUpperCase().startsWith('[ACCION]')) {
    return normalized.replace(/^\[ACCION\]\s*/i, '').trim()
  }
  return normalized
}

function formatStatusLabel(status: string) {
  if (status === 'encontrado') return 'Reunificada'
  if (status === 'cerrado') return 'Archivada'
  return 'Publicada'
}

function formatWorkflowStatus(status: string | null | undefined) {
  if (status === 'pending') return 'Pendiente'
  if (status === 'approved') return 'Aprobado'
  if (status === 'rejected') return 'Rechazado'
  if (status === 'found') return 'Encontrado'
  if (status === 'closed') return 'Cerrado'
  return 'Pendiente'
}

function getStatusColor(status: string) {
  if (status === 'encontrado') return { color: '#059669', bg: 'rgba(5,150,105,0.08)', border: 'rgba(5,150,105,0.2)', dot: '#059669' }
  if (status === 'cerrado') return { color: '#6B7280', bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.2)', dot: '#9CA3AF' }
  return { color: '#2B5CE6', bg: 'rgba(43,92,230,0.08)', border: 'rgba(43,92,230,0.2)', dot: '#2B5CE6' }
}

function buildApproximateLocation(city: string | null, country: string | null) {
  const parts = [city, country].filter((p): p is string => Boolean(p?.trim()))
  return parts.length > 0 ? parts.join(', ') : 'Ubicación reservada'
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function DataField({ label, value, mono = false }: { label: string; value: string | number | null; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <p style={{
        fontSize: 9, fontFamily: "'JetBrains Mono', monospace", fontWeight: 500,
        letterSpacing: '0.22em', textTransform: 'uppercase', color: '#9CA3AF', margin: 0,
      }}>{label}</p>
      <p style={{
        fontSize: 13, color: value ? '#111827' : '#C4C9D4', margin: 0,
        fontFamily: mono ? "'JetBrains Mono', monospace" : "'Geist', sans-serif",
        fontWeight: value ? 500 : 400,
      }}>
        {value ?? 'No disponible'}
      </p>
    </div>
  )
}

function SectionCard({ children, style, className }: { children: ReactNode; style?: CSSProperties; className?: string }) {
  return (
    <div className={className} style={{
      background: '#fff', border: '1px solid #E4E7EC', borderRadius: 12,
      boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 1px 4px rgba(0,0,0,0.03)',
      ...style,
    }}>
      {children}
    </div>
  )
}

function SectionHeader({ icon, title, count }: { icon: React.ReactNode; title: string; count?: number }) {
  return (
    <div style={{
      padding: '18px 24px', borderBottom: '1px solid #F1F3F5',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{
          width: 30, height: 30, borderRadius: 8,
          background: 'rgba(43,92,230,0.07)', border: '1px solid rgba(43,92,230,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2B5CE6', flexShrink: 0,
        }}>{icon}</span>
        <p style={{ fontFamily: "'Geist', sans-serif", fontSize: 14, fontWeight: 600, color: '#111827', margin: 0 }}>{title}</p>
      </div>
      {count !== undefined && (
        <span style={{
          fontSize: 10, fontFamily: "'JetBrains Mono', monospace", fontWeight: 500,
          color: '#2B5CE6', background: 'rgba(43,92,230,0.08)', border: '1px solid rgba(43,92,230,0.18)',
          padding: '3px 9px', borderRadius: 999,
        }}>{count}</span>
      )}
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function AuthorityCaseDetailPage() {
  const { id = '' } = useParams<{ id: string }>()
  const { user } = useAuth()
  const { data, isLoading, isError, error, refetch } = useCasoDetalle(id)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<'approve' | 'reject' | 'reopen' | 'found' | null>(null)
  const [confirmAction, setConfirmAction] = useState<'approve' | 'reject' | 'reopen' | null>(null)
  const [foundModalOpen, setFoundModalOpen] = useState(false)
  const [foundDetails, setFoundDetails] = useState('')
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)
  const [noteModalOpen, setNoteModalOpen] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [noteLoading, setNoteLoading] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [personHistory, setPersonHistory] = useState<PersonCaseHistoryRow[]>([])

  const openLightbox = (src: string) => {
    setLightboxSrc(src)
    setLightboxOpen(true)
  }

  const loadPersonHistory = async (personId: string, currentCaseId: string) => {
    setHistoryLoading(true)
    try {
      const rows = await getCasesByPersonId(personId, currentCaseId)
      setPersonHistory(rows)
    } catch {
      setPersonHistory([])
    } finally {
      setHistoryLoading(false)
    }
  }

  useEffect(() => {
    if (!data?.caso?.person_id) {
      setPersonHistory([])
      return
    }
    void loadPersonHistory(data.caso.person_id, data.caso.id)
  }, [data?.caso?.person_id, data?.caso?.id])

  // ─── Loading ───
  if (isLoading) {
    return (
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#F2F4F7' }}>
        <AuthoritySidebar />
        <main style={{ flex: 1, overflowY: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Spinner fullScreen />
        </main>
      </div>
    )
  }

  // ─── Error ───
  if (isError || !data) {
    return (
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#F2F4F7' }}>
        <AuthoritySidebar />
        <main style={{ flex: 1, overflowY: 'auto', padding: '40px 32px' }}>
          <SectionCard style={{ maxWidth: 480, padding: 28 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <AlertCircle size={16} style={{ color: '#DC2626' }} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 4, fontFamily: "'Geist', sans-serif" }}>No se pudo cargar el caso</p>
                <p style={{ fontSize: 12, color: '#9CA3AF', fontFamily: "'JetBrains Mono', monospace" }}>
                  {error instanceof Error ? error.message : 'Error inesperado.'}
                </p>
                <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                  <button onClick={() => refetch()} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #E4E7EC', background: '#fff', color: '#374151', fontSize: 12, fontFamily: "'Geist', sans-serif", fontWeight: 500, cursor: 'pointer' }}>
                    Reintentar
                  </button>
                  <Link to="/authority/cases" style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#2B5CE6', color: '#fff', fontSize: 12, fontFamily: "'Geist', sans-serif", fontWeight: 500, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
                    Volver
                  </Link>
                </div>
              </div>
            </div>
          </SectionCard>
        </main>
      </div>
    )
  }

  const { caso, media, comentarios } = data
  const photos = media.filter(item => item.tipo === 'foto')
  const video = media.find(item => item.tipo === 'video')
  const mainPhoto = photos.find(item => item.es_principal)?.url ?? caso.foto_principal_url ?? photos[0]?.url ?? null
  const safeLocation = buildApproximateLocation(caso.ciudad, caso.pais)
  const statusMeta = getStatusColor(caso.status)
  const workflowStatus = deriveWorkflowStatus({ workflow_status: caso.workflow_status, status: caso.status })
  const actionAvailability = getCaseActionAvailability(workflowStatus)

  const runWorkflowUpdate = async (
    action: 'approve' | 'reject' | 'reopen' | 'found',
    detail?: string | null,
  ) => {
    if (!user?.id) {
      setFeedback({ type: 'error', message: 'No se pudo identificar a la autoridad.' })
      return
    }

    if (action === 'approve' && !actionAvailability.canApprove) return
    if (action === 'reject' && !actionAvailability.canReject) return
    if (action === 'reopen' && !actionAvailability.canReopen) return
    if (action === 'found' && !actionAvailability.canMarkFound) return

    const nextStatus =
      action === 'approve' ? 'approved'
        : action === 'reject' ? 'rejected'
          : action === 'reopen' ? 'pending'
            : 'closed'

    setActionLoading(action)
    setFeedback(null)
    try {
      await updateCaseWorkflowStatus(caso.id, nextStatus)
      if (action === 'found') {
        await createCaseClosure(caso.id, user.id, detail ?? '')
        // Nota de cierre se guarda solo en cases_closed, no en case_comments.
        await logCaseAction(caso.id, user.id, 'closed')
      } else {
        const logAction = action === 'approve' ? 'approved'
          : action === 'reject' ? 'rejected'
            : 'reopened'
        await logCaseAction(caso.id, user.id, logAction, detail)
      }
      await refetch()
      setFeedback({ type: 'success', message: 'Acción registrada correctamente.' })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo actualizar el caso.'
      setFeedback({ type: 'error', message })
    } finally {
      setActionLoading(null)
    }
  }

  const saveInternalNote = async () => {
    if (!user?.id || !noteText.trim()) return
    setNoteLoading(true)
    try {
      await createCaseComment(caso.id, user.id, noteText.trim())
      await refetch()
      setNoteText('')
      setNoteModalOpen(false)
      setFeedback({ type: 'success', message: 'Nota agregada correctamente.' })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo guardar la nota.'
      setFeedback({ type: 'error', message })
    } finally {
      setNoteLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#F2F4F7', fontFamily: "'Geist', 'Inter', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

        @keyframes fadeUp   { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeIn   { from { opacity:0; } to { opacity:1; } }
        @keyframes slideRight { from { opacity:0; transform:translateX(-12px); } to { opacity:1; transform:translateX(0); } }
        @keyframes dotPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.7)} }

        .cd-scroll::-webkit-scrollbar { width: 5px; }
        .cd-scroll::-webkit-scrollbar-thumb { background: rgba(100,116,139,0.2); border-radius: 999px; }

        .cd-s1 { animation: fadeUp 0.4s ease-out both; }
        .cd-s2 { animation: fadeUp 0.4s ease-out 0.06s both; }
        .cd-s3 { animation: fadeUp 0.4s ease-out 0.12s both; }
        .cd-s4 { animation: fadeUp 0.4s ease-out 0.18s both; }
        .cd-s5 { animation: fadeUp 0.4s ease-out 0.24s both; }
        .cd-s6 { animation: fadeUp 0.4s ease-out 0.30s both; }

        .cd-back {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 12px; font-family: 'Geist', sans-serif; font-weight: 500;
          color: #9CA3AF; text-decoration: none;
          transition: color 0.15s;
          animation: slideRight 0.3s ease-out both;
        }
        .cd-back:hover { color: #2B5CE6; }

        .photo-thumb {
          border-radius: 8px; overflow: hidden; aspect-ratio: 1;
          border: 1px solid #E4E7EC;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .photo-thumb:hover { transform: scale(1.03); box-shadow: 0 8px 24px rgba(0,0,0,0.12); }
        .hero-photo-btn {
          position: absolute; inset: 0; border: none; padding: 0; margin: 0;
          background: transparent; cursor: zoom-in;
        }
        .hero-photo-img {
          width: 100%; height: 100%; object-fit: cover; display: block;
          background: transparent;
        }
        .lightbox-overlay {
          position: fixed; inset: 0; z-index: 60;
          background: rgba(15,23,42,0.6); backdrop-filter: blur(6px);
          display: flex; align-items: center; justify-content: center;
          animation: fadeIn 0.2s ease-out;
        }
        .lightbox-card {
          position: relative;
          max-width: min(92vw, 980px);
          max-height: 85vh;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.18);
          background: rgba(15,23,42,0.6);
          box-shadow: 0 24px 80px rgba(0,0,0,0.35);
          display: flex; align-items: center; justify-content: center;
          padding: 18px;
        }
        .lightbox-img {
          max-width: 100%;
          max-height: 80vh;
          object-fit: contain;
          transform: scale(1);
          transition: transform 0.2s ease;
        }
        .lightbox-card:hover .lightbox-img { transform: scale(1.03); }
        .lightbox-close {
          position: absolute; top: 10px; right: 10px;
          width: 32px; height: 32px; border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.2);
          background: rgba(15,23,42,0.6); color: #fff;
          display: inline-flex; align-items: center; justify-content: center;
          cursor: pointer;
        }

        .cd-action-primary {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 9px 18px; border-radius: 8px;
          background: #2B5CE6; color: #fff;
          font-size: 12px; font-family: 'Geist', sans-serif; font-weight: 500;
          text-decoration: none; border: none; cursor: pointer;
          transition: background 0.15s, box-shadow 0.15s;
        }
        .cd-action-primary:hover { background: #2450CC; box-shadow: 0 4px 14px rgba(43,92,230,0.3); }

        .cd-action-secondary {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 9px 18px; border-radius: 8px;
          background: #fff; color: #374151;
          font-size: 12px; font-family: 'Geist', sans-serif; font-weight: 500;
          text-decoration: none; border: 1px solid #E4E7EC;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .cd-action-secondary:hover { border-color: #CBD5E1; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }

        .cd-action-approve {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 9px 18px; border-radius: 8px;
          background: rgba(5,150,105,0.1); color: #059669;
          font-size: 12px; font-family: 'Geist', sans-serif; font-weight: 600;
          border: 1px solid rgba(5,150,105,0.25);
          cursor: pointer; transition: all 0.15s;
        }
        .cd-action-approve:hover { background: rgba(5,150,105,0.16); }

        .cd-action-reject {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 9px 18px; border-radius: 8px;
          background: rgba(220,38,38,0.08); color: #DC2626;
          font-size: 12px; font-family: 'Geist', sans-serif; font-weight: 600;
          border: 1px solid rgba(220,38,38,0.25);
          cursor: pointer; transition: all 0.15s;
        }
        .cd-action-reject:hover { background: rgba(220,38,38,0.14); }

        .cd-action-found {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 9px 18px; border-radius: 8px;
          background: rgba(2,132,199,0.1); color: #0284C7;
          font-size: 12px; font-family: 'Geist', sans-serif; font-weight: 600;
          border: 1px solid rgba(2,132,199,0.25);
          cursor: pointer; transition: all 0.15s;
        }
        .cd-action-found:hover { background: rgba(2,132,199,0.16); }

        .cd-action-reopen {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 9px 18px; border-radius: 8px;
          background: #fff; color: #374151;
          font-size: 12px; font-family: 'Geist', sans-serif; font-weight: 600;
          border: 1px solid #E4E7EC;
          cursor: pointer; transition: all 0.15s;
        }
        .cd-action-reopen:hover { border-color: #CBD5E1; }

        .cd-modal-overlay {
          position: fixed; inset: 0; z-index: 55;
          background: rgba(17,24,39,0.45); backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center;
          padding: 20px;
          animation: fadeIn 0.2s ease-out;
        }
        .cd-modal-card {
          width: 100%; max-width: 560px;
          background: #fff; border: 1px solid #E4E7EC; border-radius: 14px;
          box-shadow: 0 24px 60px rgba(0,0,0,0.18);
          padding: 24px 26px;
        }
        .cd-modal-actions {
          display: flex; gap: 10px; justify-content: flex-end; margin-top: 18px;
        }
        .cd-modal-input {
          width: 100%; border: 1px solid #E4E7EC; border-radius: 10px;
          padding: 12px 14px; font-size: 13px;
          font-family: 'Geist', sans-serif; resize: vertical; min-height: 120px;
        }
        .cd-feedback {
          padding: 12px 16px; border-radius: 10px; border: 1px solid transparent;
          font-size: 12px; font-family: 'Geist', sans-serif; font-weight: 500;
        }
        .comment-card {
          border: 1px solid #F1F3F5; border-radius: 8px;
          padding: 16px 18px; background: #FAFBFC;
          transition: border-color 0.15s;
        }
        .comment-card:hover { border-color: #E4E7EC; }

        .stat-pill {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 5px 12px; border-radius: 999px;
          background: #F8F9FB; border: 1px solid #E4E7EC;
          font-size: 11px; font-family: 'Geist', sans-serif; font-weight: 500;
          color: #6B7280;
        }
      `}</style>

      <AuthoritySidebar />

      <main className="cd-scroll" style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '36px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* ─── BACK LINK ─── */}
          <Link to="/authority/cases" className="cd-back">
            <ChevronLeft size={14} />
            Volver al listado
          </Link>

          {feedback && (
            <div
              className="cd-feedback"
              style={{
                background: feedback.type === 'success'
                  ? 'rgba(5,150,105,0.08)'
                  : feedback.type === 'error'
                    ? 'rgba(220,38,38,0.08)'
                    : 'rgba(2,132,199,0.08)',
                borderColor: feedback.type === 'success'
                  ? 'rgba(5,150,105,0.2)'
                  : feedback.type === 'error'
                    ? 'rgba(220,38,38,0.2)'
                    : 'rgba(2,132,199,0.2)',
                color: feedback.type === 'success'
                  ? '#059669'
                  : feedback.type === 'error'
                    ? '#DC2626'
                    : '#0284C7',
              }}
            >
              {feedback.message}
            </div>
          )}

          {/* ─── HERO CARD ─── */}
          <SectionCard style={{ overflow: 'hidden' }} >
            <div className="cd-s1" style={{ display: 'grid', gridTemplateColumns: '320px 1fr' }}>

              {/* Photo */}
              <div style={{ position: 'relative', minHeight: 320, background: '#F2F4F7', overflow: 'hidden' }}>
                {mainPhoto ? (
                  <button
                    type="button"
                    className="hero-photo-btn"
                    onClick={() => openLightbox(mainPhoto)}
                    aria-label="Ver foto en tamaño completo"
                  >
                    <img
                      src={mainPhoto}
                      alt={`${caso.nombres} ${caso.apellidos}`}
                      className="hero-photo-img"
                    />
                  </button>
                ) : (
                  <div style={{ height: '100%', minHeight: 320, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                    <div style={{ width: 64, height: 64, borderRadius: 16, background: '#E4E7EC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <UserSearch size={28} style={{ color: '#9CA3AF' }} />
                    </div>
                    <p style={{ fontSize: 12, color: '#9CA3AF', fontFamily: "'JetBrains Mono', monospace" }}>Sin fotografía</p>
                  </div>
                )}
                {/* Photo overlay gradient */}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, background: 'linear-gradient(to top, rgba(0,0,0,0.18), transparent)' }} />
              </div>

              {/* Info */}
              <div style={{ padding: '32px 36px', display: 'flex', flexDirection: 'column', gap: 24 }}>

                {/* Top row */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                  <div>
                    <p style={{
                      fontSize: 10, fontFamily: "'JetBrains Mono', monospace", fontWeight: 500,
                      letterSpacing: '0.28em', textTransform: 'uppercase', color: '#2B5CE6', marginBottom: 8,
                    }}>
                      Caso · {caso.numero_caso}
                    </p>
                    <h1 style={{
                      fontFamily: "'Instrument Serif', Georgia, serif", fontStyle: 'italic',
                      fontSize: 34, color: '#111827', fontWeight: 400, letterSpacing: '-0.03em',
                      lineHeight: 1.1, marginBottom: 0,
                    }}>
                      {caso.nombres}<br />{caso.apellidos}
                    </h1>
                  </div>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 7,
                    padding: '6px 14px', borderRadius: 999,
                    background: statusMeta.bg, border: `1px solid ${statusMeta.border}`,
                    fontSize: 10, fontFamily: "'JetBrains Mono', monospace", fontWeight: 500,
                    letterSpacing: '0.14em', textTransform: 'uppercase', color: statusMeta.color,
                    flexShrink: 0,
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusMeta.dot }} />
                    {formatStatusLabel(caso.status)}
                  </span>
                </div>

                {/* Quick stats */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span className="stat-pill">
                    <User size={11} style={{ color: '#9CA3AF' }} />
                    {caso.edad ? `${caso.edad} años` : 'Edad N/D'}
                  </span>
                  <span className="stat-pill">
                    {caso.genero ?? 'Género N/D'}
                  </span>
                  <span className="stat-pill">
                    <Eye size={11} style={{ color: '#9CA3AF' }} />
                    {caso.vistas ?? 0} vistas
                  </span>
                  <span className="stat-pill">
                    <MapPin size={11} style={{ color: '#9CA3AF' }} />
                    {safeLocation}
                  </span>
                </div>

                {/* Divider */}
                <div style={{ height: 1, background: '#F1F3F5' }} />

                {/* Physical details */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 18 }}>
                  <DataField label="Ojos" value={caso.color_ojos} />
                  <DataField label="Cabello" value={caso.color_cabello} />
                  <DataField label="Ciudad" value={caso.ciudad} />
                  <DataField label="País" value={caso.pais} />
                </div>

                {/* Divider */}
                <div style={{ height: 1, background: '#F1F3F5' }} />

                {/* Date details */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 18 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(43,92,230,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Calendar size={13} style={{ color: '#2B5CE6' }} />
                    </div>
                    <div>
                      <p style={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", color: '#9CA3AF', letterSpacing: '0.2em', textTransform: 'uppercase', margin: '0 0 2px' }}>Fecha desaparición</p>
                      <p style={{ fontSize: 13, color: '#111827', fontWeight: 500, margin: 0, fontFamily: "'Geist', sans-serif" }}>
                        {caso.fecha_desaparicion ?? 'Sin fecha'}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(43,92,230,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Hash size={13} style={{ color: '#2B5CE6' }} />
                    </div>
                    <div>
                      <p style={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", color: '#9CA3AF', letterSpacing: '0.2em', textTransform: 'uppercase', margin: '0 0 2px' }}>Hora aproximada</p>
                      <p style={{ fontSize: 13, color: '#111827', fontWeight: 500, margin: 0, fontFamily: "'Geist', sans-serif" }}>
                        {caso.hora_desaparicion ?? 'No registrada'}
                      </p>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </SectionCard>

          {/* ─── DESCRIPTION + CONTACT ─── */}
          <div className="cd-s2" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16 }}>

            {/* Description */}
            <SectionCard>
              <SectionHeader icon={<MessageSquare size={14} />} title="Descripción y circunstancias" />
              <div style={{ padding: '24px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <DataField label="Descripción general" value={caso.descripcion_general} />
                </div>
                <DataField label="Señas particulares" value={caso.senas_particulares} />
                <DataField label="Circunstancias" value={caso.circunstancias} />
                <DataField label="Ropa al momento" value={caso.ropa_descripcion} />
                <DataField label="Último lugar visto" value={safeLocation} />
              </div>
            </SectionCard>

            {/* Contact */}
            <SectionCard>
              <SectionHeader icon={<Phone size={14} />} title="Contacto" />
              <div style={{ padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                  <span style={{ fontSize: 11, color: '#9CA3AF', fontFamily: "'JetBrains Mono', monospace" }}>Visibilidad:</span>
                  <span style={{
                    fontSize: 10, fontFamily: "'JetBrains Mono', monospace", fontWeight: 500,
                    letterSpacing: '0.14em', textTransform: 'uppercase',
                    color: '#059669', background: 'rgba(5,150,105,0.08)',
                    border: '1px solid rgba(5,150,105,0.2)',
                    padding: '2px 8px', borderRadius: 999,
                  }}>
                    {caso.visibilidad_contacto ?? 'público'}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 9, background: '#F8F9FB', border: '1px solid #F1F3F5' }}>
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(43,92,230,0.08)', border: '1px solid rgba(43,92,230,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Phone size={13} style={{ color: '#2B5CE6' }} />
                    </div>
                    <div>
                      <p style={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", color: '#9CA3AF', letterSpacing: '0.2em', textTransform: 'uppercase', margin: '0 0 3px' }}>Teléfono</p>
                      <p style={{ fontSize: 13, color: caso.telefono_contacto ? '#111827' : '#C4C9D4', fontWeight: 500, margin: 0, fontFamily: "'Geist', sans-serif" }}>
                        {caso.telefono_contacto ?? 'No disponible'}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 9, background: '#F8F9FB', border: '1px solid #F1F3F5' }}>
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(43,92,230,0.08)', border: '1px solid rgba(43,92,230,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Mail size={13} style={{ color: '#2B5CE6' }} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", color: '#9CA3AF', letterSpacing: '0.2em', textTransform: 'uppercase', margin: '0 0 3px' }}>Email</p>
                      <p style={{ fontSize: 13, color: caso.email_contacto ? '#111827' : '#C4C9D4', fontWeight: 500, margin: 0, fontFamily: "'Geist', sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {caso.email_contacto ?? 'No disponible'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </SectionCard>
          </div>

          {/* ─── PERSON HISTORY ─── */}
          <SectionCard className="cd-s3">
            <SectionHeader icon={<User size={14} />} title="Historial de esta persona" />
            <div style={{ padding: '20px 24px' }}>
              {historyLoading ? (
                <p style={{ fontSize: 12, color: '#9CA3AF', fontFamily: "'Geist', sans-serif" }}>Cargando historial...</p>
              ) : personHistory.length === 0 ? (
                <p style={{ fontSize: 12, color: '#9CA3AF', fontFamily: "'Geist', sans-serif" }}>
                  No se encontraron casos anteriores asociados a esta persona.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{
                    padding: '10px 12px', borderRadius: 8,
                    background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
                    color: '#B45309', fontSize: 12, fontFamily: "'Geist', sans-serif", fontWeight: 500,
                  }}>
                    Esta persona tiene {personHistory.length} caso{personHistory.length !== 1 ? 's' : ''} anterior{personHistory.length !== 1 ? 'es' : ''}.
                  </div>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {personHistory.map((item) => (
                      <div key={item.id} style={{
                        display: 'grid', gridTemplateColumns: '1fr 140px 140px', gap: 12,
                        padding: '12px 14px', borderRadius: 8, border: '1px solid #E4E7EC', background: '#FAFBFC',
                      }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: '#2B5CE6' }}>
                            {item.numero_caso}
                          </span>
                          <span style={{ fontSize: 12, color: '#6B7280' }}>
                            {item.created_at ? new Date(item.created_at).toLocaleDateString('es-DO') : 'Sin fecha'}
                          </span>
                        </div>
                        <span style={{ fontSize: 12, color: '#374151', fontWeight: 600 }}>
                          {formatWorkflowStatus(item.workflow_status)}
                        </span>
                        <Link to={`/authority/cases/${item.id}`} className="cd-action-secondary" style={{ justifyContent: 'center', padding: '6px 10px', fontSize: 11 }}>
                          Ver detalle
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </SectionCard>

          {/* ─── ACTIONS ─── */}
          <SectionCard className="cd-s4">
            <div style={{ padding: '22px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: '0 0 4px', fontFamily: "'Geist', sans-serif" }}>Acciones del caso</p>
                <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0 }}>
                  Aporta información o reporta contenido relacionado con este caso.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {actionAvailability.canApprove && (
                  <button
                    type="button"
                    className="cd-action-approve"
                    onClick={() => setConfirmAction('approve')}
                    disabled={actionLoading !== null}
                  >
                    Aprobar
                  </button>
                )}
                {actionAvailability.canReject && (
                  <button
                    type="button"
                    className="cd-action-reject"
                    onClick={() => setConfirmAction('reject')}
                    disabled={actionLoading !== null}
                  >
                    Rechazar
                  </button>
                )}
                {actionAvailability.canMarkFound && (
                  <button
                    type="button"
                    className="cd-action-found"
                    onClick={() => { setFoundDetails(''); setFoundModalOpen(true) }}
                    disabled={actionLoading !== null}
                  >
                    Marcar como encontrado
                  </button>
                )}
                {actionAvailability.canMarkFound && (
                  <button
                    type="button"
                    className="cd-action-secondary"
                    onClick={() => setNoteModalOpen(true)}
                    disabled={noteLoading || actionLoading !== null}
                  >
                    Añadir nota
                  </button>
                )}
                {actionAvailability.canReopen && (
                  <button
                    type="button"
                    className="cd-action-reopen"
                    onClick={() => setConfirmAction('reopen')}
                    disabled={actionLoading !== null}
                  >
                    Reabrir caso
                  </button>
                )}
              </div>
            </div>
          </SectionCard>

          {/* ─── COMMENTS ─── */}
          <SectionCard className="cd-s4">
            <SectionHeader
              icon={<MessageSquare size={14} />}
              title="Comentarios de autoridad"
              count={comentarios.length}
            />
            <div style={{ padding: '20px 24px' }}>
              {comentarios.length === 0 ? (
                <div style={{ padding: '24px 0', textAlign: 'center' }}>
                  <p style={{ fontSize: 13, color: '#9CA3AF', fontFamily: "'Geist', sans-serif" }}>
                    Aún no hay comentarios de la autoridad para este caso.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {comentarios.map((comentario, idx) => (
                    <article
                      key={comentario.id}
                      className="comment-card"
                      style={{ animationDelay: `${idx * 40}ms`, animation: 'fadeUp 0.35s ease-out both' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 28, height: 28, borderRadius: 999, background: 'rgba(43,92,230,0.1)', border: '1px solid rgba(43,92,230,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <User size={12} style={{ color: '#2B5CE6' }} />
                          </div>
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: 0, fontFamily: "'Geist', sans-serif" }}>{comentario.autor}</p>
                            {comentario.estado && (
                              <span style={{
                                fontSize: 9, fontFamily: "'JetBrains Mono', monospace", fontWeight: 500,
                                letterSpacing: '0.14em', textTransform: 'uppercase',
                                color: '#2B5CE6', background: 'rgba(43,92,230,0.07)',
                                border: '1px solid rgba(43,92,230,0.15)',
                                padding: '1px 6px', borderRadius: 999, marginTop: 3, display: 'inline-block',
                              }}>
                                {formatEstado(comentario.estado)}
                              </span>
                            )}
                          </div>
                        </div>
                        <p style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: '#9CA3AF', flexShrink: 0, marginTop: 3 }}>
                          {formatDateTime(comentario.created_at)}
                        </p>
                      </div>
                      <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.65, margin: 0, whiteSpace: 'pre-wrap', fontFamily: "'Geist', sans-serif", paddingLeft: 38 }}>
                        {formatCommentContent(comentario.contenido)}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </SectionCard>

          {/* ─── MEDIA ─── */}
          {(photos.length > 0 || video) && (
            <SectionCard className="cd-s5">
              <SectionHeader icon={<Eye size={14} />} title="Fotografías y video" count={photos.length + (video ? 1 : 0)} />
              <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

                {photos.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 }}>
                    {photos.map((photo) => (
                      <button
                        key={photo.id}
                        type="button"
                        onClick={() => openLightbox(photo.url)}
                        className="photo-thumb"
                        style={{ display: 'block', cursor: 'zoom-in', background: 'transparent', padding: 0 }}
                        aria-label="Ver foto ampliada"
                      >
                        <img src={photo.url} alt="Foto del caso" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      </button>
                    ))}
                  </div>
                )}

                {video && (
                  <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid #E4E7EC', background: '#000' }}>
                    <div style={{ padding: '12px 16px', background: '#F8F9FB', borderBottom: '1px solid #E4E7EC', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Video size={13} style={{ color: '#2B5CE6' }} />
                      <p style={{ fontSize: 12, fontWeight: 500, color: '#374151', margin: 0, fontFamily: "'Geist', sans-serif" }}>Video del caso</p>
                    </div>
                    <video controls style={{ width: '100%', display: 'block', maxHeight: 400 }}>
                      <source src={video.url} type={video.mime_type ?? 'video/mp4'} />
                    </video>
                  </div>
                )}
              </div>
            </SectionCard>
          )}

          {photos.length === 0 && !video && (
            <SectionCard className="cd-s5">
              <div style={{ padding: '32px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 44, height: 44, borderRadius: 11, background: '#F8F9FB', border: '1px solid #E4E7EC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Eye size={18} style={{ color: '#C4C9D4' }} />
                </div>
                <p style={{ fontSize: 13, color: '#9CA3AF', fontFamily: "'Geist', sans-serif" }}>No hay imágenes o video cargados para este caso.</p>
              </div>
            </SectionCard>
          )}

        </div>
      </main>

      {confirmAction && (
        <div className="cd-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setConfirmAction(null) }}>
          <div className="cd-modal-card">
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#111827', fontFamily: "'Geist', sans-serif" }}>
              {confirmAction === 'approve' && 'Confirmar aprobación'}
              {confirmAction === 'reject' && 'Confirmar rechazo'}
              {confirmAction === 'reopen' && 'Confirmar reapertura'}
            </h3>
            <p style={{ fontSize: 12, color: '#6B7280', marginTop: 6, lineHeight: 1.6 }}>
              {confirmAction === 'approve' && 'Este caso pasará a estado aprobado.'}
              {confirmAction === 'reject' && 'El caso quedará rechazado y no podrá aprobarse nuevamente.'}
              {confirmAction === 'reopen' && 'El caso volverá a estado pendiente para revisión.'}
            </p>
            <div className="cd-modal-actions">
              <button
                type="button"
                className="cd-action-secondary"
                onClick={() => setConfirmAction(null)}
                disabled={actionLoading !== null}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={confirmAction === 'approve' ? 'cd-action-approve' : confirmAction === 'reject' ? 'cd-action-reject' : 'cd-action-reopen'}
                onClick={async () => {
                  const action = confirmAction
                  setConfirmAction(null)
                  await runWorkflowUpdate(action)
                }}
                disabled={actionLoading !== null}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {foundModalOpen && (
        <div className="cd-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setFoundModalOpen(false) }}>
          <div className="cd-modal-card">
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#111827', fontFamily: "'Geist', sans-serif" }}>
              Marcar como encontrado
            </h3>
            <p style={{ fontSize: 12, color: '#6B7280', marginTop: 6, lineHeight: 1.6 }}>
              Describe brevemente cómo fue encontrado el desaparecido. Esta nota quedará en el historial del caso.
            </p>
            <textarea
              value={foundDetails}
              onChange={(e) => setFoundDetails(e.target.value)}
              className="cd-modal-input"
              placeholder="Ej: Hallado en su domicilio tras seguimiento de cámaras..."
            />
            <div className="cd-modal-actions">
              <button
                type="button"
                className="cd-action-secondary"
                onClick={() => setFoundModalOpen(false)}
                disabled={actionLoading !== null}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="cd-action-found"
                disabled={actionLoading !== null || !foundDetails.trim()}
                onClick={async () => {
                  const detail = foundDetails.trim()
                  setFoundModalOpen(false)
                  setFoundDetails('')
                  await runWorkflowUpdate('found', detail)
                }}
              >
                Cerrar caso
              </button>
            </div>
          </div>
        </div>
      )}

      {noteModalOpen && (
        <div className="cd-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setNoteModalOpen(false) }}>
          <div className="cd-modal-card">
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#111827', fontFamily: "'Geist', sans-serif" }}>
              Añadir nota interna
            </h3>
            <p style={{ fontSize: 12, color: '#6B7280', marginTop: 6, lineHeight: 1.6 }}>
              Esta nota es privada para la autoridad y quedará registrada en el caso.
            </p>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              className="cd-modal-input"
              placeholder="Escribe una nota interna..."
            />
            <div className="cd-modal-actions">
              <button
                type="button"
                className="cd-action-secondary"
                onClick={() => setNoteModalOpen(false)}
                disabled={noteLoading}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="cd-action-primary"
                disabled={noteLoading || !noteText.trim()}
                onClick={() => void saveInternalNote()}
              >
                Guardar nota
              </button>
            </div>
          </div>
        </div>
      )}

      {lightboxOpen && lightboxSrc && (
        <div
          className="lightbox-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setLightboxOpen(false) }}
          aria-hidden="true"
        >
          <div className="lightbox-card">
            <button
              type="button"
              className="lightbox-close"
              onClick={() => setLightboxOpen(false)}
              aria-label="Cerrar imagen"
            >
              <X size={16} />
            </button>
            <img src={lightboxSrc} alt="Foto ampliada" className="lightbox-img" />
          </div>
        </div>
      )}
    </div>
  )
}
