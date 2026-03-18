import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronLeft, Eye, Link2, Mail, MapPin, MessageSquare, MoreVertical, Phone, Share2, UserSearch, Video } from 'lucide-react'
import UserNavbar from '../components/Usernavbar'
import { Alert, Spinner } from '../../../shared/components/ui'
import { createCaseComment, getCaseComments, getProfilesBasicByIds, type CaseCommentRow } from '../../../lib/supabase/db'
import { useAuth } from '../../auth/hooks'
import { useCasoDetalle } from '../hooks/useMisCasos'

function LabelValue({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">{label}</p>
      <p className="text-sm text-text-primary mt-1">{value ?? 'No disponible'}</p>
    </div>
  )
}

function formatDateTime(value: string | null) {
  if (!value) return 'Sin fecha'

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value

  return parsed.toLocaleString('es-DO', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatEstado(value: string | null) {
  if (!value) return null
  return value.replace(/_/g, ' ')
}

function formatStatusLabel(status: string) {
  if (status === 'encontrado') return 'Reunificada'
  if (status === 'cerrado') return 'Archivada'
  return 'Publicada'
}

function buildApproximateLocation(city: string | null, country: string | null) {
  const parts = [city, country].filter((part): part is string => Boolean(part?.trim()))
  return parts.length > 0 ? parts.join(', ') : 'Ubicacion reservada'
}

type ShareNetwork = 'whatsapp' | 'facebook' | 'x'
type NoticeType = 'error' | 'success' | 'warning' | 'info'

interface PublicComment {
  id: string
  caseId: string
  authorId: string
  text: string
  createdAt: string
}

const PUBLIC_COMMENT_PREFIX = '[PUBLICO]'

function buildCaseShareUrl(caseId: string) {
  if (typeof window === 'undefined') return `/cases?caseId=${caseId}`
  const url = new URL('/cases', window.location.origin)
  url.searchParams.set('caseId', caseId)
  return url.toString()
}

function buildShareText(caseNumber: string, fullName: string) {
  return `Ayuda a difundir el caso ${caseNumber}: ${fullName}.`
}

function buildSocialShareUrl(network: ShareNetwork, url: string, text: string) {
  if (network === 'whatsapp') {
    return `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`
  }
  if (network === 'facebook') {
    return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
  }
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`
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

function formatPublicCommentDate(value: string) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'Reciente'
  return new Intl.DateTimeFormat('es-DO', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed)
}

function getPublicCommentAuthorLabel(authorId: string, currentUserId: string | undefined) {
  if (currentUserId && authorId === currentUserId) return 'Tu'
  return `Usuario ${authorId.slice(0, 8)}`
}

function isPublicCommentEnabled(workflowStatus: string | null) {
  return workflowStatus === 'approved'
}

export default function CasoDetallePage() {
  const { user } = useAuth()
  const [shareNotice, setShareNotice] = useState<{ type: NoticeType; message: string } | null>(null)
  const [commentNotice, setCommentNotice] = useState<{ type: NoticeType; message: string } | null>(null)
  const [actionsOpen, setActionsOpen] = useState(false)
  const actionsMenuRef = useRef<HTMLDivElement | null>(null)
  const { id = '' } = useParams<{ id: string }>()
  const { data, isLoading, isError, error, refetch } = useCasoDetalle(id)
  const [publicComments, setPublicComments] = useState<PublicComment[]>([])
  const [publicCommentDraft, setPublicCommentDraft] = useState('')
  const [publicCommentsLoading, setPublicCommentsLoading] = useState(false)
  const [publicCommentsError, setPublicCommentsError] = useState<string | null>(null)
  const [publicCommentSubmitting, setPublicCommentSubmitting] = useState(false)
  const [commentAuthorById, setCommentAuthorById] = useState<Record<string, string>>({})

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node | null
      if (actionsMenuRef.current?.contains(target ?? null)) return
      setActionsOpen(false)
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  useEffect(() => {
    if (!data?.caso?.id) return

    const loadPublicComments = async () => {
      setPublicCommentsLoading(true)
      setPublicCommentsError(null)
      try {
        const rows = await getCaseComments([data.caso.id])
        const mapped = rows.map(toPublicComment).filter((entry): entry is PublicComment => entry !== null)
        setPublicComments(mapped)

        const authorityAuthorIds = data.comentarios
          .map((entry) => entry.autor_id)
          .filter((value): value is string => Boolean(value))
        const publicAuthorIds = mapped.map((entry) => entry.authorId)
        const uniqueAuthors = Array.from(new Set([...authorityAuthorIds, ...publicAuthorIds]))
        if (uniqueAuthors.length > 0) {
          try {
            const profiles = await getProfilesBasicByIds(uniqueAuthors)
            const profileMap: Record<string, string> = {}
            profiles.forEach((profile) => {
              const fullName = [profile.name, profile.last_name].filter(Boolean).join(' ').trim()
              profileMap[profile.id] = fullName || profile.email || `Usuario ${profile.id.slice(0, 8)}`
            })
            setCommentAuthorById(profileMap)
          } catch {
            setCommentAuthorById({})
          }
        } else {
          setCommentAuthorById({})
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'No se pudieron cargar los comentarios.'
        setPublicCommentsError(message)
        setPublicComments([])
        setCommentAuthorById({})
      } finally {
        setPublicCommentsLoading(false)
      }
    }

    void loadPublicComments()
  }, [data?.caso?.id, data?.comentarios])

  useEffect(() => {
    if (!data?.comentarios?.length) return
    const authorityAuthorIds = data.comentarios
      .map((entry) => entry.autor_id)
      .filter((value): value is string => Boolean(value))
    const uniqueAuthors = Array.from(new Set(authorityAuthorIds))
    if (uniqueAuthors.length === 0) return
    void getProfilesBasicByIds(uniqueAuthors)
      .then((profiles) => {
        const profileMap: Record<string, string> = {}
        profiles.forEach((profile) => {
          const fullName = [profile.name, profile.last_name].filter(Boolean).join(' ').trim()
          profileMap[profile.id] = fullName || profile.email || `Usuario ${profile.id.slice(0, 8)}`
        })
        setCommentAuthorById((prev) => ({ ...prev, ...profileMap }))
      })
      .catch(() => {
        return
      })
  }, [data?.comentarios])

  if (isLoading) {
    return (
      <>
        <UserNavbar />
        <Spinner fullScreen />
      </>
    )
  }

  if (isError || !data) {
    return (
      <>
        <UserNavbar />
        <main className="bg-background min-h-screen py-8 px-4">
          <div className="max-w-4xl mx-auto card p-6">
            <p className="text-error text-sm font-medium">No se pudo cargar el caso.</p>
            <p className="text-xs text-text-secondary mt-1">
              {error instanceof Error ? error.message : 'Error inesperado.'}
            </p>
            <div className="mt-4 flex gap-3">
              <button onClick={() => refetch()} className="btn-secondary text-sm">
                Reintentar
              </button>
              <Link to="/user" className="btn-primary text-sm">
                Volver
              </Link>
            </div>
          </div>
        </main>
      </>
    )
  }

  const { caso, media, comentarios } = data
  const photos = media.filter(item => item.tipo === 'foto')
  const video = media.find(item => item.tipo === 'video')
  const mainPhoto = photos.find(item => item.es_principal)?.url ?? caso.foto_principal_url ?? photos[0]?.url ?? null
  const safeLocation = buildApproximateLocation(caso.ciudad, caso.pais)
  const fullName = `${caso.nombres} ${caso.apellidos}`.trim()
  const commentsEnabled = isPublicCommentEnabled(caso.workflow_status)

  const submitPublicComment = async () => {
    setCommentNotice(null)

    if (!commentsEnabled) {
      setCommentNotice({ type: 'warning', message: 'Los comentarios solo estan habilitados en publicaciones activas.' })
      return
    }

    if (!user?.id) {
      setCommentNotice({ type: 'warning', message: 'Inicia sesion para comentar en publicaciones activas.' })
      return
    }

    const trimmed = publicCommentDraft.trim()
    if (trimmed.length < 3) {
      setCommentNotice({ type: 'warning', message: 'Escribe un comentario de al menos 3 caracteres.' })
      return
    }

    setPublicCommentSubmitting(true)
    try {
      const payload = `${PUBLIC_COMMENT_PREFIX} ${trimmed}`
      const created = await createCaseComment(caso.id, user.id, payload)
      setPublicComments((prev) => [
        ...prev,
        {
          id: created.id,
          caseId: caso.id,
          authorId: user.id,
          text: trimmed,
          createdAt: new Date().toISOString(),
        },
      ])
      setPublicCommentDraft('')
      setCommentNotice({ type: 'success', message: 'Comentario publicado.' })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo publicar el comentario.'
      setCommentNotice({ type: 'error', message })
    } finally {
      setPublicCommentSubmitting(false)
    }
  }

  const copyShareLink = async () => {
    const shareUrl = buildCaseShareUrl(caso.id)

    if (!navigator.clipboard?.writeText) {
      setShareNotice({ type: 'info', message: `Enlace para compartir: ${shareUrl}` })
      return
    }

    try {
      await navigator.clipboard.writeText(shareUrl)
      setShareNotice({ type: 'success', message: 'Enlace copiado al portapapeles.' })
    } catch {
      setShareNotice({ type: 'warning', message: 'No se pudo copiar automaticamente. Intenta de nuevo.' })
    }
  }

  const shareCase = async () => {
    const shareUrl = buildCaseShareUrl(caso.id)
    const text = buildShareText(caso.numero_caso, fullName)

    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: `FindMe - ${caso.numero_caso}`,
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

    await copyShareLink()
  }

  const shareOnSocial = (network: ShareNetwork) => {
    const shareUrl = buildCaseShareUrl(caso.id)
    const text = buildShareText(caso.numero_caso, fullName)
    const socialUrl = buildSocialShareUrl(network, shareUrl, text)
    window.open(socialUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <>
      <UserNavbar />

      <main className="bg-background min-h-screen py-8 px-4">
        <div className="max-w-5xl mx-auto space-y-6">
          <Link
            to="/user"
            className="inline-flex items-center gap-1.5 text-xs text-text-secondary hover:text-primary transition-colors"
          >
            <ChevronLeft size={14} /> Volver al listado
          </Link>

          <article className="card overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr]">
              <div className="bg-primary-soft/40 min-h-[260px] lg:min-h-full">
                {mainPhoto ? (
                  <img src={mainPhoto} alt={`${caso.nombres} ${caso.apellidos}`} className="w-full h-full object-cover" />
                ) : (
                  <div className="h-full flex items-center justify-center text-text-secondary">
                    <UserSearch size={42} />
                  </div>
                )}
              </div>

              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <p className="text-xs text-text-secondary font-mono">{caso.numero_caso}</p>
                    <h1 className="text-2xl font-bold text-text-primary mt-1">
                      {caso.nombres} {caso.apellidos}
                    </h1>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-primary-soft text-primary">
                    {formatStatusLabel(caso.status)}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <LabelValue label="Edad" value={caso.edad} />
                  <LabelValue label="Genero" value={caso.genero} />
                  <LabelValue label="Color ojos" value={caso.color_ojos} />
                  <LabelValue label="Color cabello" value={caso.color_cabello} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <LabelValue label="Ciudad" value={caso.ciudad} />
                  <LabelValue label="Pais" value={caso.pais} />
                  <LabelValue label="Fecha desaparicion" value={caso.fecha_desaparicion} />
                  <LabelValue label="Hora aproximada" value={caso.hora_desaparicion} />
                </div>

                <div className="flex items-center gap-4 text-xs text-text-secondary flex-wrap">
                  <span className="inline-flex items-center gap-1">
                    <Eye size={13} /> {caso.vistas} vistas
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={13} /> Zona aproximada: {safeLocation}
                  </span>
                </div>
              </div>
            </div>
          </article>

          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-5 space-y-4">
              <h2 className="text-lg font-semibold text-text-primary">Descripcion y circunstancias</h2>
              <LabelValue label="Descripcion general" value={caso.descripcion_general} />
              <LabelValue label="Senas particulares" value={caso.senas_particulares} />
              <LabelValue label="Circunstancias" value={caso.circunstancias} />
              <LabelValue label="Ropa" value={caso.ropa_descripcion} />
              <LabelValue label="Zona aproximada de ultimo avistamiento" value={safeLocation} />
            </div>

            <div className="card p-5 space-y-4">
              <h2 className="text-lg font-semibold text-text-primary">Contacto</h2>
              <p className="text-xs text-text-secondary">
                Visibilidad: <span className="font-semibold text-text-primary">{caso.visibilidad_contacto ?? 'publico'}</span>
              </p>
              <div className="space-y-3">
                <p className="text-sm text-text-primary inline-flex items-center gap-2">
                  <Phone size={14} className="text-primary" />
                  {caso.telefono_contacto ?? 'No disponible'}
                </p>
                <p className="text-sm text-text-primary inline-flex items-center gap-2">
                  <Mail size={14} className="text-primary" />
                  {caso.email_contacto ?? 'No disponible'}
                </p>
              </div>
            </div>
          </section>

          <section className="card p-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-text-primary">Acciones del caso</h2>
                <p className="text-sm text-text-secondary mt-1">
                  Usa el menu de tres puntos para reportar avistamiento, reportar contenido o compartir.
                </p>
              </div>

              <div className="relative shrink-0" ref={actionsMenuRef}>
                <button
                  type="button"
                  onClick={() => setActionsOpen((current) => !current)}
                  className="w-9 h-9 rounded-full border border-border bg-card text-text-primary shadow-sm hover:bg-primary-soft/40 transition-colors flex items-center justify-center"
                  aria-label="Mas acciones del caso"
                >
                  <MoreVertical size={19} strokeWidth={2.7} />
                </button>

                {actionsOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-lg shadow-lg p-1.5 z-20">
                    <Link
                      to={`/caso/${caso.id}/avistamiento`}
                      onClick={() => setActionsOpen(false)}
                      className="block px-3 py-2 rounded-md text-sm text-text-primary hover:bg-primary-soft/40"
                    >
                      Reportar avistamiento
                    </Link>
                    <Link
                      to={`/caso/${caso.id}/reportar`}
                      onClick={() => setActionsOpen(false)}
                      className="block px-3 py-2 rounded-md text-sm text-text-primary hover:bg-primary-soft/40"
                    >
                      Reportar contenido
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        void copyShareLink()
                        setActionsOpen(false)
                      }}
                      className="w-full text-left px-3 py-2 rounded-md text-sm text-text-primary hover:bg-primary-soft/40 inline-flex items-center gap-1.5"
                    >
                      <Link2 size={13} />
                      Copiar enlace
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void shareCase()
                        setActionsOpen(false)
                      }}
                      className="w-full text-left px-3 py-2 rounded-md text-sm text-text-primary hover:bg-primary-soft/40 inline-flex items-center gap-1.5"
                    >
                      <Share2 size={13} />
                      Compartir
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        shareOnSocial('whatsapp')
                        setActionsOpen(false)
                      }}
                      className="w-full text-left px-3 py-2 rounded-md text-sm text-text-primary hover:bg-primary-soft/40"
                    >
                      Compartir por WhatsApp
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        shareOnSocial('x')
                        setActionsOpen(false)
                      }}
                      className="w-full text-left px-3 py-2 rounded-md text-sm text-text-primary hover:bg-primary-soft/40"
                    >
                      Compartir en X
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        shareOnSocial('facebook')
                        setActionsOpen(false)
                      }}
                      className="w-full text-left px-3 py-2 rounded-md text-sm text-text-primary hover:bg-primary-soft/40"
                    >
                      Compartir en Facebook
                    </button>
                  </div>
                )}
              </div>
            </div>

            {shareNotice && <Alert type={shareNotice.type} message={shareNotice.message} />}
          </section>

          <section className="card p-5 space-y-4">
            <h2 className="text-lg font-semibold text-text-primary inline-flex items-center gap-2">
              <MessageSquare size={18} className="text-primary" />
              Comentarios de autoridad
            </h2>

            {comentarios.length === 0 && (
              <p className="text-sm text-text-secondary">
                Aun no hay comentarios de la autoridad para este caso.
              </p>
            )}

            {comentarios.length > 0 && (
              <div className="space-y-3">
                {comentarios.map(comentario => (
                  <article key={comentario.id} className="border border-border rounded-lg p-4 bg-background/60">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <p className="text-sm font-semibold text-text-primary">
                        {comentario.autor_id
                          ? commentAuthorById[comentario.autor_id] ?? comentario.autor
                          : comentario.autor}
                      </p>
                      <p className="text-xs text-text-secondary">{formatDateTime(comentario.created_at)}</p>
                    </div>

                    {comentario.estado && (
                      <span className="inline-flex mt-2 px-2 py-0.5 rounded-full text-[11px] font-medium bg-primary-soft text-primary capitalize">
                        {formatEstado(comentario.estado)}
                      </span>
                    )}

                    <p className="text-sm text-text-primary mt-2 whitespace-pre-wrap">{comentario.contenido}</p>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="card p-5 space-y-4">
            <h2 className="text-lg font-semibold text-text-primary">Comentarios publicos</h2>
            {commentNotice && <Alert type={commentNotice.type} message={commentNotice.message} />}

            {publicCommentsLoading && (
              <div className="text-sm text-text-secondary">Cargando comentarios...</div>
            )}

            {publicCommentsError && (
              <div className="rounded-lg border border-warning/30 bg-warning/5 p-3">
                <p className="text-xs text-text-secondary">{publicCommentsError}</p>
              </div>
            )}

            {!publicCommentsLoading && !publicCommentsError && publicComments.length === 0 && (
              <p className="text-sm text-text-secondary">Aun no hay comentarios publicos para este caso.</p>
            )}

            {publicComments.length > 0 && (
              <div className="space-y-3">
                {publicComments.map((comment) => (
                  <article key={comment.id} className="border border-border rounded-lg p-4 bg-background/60">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <p className="text-sm font-semibold text-text-primary">
                        {commentAuthorById[comment.authorId] ??
                          getPublicCommentAuthorLabel(comment.authorId, user?.id)}
                      </p>
                      <p className="text-xs text-text-secondary">{formatPublicCommentDate(comment.createdAt)}</p>
                    </div>
                    <p className="text-sm text-text-primary mt-2 whitespace-pre-wrap">{comment.text}</p>
                  </article>
                ))}
              </div>
            )}

            {commentsEnabled ? (
              <div className="space-y-2">
                <textarea
                  rows={3}
                  value={publicCommentDraft}
                  onChange={(event) => setPublicCommentDraft(event.target.value.slice(0, 300))}
                  placeholder={user ? 'Escribe un comentario de apoyo o informacion util...' : 'Inicia sesion para comentar'}
                  className="input-field resize-none"
                  disabled={!user || publicCommentSubmitting}
                />
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] text-text-secondary">{publicCommentDraft.length}/300</p>
                  <button
                    type="button"
                    onClick={() => void submitPublicComment()}
                    className="btn-primary !px-4 !py-2 text-xs"
                    disabled={!user || !publicCommentDraft.trim() || publicCommentSubmitting}
                  >
                    {publicCommentSubmitting ? 'Publicando...' : 'Comentar'}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-text-secondary">
                Comentarios cerrados: solo se permite comentar en publicaciones activas.
              </p>
            )}
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-text-primary">Media del caso</h2>

            {photos.length === 0 && !video && (
              <div className="card p-4">
                <p className="text-sm text-text-secondary">No hay imagenes o video cargados para este caso.</p>
              </div>
            )}

            {photos.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {photos.map(photo => (
                  <a
                    key={photo.id}
                    href={photo.url}
                    target="_blank"
                    rel="noreferrer"
                    className="card overflow-hidden aspect-square hover:shadow-md transition-shadow"
                  >
                    <img src={photo.url} alt="Foto del caso" className="w-full h-full object-cover" />
                  </a>
                ))}
              </div>
            )}

            {video && (
              <div className="card p-4 space-y-2">
                <p className="text-sm font-medium text-text-primary inline-flex items-center gap-2">
                  <Video size={15} className="text-primary" />
                  Video del caso
                </p>
                <video controls className="w-full rounded-lg border border-border">
                  <source src={video.url} type={video.mime_type ?? 'video/mp4'} />
                </video>
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  )
}
