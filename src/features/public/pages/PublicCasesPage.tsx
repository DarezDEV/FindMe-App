import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, Calendar, Search, RefreshCw, Link2, Share2 } from 'lucide-react'
import { Alert, Spinner, StatusBadge, type WorkflowStatus } from '../../../shared/components/ui'
import { handleError } from '../../../shared/utils/handleError'
import {
  createCaseComment,
  getAuthorityCases,
  getCaseComments,
  getProfilesBasicByIds,
  normalizeAuthorityCaseRow,
  normalizeCaseCommentRow,
  type AuthorityCaseRow,
  type CaseCommentRow,
} from '../../../lib/supabase/db'
import { useRealtimeCaseComments } from '../../cases/hooks/useRealtimeCaseComments'
import { useRealtimeCases } from '../../cases/hooks/useRealtimeCases'
import { useAuth } from '../../auth/hooks'
import { reportarComentarioPublico } from '../../user/services/reportes'

type PublicFilter = 'all' | WorkflowStatus
type SocialNetwork = 'whatsapp' | 'facebook' | 'x'

interface PublicComment {
  id: string
  caseId: string
  authorId: string
  text: string
  createdAt: string
}

interface NoticeState {
  type: 'error' | 'success' | 'warning' | 'info'
  message: string
}

const PUBLIC_COMMENT_PREFIX = '[PUBLICO]'

function getLocation(caso: AuthorityCaseRow): string {
  return caso.ciudad || caso.estado_provincia || 'Ubicacion reservada'
}

function getDateLabel(caso: AuthorityCaseRow): string {
  const sourceDate = caso.fecha_desaparicion || caso.created_at
  const parsed = new Date(sourceDate)
  if (Number.isNaN(parsed.getTime())) return 'Fecha no disponible'
  return new Intl.DateTimeFormat('es-DO', { day: '2-digit', month: 'short', year: 'numeric' }).format(parsed)
}

function getWorkflowStatus(caso: AuthorityCaseRow): WorkflowStatus | null {
  if (caso.workflow_status) {
    if (caso.workflow_status === 'rejected') return null
    if (caso.workflow_status === 'found') return null
    if (caso.workflow_status === 'closed') return null
    return caso.workflow_status
  }

  // Backward compatibility for datasets that still use only `status`.
  if (caso.status === 'resuelto') return null
  if (caso.status === 'cerrado') return null
  if (caso.status === 'activo' || caso.status === 'en_proceso') return 'approved'
  return null
}

function isCommentEnabled(workflowStatus: WorkflowStatus) {
  return workflowStatus === 'approved'
}

function toPublicComment(row: CaseCommentRow): PublicComment | null {
  const rawText = row.comentario.trim()
  if (!rawText.toUpperCase().startsWith(PUBLIC_COMMENT_PREFIX)) {
    return null
  }

  const text = rawText.slice(PUBLIC_COMMENT_PREFIX.length).trim()
  if (!text) return null

  return {
    id: row.id,
    caseId: row.caso_id,
    authorId: row.autor_id,
    text,
    createdAt: row.created_at,
  }
}

function groupPublicComments(rows: CaseCommentRow[]) {
  const grouped: Record<string, PublicComment[]> = {}

  rows.forEach((row) => {
    const publicComment = toPublicComment(row)
    if (!publicComment) return
    if (!grouped[publicComment.caseId]) grouped[publicComment.caseId] = []
    grouped[publicComment.caseId].push(publicComment)
  })

  return grouped
}

function formatCommentDate(value: string) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'Reciente'
  return new Intl.DateTimeFormat('es-DO', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed)
}

function getCommentAuthorLabel(authorId: string, currentUserId: string | undefined) {
  if (currentUserId && authorId === currentUserId) return 'Tu'
  return `Usuario ${authorId.slice(0, 8)}`
}

function buildCaseShareUrl(caseId: string) {
  if (typeof window === 'undefined') return `/cases?caseId=${caseId}`
  const url = new URL('/cases', window.location.origin)
  url.searchParams.set('caseId', caseId)
  return url.toString()
}

function buildShareText(item: AuthorityCaseRow) {
  return `Ayuda a difundir el caso ${item.numero_caso}: ${item.nombres} ${item.apellidos}.`
}

function buildSocialShareUrl(network: SocialNetwork, url: string, text: string) {
  if (network === 'whatsapp') {
    return `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`
  }
  if (network === 'facebook') {
    return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
  }
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`
}

export default function PublicCasesPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<PublicFilter>('all')
  const [rows, setRows] = useState<AuthorityCaseRow[]>([])
  const [commentsByCaseId, setCommentsByCaseId] = useState<Record<string, PublicComment[]>>({})
  const [commentDraftByCaseId, setCommentDraftByCaseId] = useState<Record<string, string>>({})
  const [submittingCommentCaseId, setSubmittingCommentCaseId] = useState<string | null>(null)
  const [notice, setNotice] = useState<NoticeState | null>(null)
  const [highlightCaseId, setHighlightCaseId] = useState<string | null>(null)
  const [commentAuthorById, setCommentAuthorById] = useState<Record<string, string>>({})
  const [reportingCommentId, setReportingCommentId] = useState<string | null>(null)

  const loadCases = useCallback(async () => {
    setLoading(true)
    setError(null)
    setNotice(null)

    try {
      const data = await getAuthorityCases({ limit: 200 })
      const publicRows = data.filter((item) => {
        const status = getWorkflowStatus(item)
        if (!status) return false
        return status === 'approved' || status === 'found' || status === 'closed'
      })

      let commentMap: Record<string, PublicComment[]> = {}
      if (publicRows.length > 0) {
        try {
          const comments = await getCaseComments(publicRows.map((item) => item.id))
          commentMap = groupPublicComments(comments)
        } catch (error) {
          handleError('PublicCasesPage.getCaseComments', error, {
            fallbackMessage: 'No se pudieron cargar los comentarios del caso.',
            toast: false,
          })
          commentMap = {}
        }
      }

      setRows(publicRows)
      setCommentsByCaseId(commentMap)

      const authorIds = Object.values(commentMap)
        .flat()
        .map((comment) => comment.authorId)
        .filter(Boolean)
      if (authorIds.length > 0) {
        try {
          const profiles = await getProfilesBasicByIds(authorIds)
          const mapped: Record<string, string> = {}
          profiles.forEach((profile) => {
            const fullName = [profile.name, profile.last_name].filter(Boolean).join(' ').trim()
            mapped[profile.id] = fullName || profile.email || `Usuario ${profile.id.slice(0, 8)}`
          })
          setCommentAuthorById(mapped)
        } catch (error) {
          handleError('PublicCasesPage.getProfilesBasicByIds', error, {
            fallbackMessage: 'No se pudieron cargar los autores de comentarios.',
            toast: false,
          })
          setCommentAuthorById({})
        }
      } else {
        setCommentAuthorById({})
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudieron cargar los casos.'
      setError(message)
      setRows([])
      setCommentsByCaseId({})
      setCommentAuthorById({})
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadCases()
  }, [loadCases])

  useRealtimeCases({
    onEvent: (payload) => {
      const caseId = payload.new.id || payload.old.id
      if (!caseId) return

      const nextRow = normalizeAuthorityCaseRow(payload.new)
      const nextStatus = nextRow ? getWorkflowStatus(nextRow) : null
      const shouldShow =
        payload.eventType !== 'DELETE' &&
        payload.new.eliminado !== true &&
        nextRow !== null &&
        Boolean(nextStatus) &&
        (nextStatus === 'approved' || nextStatus === 'found' || nextStatus === 'closed')

      setRows((prev) => {
        if (!shouldShow || !nextRow) {
          return prev.filter((item) => item.id !== caseId)
        }

        return [...prev.filter((item) => item.id !== caseId), nextRow].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        )
      })
    },
  })

  useRealtimeCaseComments({
    onEvent: (payload) => {
      const caseId = payload.new.caso_id || payload.old.caso_id
      if (!caseId) return
      if (!rows.some((item) => item.id === caseId)) return

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
      const nextComment = toPublicComment(normalized)

      setCommentsByCaseId((prev) => {
        if (!nextComment) {
          return {
            ...prev,
            [caseId]: (prev[caseId] ?? []).filter((item) => item.id !== normalized.id),
          }
        }

        const currentList = prev[caseId] ?? []
        const nextList = [...currentList.filter((item) => item.id !== nextComment.id), nextComment].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        )

        return {
          ...prev,
          [caseId]: nextList,
        }
      })
    },
  })

  // Scroll y resaltado del caso compartido por URL (?caseId=...)
  useEffect(() => {
    if (typeof window === 'undefined' || rows.length === 0) return

    const sharedCaseId = new URLSearchParams(window.location.search).get('caseId')
    if (!sharedCaseId) return
    if (!rows.some((row) => row.id === sharedCaseId)) return

    setHighlightCaseId(sharedCaseId)
    const scrollTimer = window.setTimeout(() => {
      const element = document.getElementById(`public-case-${sharedCaseId}`)
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 80)

    const clearTimer = window.setTimeout(() => {
      setHighlightCaseId((current) => (current === sharedCaseId ? null : current))
    }, 2500)

    return () => {
      window.clearTimeout(scrollTimer)
      window.clearTimeout(clearTimer)
    }
  }, [rows])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()

    return rows.filter((item) => {
      const workflowStatus = getWorkflowStatus(item)
      if (!workflowStatus) return false

      const statusMatch = filter === 'all' ? true : workflowStatus === filter
      if (!statusMatch) return false

      if (!term) return true

      const fullName = `${item.nombres} ${item.apellidos}`.toLowerCase()
      return (
        fullName.includes(term) ||
        item.numero_caso.toLowerCase().includes(term) ||
        getLocation(item).toLowerCase().includes(term)
      )
    })
  }, [filter, rows, search])

  const copyShareLink = useCallback(async (item: AuthorityCaseRow) => {
    const shareUrl = buildCaseShareUrl(item.id)

    if (!navigator.clipboard?.writeText) {
      setNotice({ type: 'info', message: `Enlace para compartir: ${shareUrl}` })
      return
    }

    try {
      await navigator.clipboard.writeText(shareUrl)
      setNotice({ type: 'success', message: 'Enlace copiado al portapapeles.' })
    } catch (error) {
      handleError('PublicCasesPage.copyShareLink', error, {
        fallbackMessage: 'No se pudo copiar el enlace. Intenta de nuevo.',
        toast: false,
      })
      setNotice({ type: 'warning', message: 'No se pudo copiar automaticamente. Intenta de nuevo.' })
    }
  }, [])

  const shareCase = useCallback(
    async (item: AuthorityCaseRow) => {
      const shareUrl = buildCaseShareUrl(item.id)
      const text = buildShareText(item)

      if (typeof navigator.share === 'function') {
        try {
          await navigator.share({
            title: `FindMe - ${item.numero_caso}`,
            text,
            url: shareUrl,
          })
          return
        } catch (shareError) {
          if (shareError instanceof DOMException && shareError.name === 'AbortError') {
            return
          }
        }
      }

      await copyShareLink(item)
    },
    [copyShareLink]
  )

  const shareOnSocial = useCallback((network: SocialNetwork, item: AuthorityCaseRow) => {
    const shareUrl = buildCaseShareUrl(item.id)
    const text = buildShareText(item)
    const socialUrl = buildSocialShareUrl(network, shareUrl, text)
    window.open(socialUrl, '_blank', 'noopener,noreferrer')
  }, [])

  const submitPublicComment = useCallback(
    async (item: AuthorityCaseRow) => {
      const workflowStatus = getWorkflowStatus(item)
      if (!workflowStatus || !isCommentEnabled(workflowStatus)) {
        setNotice({ type: 'warning', message: 'Los comentarios solo estan habilitados en publicaciones activas.' })
        return
      }

      if (!user?.id) {
        setNotice({ type: 'warning', message: 'Inicia sesion para comentar en publicaciones activas.' })
        return
      }

      const draft = (commentDraftByCaseId[item.id] ?? '').trim()
      if (draft.length < 3) {
        setNotice({ type: 'warning', message: 'Escribe un comentario de al menos 3 caracteres.' })
        return
      }

      setSubmittingCommentCaseId(item.id)
      try {
        const payload = `${PUBLIC_COMMENT_PREFIX} ${draft}`
        const created = await createCaseComment(item.id, user.id, payload)
        const newComment: PublicComment = {
          id: created.id,
          caseId: item.id,
          authorId: user.id,
          text: draft,
          createdAt: new Date().toISOString(),
        }

        setCommentsByCaseId((prev) => ({
          ...prev,
          [item.id]: [...(prev[item.id] ?? []), newComment],
        }))
        if (user?.id) {
          const displayName = [user.name, user.last_nmae].filter(Boolean).join(' ').trim()
          if (displayName) {
            setCommentAuthorById((prev) => ({
              ...prev,
              [user.id]: displayName,
            }))
          }
        }
        setCommentDraftByCaseId((prev) => ({ ...prev, [item.id]: '' }))
        setNotice({ type: 'success', message: 'Comentario publicado.' })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'No se pudo publicar el comentario.'
        setNotice({ type: 'error', message })
      } finally {
        setSubmittingCommentCaseId(null)
      }
    },
    [commentDraftByCaseId, user?.id, user?.name, user?.last_nmae]
  )

  const reportPublicComment = useCallback(
    async (caseId: string, comment: PublicComment) => {
      setNotice(null)
      if (!user?.id) {
        setNotice({ type: 'warning', message: 'Inicia sesion para reportar comentarios.' })
        return
      }

      const motivo = window.prompt('Motivo del reporte (ej: acoso, datos personales).')?.trim() ?? ''
      if (!motivo) return

      const detalle = window.prompt('Detalle adicional (opcional).')?.trim() ?? ''

      setReportingCommentId(comment.id)
      try {
        await reportarComentarioPublico({
          casoId: caseId,
          comentarioId: comment.id,
          motivo,
          descripcion: detalle,
          comentarioTexto: comment.text,
        })
        setNotice({ type: 'success', message: 'Comentario reportado. Gracias por ayudarnos.' })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'No se pudo reportar el comentario.'
        setNotice({ type: 'error', message })
      } finally {
        setReportingCommentId(null)
      }
    },
    [user?.id]
  )

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between gap-4">
          <Link to="/" className="inline-flex items-center gap-2">
            <img src="/findMeLogo.svg" alt="FindMe" className="h-8 w-8" />
            <span className="font-semibold">FindMe</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/login" className="btn-secondary !px-4 !py-2">
              Iniciar sesion
            </Link>
            <Link to="/register" className="btn-primary !px-4 !py-2">
              Registro
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 md:px-6 py-8 space-y-4">
        <div className="card p-6">
          <h1 className="text-2xl font-bold text-text-primary">Casos visibles para la comunidad</h1>
          <p className="text-sm text-text-secondary mt-1">
            Consulta publica de casos aprobados para difusion y apoyo ciudadano.
          </p>
        </div>

        <div className="card p-4 md:p-5 space-y-4">
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <label className="relative block">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre, numero de caso o zona"
                className="input-field pl-9"
              />
            </label>
            <button type="button" onClick={() => void loadCases()} className="btn-secondary inline-flex items-center gap-2">
              <RefreshCw size={14} />
              Recargar
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { value: 'all', label: 'Todos' },
              { value: 'approved', label: 'Publicadas' },
              { value: 'found', label: 'Reunificadas' },
              { value: 'closed', label: 'Archivadas' },
            ].map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setFilter(item.value as PublicFilter)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                  filter === item.value ? 'bg-primary-soft text-primary border-primary/20' : 'bg-card border-border'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {error && <Alert type="error" message={error} />}
        {notice && <Alert type={notice.type} message={notice.message} />}

        <section className="space-y-3">
          {loading ? (
            <div className="card p-10 flex items-center justify-center">
              <Spinner size="lg" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="card p-8 text-center">
              <p className="text-text-secondary text-sm">No hay casos disponibles con los filtros seleccionados.</p>
            </div>
          ) : (
            filtered.map((item) => {
              const workflowStatus = getWorkflowStatus(item)
              if (!workflowStatus) return null

              const comments = commentsByCaseId[item.id] ?? []
              const latestComments = comments.slice(-4)
              const commentEnabled = isCommentEnabled(workflowStatus)
              const commentDraft = commentDraftByCaseId[item.id] ?? ''
              const savingComment = submittingCommentCaseId === item.id

              return (
                <article
                  id={`public-case-${item.id}`}
                  key={item.id}
                  className={`card p-5 transition-colors ${
                    highlightCaseId === item.id ? 'border-primary/40 bg-primary-soft/20' : ''
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-primary tracking-wide uppercase">{item.numero_caso}</p>
                      <h2 className="text-lg font-semibold text-text-primary">
                        {item.nombres} {item.apellidos}
                      </h2>
                    </div>
                    <StatusBadge status={workflowStatus} />
                  </div>

                  <div className="mt-3 grid gap-2 text-sm text-text-secondary md:grid-cols-2">
                    <p className="inline-flex items-center gap-2">
                      <MapPin size={14} />
                      {getLocation(item)}
                    </p>
                    <p className="inline-flex items-center gap-2">
                      <Calendar size={14} />
                      {getDateLabel(item)}
                    </p>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void copyShareLink(item)}
                      className="px-3 py-1.5 rounded-md text-xs font-medium border border-border bg-card hover:bg-primary-soft/40 inline-flex items-center gap-1.5"
                    >
                      <Link2 size={13} />
                      Copiar enlace
                    </button>
                    <button
                      type="button"
                      onClick={() => void shareCase(item)}
                      className="px-3 py-1.5 rounded-md text-xs font-medium border border-border bg-card hover:bg-primary-soft/40 inline-flex items-center gap-1.5"
                    >
                      <Share2 size={13} />
                      Compartir
                    </button>
                    <button
                      type="button"
                      onClick={() => shareOnSocial('whatsapp', item)}
                      className="px-3 py-1.5 rounded-md text-xs font-medium border border-border bg-card hover:bg-primary-soft/40"
                    >
                      WhatsApp
                    </button>
                    <button
                      type="button"
                      onClick={() => shareOnSocial('x', item)}
                      className="px-3 py-1.5 rounded-md text-xs font-medium border border-border bg-card hover:bg-primary-soft/40"
                    >
                      X
                    </button>
                    <button
                      type="button"
                      onClick={() => shareOnSocial('facebook', item)}
                      className="px-3 py-1.5 rounded-md text-xs font-medium border border-border bg-card hover:bg-primary-soft/40"
                    >
                      Facebook
                    </button>
                  </div>

                  <div className="mt-4 border-t border-border pt-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold text-text-primary">Comentarios publicos</h3>
                      <span className="text-xs text-text-secondary">{comments.length}</span>
                    </div>

                    {latestComments.length === 0 ? (
                      <p className="text-xs text-text-secondary">Aun no hay comentarios publicos para este caso.</p>
                    ) : (
                      <div className="space-y-2">
                        {latestComments.map((comment) => (
                          <article key={comment.id} className="rounded-md border border-border bg-background px-3 py-2">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-semibold text-text-primary">
                                {commentAuthorById[comment.authorId] ?? getCommentAuthorLabel(comment.authorId, user?.id)}
                              </p>
                              <p className="text-[11px] text-text-secondary">{formatCommentDate(comment.createdAt)}</p>
                            </div>
                            <p className="text-sm text-text-primary mt-1 whitespace-pre-wrap">{comment.text}</p>
                            <div className="mt-2 flex justify-end">
                              <button
                                type="button"
                                onClick={() => void reportPublicComment(item.id, comment)}
                                className="text-[11px] text-text-secondary hover:text-primary"
                                disabled={reportingCommentId === comment.id}
                              >
                                {reportingCommentId === comment.id ? 'Reportando...' : 'Reportar'}
                              </button>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}

                    {commentEnabled ? (
                      <div className="space-y-2">
                        <textarea
                          rows={3}
                          value={commentDraft}
                          onChange={(event) =>
                            setCommentDraftByCaseId((prev) => ({ ...prev, [item.id]: event.target.value.slice(0, 300) }))
                          }
                          placeholder={user ? 'Escribe un comentario de apoyo o informacion util...' : 'Inicia sesion para comentar'}
                          className="input-field resize-none"
                          disabled={!user || savingComment}
                        />
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[11px] text-text-secondary">{commentDraft.length}/300</p>
                          <button
                            type="button"
                            onClick={() => void submitPublicComment(item)}
                            className="btn-primary !px-4 !py-2 text-xs"
                            disabled={!user || !commentDraft.trim() || savingComment}
                          >
                            {savingComment ? 'Publicando...' : 'Comentar'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-text-secondary">
                        Comentarios cerrados: solo se permite comentar en publicaciones activas.
                      </p>
                    )}
                  </div>
                </article>
              )
            })
          )}
        </section>
      </main>
    </div>
  )
}
