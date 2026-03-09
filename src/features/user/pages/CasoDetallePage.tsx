import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronLeft, Eye, Link2, Mail, MapPin, MessageSquare, MoreVertical, Phone, Share2, UserSearch, Video } from 'lucide-react'
import UserNavbar from '../components/Usernavbar'
import { Alert, Spinner } from '../../../shared/components/ui'
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

export default function CasoDetallePage() {
  const [shareNotice, setShareNotice] = useState<{ type: 'error' | 'success' | 'warning' | 'info'; message: string } | null>(null)
  const [actionsOpen, setActionsOpen] = useState(false)
  const actionsMenuRef = useRef<HTMLDivElement | null>(null)
  const { id = '' } = useParams<{ id: string }>()
  const { data, isLoading, isError, error, refetch } = useCasoDetalle(id)

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node | null
      if (actionsMenuRef.current?.contains(target ?? null)) return
      setActionsOpen(false)
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

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
                      <p className="text-sm font-semibold text-text-primary">{comentario.autor}</p>
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
