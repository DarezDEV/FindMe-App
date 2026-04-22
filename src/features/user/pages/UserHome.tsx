import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AlertTriangle, Calendar, MapPin, MoreVertical, Plus, RefreshCw, UserSearch } from 'lucide-react'
import { useAuth } from '../../auth/hooks'
import { Spinner } from '../../../shared/components/ui'
import { useCasosGenerales, type CasoReciente } from '../hooks/useMisCasos'
import UserNavbar from '../components/Usernavbar'

function getDateLabel(caso: Pick<CasoReciente, 'fecha_desaparicion' | 'created_at'>): string {
  const sourceDate = caso.fecha_desaparicion ?? caso.created_at
  if (!sourceDate) return 'Fecha no disponible'

  const parsed = new Date(sourceDate)
  if (Number.isNaN(parsed.getTime())) return 'Fecha no disponible'

  return new Intl.DateTimeFormat('es-DO', { day: '2-digit', month: 'short', year: 'numeric' }).format(parsed)
}

const SCREEN_ROTATION_MS = 4200
const SCREEN_FADE_MS = 360

function getCaseStatusLabel(caso: CasoReciente) {
  if (caso.workflow_status === 'rejected') return 'Rechazada'
  if (caso.workflow_status === 'approved') return 'Aprobada'
  if (caso.workflow_status === 'found' || caso.status === 'encontrado') return 'Reunificada'
  if (caso.workflow_status === 'closed') return 'Archivada'
  return 'Activo'
}

function getPosterStatus(caso: CasoReciente) {
  const found = caso.workflow_status === 'found' || caso.status === 'encontrado'
  return {
    label: found ? 'ENCONTRADO' : 'DESAPARECIDO',
    headerClass: found ? 'bg-primary' : 'bg-primary',
    footerClass: found ? 'bg-primary' : 'bg-primary',
    dateClass: found ? 'text-primary' : 'text-primary',
  }
}

function formatPosterDate(value: string | null) {
  if (!value) return 'Sin fecha'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat('es-DO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsed).toUpperCase()
}

function CasoSkeleton() {
  return (
    <div className="card p-4 flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl bg-border/70 animate-pulse shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-40 bg-border/70 rounded animate-pulse" />
        <div className="h-3 w-56 bg-border/70 rounded animate-pulse" />
      </div>
    </div>
  )
}

export default function UserHome() {
  const { user, loading: authLoading } = useAuth()
  const [openMenuCaseId, setOpenMenuCaseId] = useState<string | null>(null)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const searchQuery = searchParams.get('q') ?? ''
  const normalizedQuery = searchQuery.trim().toLowerCase()

  const {
    data: casosGenerales = [],
    isLoading: casosLoading,
    isError: casosError,
    refetch: refetchCasos,
  } = useCasosGenerales(24, { hideResolved: false, hideRejected: true, approvedOnly: true })

  // Suscripción en tiempo real via helper compartido
  const filteredCasos = !normalizedQuery
    ? casosGenerales
    : casosGenerales.filter((caso) => {
        const fullName = `${caso.nombres} ${caso.apellidos}`.toLowerCase()
        const city = (caso.ciudad ?? '').toLowerCase()
        const caseNumber = caso.numero_caso.toLowerCase()
        return (
          fullName.includes(normalizedQuery) ||
          city.includes(normalizedQuery) ||
          caseNumber.includes(normalizedQuery)
        )
      })

  const displayCases = filteredCasos.filter(
    (caso) =>
      !(caso.workflow_status === 'found' || caso.workflow_status === 'closed' || caso.status === 'encontrado'),
  )
  const [featuredIndex, setFeaturedIndex] = useState(0)
  const safeFeaturedIndex = displayCases.length > 0 ? featuredIndex % displayCases.length : 0
  const featuredCase = displayCases[safeFeaturedIndex]
  const featuredTransitioning = displayCases.length > 1 && isTransitioning

  useEffect(() => {
    if (displayCases.length <= 1) return
    let timeoutId: number | undefined
    const timer = window.setInterval(() => {
      setIsTransitioning(true)
      timeoutId = window.setTimeout(() => {
        setFeaturedIndex((current) => (current + 1) % displayCases.length)
        setIsTransitioning(false)
      }, SCREEN_FADE_MS)
    }, SCREEN_ROTATION_MS)
    return () => {
      window.clearInterval(timer)
      if (timeoutId) window.clearTimeout(timeoutId)
    }
  }, [displayCases.length])

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.closest('[data-case-menu]')) return
      setOpenMenuCaseId(null)
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  if (authLoading || !user) return <Spinner fullScreen />

  return (
    <>
      <UserNavbar />

      <main className="bg-background min-h-screen py-8 px-4">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-text-primary">Casos generales</h1>
              <p className="text-sm text-text-secondary mt-1">
                Consulta todos los casos recientes publicados en la plataforma.
              </p>
            </div>
            <div className="flex items-center gap-2">

            </div>
          </div>

          {normalizedQuery && (
            <div className="card p-3 flex flex-wrap items-center justify-between gap-2 text-sm">
              <div className="text-text-secondary">
                Resultados para <span className="font-semibold text-text-primary">"{searchQuery.trim()}"</span>:
                <span className="ml-1 font-semibold text-text-primary">{filteredCasos.length}</span>
              </div>
              <button
                type="button"
                onClick={() => setSearchParams({})}
                className="text-xs text-primary hover:underline"
              >
                Limpiar busqueda
              </button>
            </div>
          )}

          {!casosLoading && !casosError && featuredCase && (
            <section className="card overflow-hidden border border-border/70 bg-gradient-to-br from-white via-white to-primary-soft/40 shadow-[0_20px_45px_-40px_rgba(15,23,42,0.7)]">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/70 bg-white/80 backdrop-blur">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary text-[10px] font-semibold px-2.5 py-1 uppercase tracking-widest">
                    En vivo
                  </span>
                  <div>
                    <h2 className="text-sm font-semibold text-text-primary">Pantalla de casos</h2>
                    <p className="text-xs text-text-secondary">Se actualiza automaticamente.</p>
                  </div>
                </div>
                <span className="text-[11px] text-text-secondary">
                  {safeFeaturedIndex + 1} / {displayCases.length}
                </span>
              </div>

              <div
                className={`grid grid-cols-1 md:grid-cols-[280px_1fr] gap-5 p-5 transition-all duration-500 ${
                  featuredTransitioning
                    ? 'opacity-0 translate-y-2 scale-[0.985]'
                    : 'opacity-100 translate-y-0 scale-100'
                }`}
              >
                <div className="relative border border-border/70 rounded-2xl overflow-hidden aspect-[3/4] flex items-center justify-center bg-background shadow-sm">
                  <span className="absolute left-3 top-3 rounded-full bg-primary text-white text-[10px] font-black px-2.5 py-1 tracking-widest shadow">
                    DESAPARECIDO
                  </span>
                  {featuredCase.foto_principal_url ? (
                    <img
                      src={featuredCase.foto_principal_url}
                      alt={`${featuredCase.nombres} ${featuredCase.apellidos}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <UserSearch size={38} className="text-text-secondary" />
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-text-secondary font-mono">{featuredCase.numero_caso}</p>
                    <h3 className="text-2xl font-bold text-text-primary mt-1">
                      {featuredCase.nombres} {featuredCase.apellidos}
                    </h3>
                    <div className="flex items-center gap-4 mt-2 text-sm text-text-secondary">
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin size={13} />
                        {featuredCase.ciudad ?? 'Sin ciudad'}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar size={13} />
                        {getDateLabel(featuredCase)}
                        {getDateLabel(featuredCase)}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm text-text-secondary">
                    {[
                      { label: 'Estado', value: getCaseStatusLabel(featuredCase) },
                      { label: 'Ciudad', value: featuredCase.ciudad ?? 'Sin ciudad' },
                      { label: 'Fecha', value: formatPosterDate(featuredCase.fecha_desaparicion) },
                      { label: 'Vistas', value: String(featuredCase.vistas) },
                    ].map((item) => (
                      <div key={item.label} className="rounded-xl border border-border/60 bg-white/70 px-3 py-2">
                        <p className="text-[11px] uppercase tracking-wide text-text-secondary">{item.label}</p>
                        <p className="font-semibold text-text-primary">{item.value}</p>
                      </div>
                    ))}
                  </div>
                  <Link
                    to={`/caso/${featuredCase.id}`}
                    className="btn-primary inline-flex text-sm items-center gap-2 w-fit"
                  >
                    Ver detalles
                  </Link>
                </div>
              </div>
            </section>
          )}

          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-text-primary">Listado general</h2>
            <button
              type="button"
              onClick={() => void refetchCasos()}
              className="text-text-secondary hover:text-primary transition-colors inline-flex items-center gap-1.5 text-xs"
              title="Actualizar casos"
            >
              <RefreshCw size={14} />
              Actualizar
            </button>
          </div>

          {casosLoading && (
            <div className="space-y-2">
              <CasoSkeleton />
              <CasoSkeleton />
              <CasoSkeleton />
            </div>
          )}

          {casosError && (
            <div className="card p-4 flex items-center gap-3 border-error/30 bg-error/5">
              <AlertTriangle size={18} className="text-error shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-error">Error al cargar casos</p>
                <p className="text-xs text-text-secondary">Intenta nuevamente.</p>
              </div>
              <button type="button" onClick={() => void refetchCasos()} className="text-xs text-primary hover:underline">
                Reintentar
              </button>
            </div>
          )}

          {!casosLoading && !casosError && filteredCasos.length === 0 && (
            <div className="card p-8 text-center">
              <UserSearch size={32} className="text-border mx-auto mb-3" />
              <p className="text-sm font-medium text-text-primary">
                {normalizedQuery ? 'No hay resultados para tu busqueda' : 'Aun no hay casos disponibles'}
              </p>
              <p className="text-xs text-text-secondary mt-1">
                {normalizedQuery
                  ? 'Prueba con otro nombre, ciudad o numero de caso.'
                  : 'Publica un reporte para que aparezca en el listado general.'}
              </p>
              {!normalizedQuery && (
                <Link to="/publicar" className="btn-primary inline-flex mt-4 text-sm gap-2 items-center">
                  <Plus size={15} /> Publicar ahora
                </Link>
              )}
            </div>
          )}

          {!casosLoading && !casosError && filteredCasos.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCasos.map(caso => (
                <article
                  key={caso.id}
                  className="card relative h-full overflow-hidden flex flex-col transition-shadow duration-200 hover:shadow-md"
                >
                  {(() => {
                    const poster = getPosterStatus(caso)
                    return (
                      <>
                        <header className={`${poster.headerClass} px-3 py-1.5`}>
                          <p className="text-white text-center font-black tracking-wide text-lg sm:text-xl leading-none">
                            {poster.label}
                          </p>
                        </header>

                        <div className="bg-white p-2.5 grid grid-cols-[1fr_0.95fr] gap-2.5 items-stretch">
                          <div className="bg-white border border-border aspect-[3/4] overflow-hidden flex items-center justify-center">
                            {caso.foto_principal_url ? (
                              <img
                                src={caso.foto_principal_url}
                                alt={`${caso.nombres} ${caso.apellidos}`}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <UserSearch size={30} className="text-text-secondary" />
                            )}
                          </div>

                          <div className="bg-white border border-border p-2 flex flex-col">
                            <p className="text-[11px] font-black text-center tracking-wide text-text-primary">
                              DESAPARECIDO DESDE
                            </p>
                            <p className={`text-base font-black ${poster.dateClass} text-center leading-none mt-1`}>
                              {formatPosterDate(caso.fecha_desaparicion)}
                            </p>

                            <div className="mt-2 space-y-1 text-[11px] text-text-primary">
                              <p className="font-semibold">Estado: {getCaseStatusLabel(caso)}</p>
                              <p className="font-semibold">Ciudad: {caso.ciudad ?? 'Sin ciudad'}</p>
                              <p className="font-semibold">Vistas: {caso.vistas}</p>
                              <p className="font-mono text-[10px] text-text-secondary">{caso.numero_caso}</p>
                            </div>
                          </div>
                        </div>

                        <div className="bg-black px-3 py-2 h-9 flex items-center justify-center">
                          <p className="text-white text-sm font-black tracking-wide uppercase text-center leading-tight truncate w-full">
                            {caso.nombres} {caso.apellidos}
                          </p>
                        </div>

                        <footer className={`${poster.footerClass} px-3 py-2 flex items-center justify-between gap-2 mt-auto`}>
                          <Link
                            to={`/caso/${caso.id}`}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/90 hover:text-white"
                          >
                            Ver detalles
                          </Link>

                          <div className="relative" data-case-menu>
                            <button
                              type="button"
                              onClick={() => setOpenMenuCaseId((current) => (current === caso.id ? null : caso.id))}
                              className="w-9 h-9 rounded-full bg-white/10 text-white border border-white/20 shadow-sm flex items-center justify-center hover:bg-white/20 transition-colors"
                              aria-label="Mas acciones"
                            >
                              <MoreVertical size={18} strokeWidth={2.7} />
                            </button>

                            {openMenuCaseId === caso.id && (
                              <div className="absolute right-0 bottom-full mb-2 w-48 bg-card border border-border rounded-lg shadow-lg z-30 p-1.5">
                                <Link
                                  to={`/caso/${caso.id}/avistamiento`}
                                  onClick={() => setOpenMenuCaseId(null)}
                                  className="block px-3 py-2 rounded-md text-sm text-text-primary hover:bg-primary-soft/40"
                                >
                                  Reportar avistamiento
                                </Link>
                                <Link
                                  to={`/caso/${caso.id}/reportar`}
                                  onClick={() => setOpenMenuCaseId(null)}
                                  className="block px-3 py-2 rounded-md text-sm text-text-primary hover:bg-primary-soft/40"
                                >
                                  Reportar contenido
                                </Link>
                              </div>
                            )}
                          </div>
                        </footer>
                      </>
                    )
                  })()}
                </article>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  )
}

