import { Link, useParams } from 'react-router-dom'
import { ChevronLeft, Eye, Flag, Mail, MapPin, MessageSquare, Phone, UserSearch, Video } from 'lucide-react'
import UserNavbar from '../components/Usernavbar'
import { Spinner } from '../../../shared/components/ui'
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

export default function CasoDetallePage() {
  const { id = '' } = useParams<{ id: string }>()
  const { data, isLoading, isError, error, refetch } = useCasoDetalle(id)

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
                    {caso.status}
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
                    <MapPin size={13} /> {caso.lugar_desaparicion ?? 'Sin ubicacion'}
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
              <LabelValue label="Ultimo lugar visto" value={caso.lugar_ultima_vez} />
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
            <h2 className="text-lg font-semibold text-text-primary">Acciones del caso</h2>
            <p className="text-sm text-text-secondary">
              Puedes aportar informacion de avistamiento o denunciar contenido relacionado con este caso.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to={`/caso/${caso.id}/avistamiento`} className="btn-primary text-sm inline-flex items-center gap-1.5">
                <MapPin size={14} />
                Reportar avistamiento
              </Link>
              <Link to={`/caso/${caso.id}/reportar`} className="btn-secondary text-sm inline-flex items-center gap-1.5">
                <Flag size={14} />
                Reportar contenido
              </Link>
            </div>
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
