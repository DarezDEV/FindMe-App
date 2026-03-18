import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AlertTriangle, MoreVertical, Plus, RefreshCw, UserSearch } from 'lucide-react'
import { useAuth } from '../../auth/hooks'
import { Spinner } from '../../../shared/components/ui'
import UserNavbar from '../components/Usernavbar'
import { type CasoReciente, useCasosGenerales } from '../hooks/useMisCasos'
import { supabase } from '../../../lib/supabase/client'

const STATUS_CONFIG: Record<CasoReciente['status'], { label: string; className: string }> = {
  activo: { label: 'Publicada', className: 'bg-info/10 text-info' },
  en_revision: { label: 'Publicada', className: 'bg-warning/10 text-warning' },
  avistado: { label: 'Publicada', className: 'bg-primary-soft text-primary' },
  encontrado: { label: 'Reunificada', className: 'bg-success/10 text-success' },
}

function getCaseStatusLabel(caso: CasoReciente) {
  if (caso.workflow_status === 'rejected') return 'Rechazada'
  if (caso.workflow_status === 'approved') return 'Aprobada'
  if (caso.workflow_status === 'found' || caso.status === 'encontrado') return 'Reunificada'
  if (caso.workflow_status === 'closed') return 'Archivada'
  return STATUS_CONFIG[caso.status].label
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
  const [searchParams, setSearchParams] = useSearchParams()
  const searchQuery = searchParams.get('q') ?? ''
  const normalizedQuery = searchQuery.trim().toLowerCase()

  const {
    data: casosGenerales = [],
    isLoading: casosLoading,
    isError: casosError,
    refetch: refetchCasos,
  } = useCasosGenerales(24, { hideResolved: false, hideRejected: true, approvedOnly: true })

  const filteredCasos = useMemo(() => {
    if (!normalizedQuery) return casosGenerales
    return casosGenerales.filter((caso) => {
      const fullName = `${caso.nombres} ${caso.apellidos}`.toLowerCase()
      const city = (caso.ciudad ?? '').toLowerCase()
      const caseNumber = caso.numero_caso.toLowerCase()
      return (
        fullName.includes(normalizedQuery) ||
        city.includes(normalizedQuery) ||
        caseNumber.includes(normalizedQuery)
      )
    })
  }, [casosGenerales, normalizedQuery])

  const missingCases = useMemo(
    () =>
      filteredCasos.filter(
        (caso) =>
          !(caso.workflow_status === 'found' || caso.workflow_status === 'closed' || caso.status === 'encontrado'),
      ),
    [filteredCasos],
  )

  const displayCases = missingCases
  const [featuredIndex, setFeaturedIndex] = useState(0)
  const featuredCase = displayCases[featuredIndex]

  useEffect(() => {
    setFeaturedIndex(0)
  }, [displayCases.length, normalizedQuery])

  useEffect(() => {
    if (displayCases.length <= 1) return
    const timer = window.setInterval(() => {
      setFeaturedIndex((current) => (current + 1) % displayCases.length)
    }, 6000)
    return () => window.clearInterval(timer)
  }, [displayCases.length])

  useEffect(() => {
    const channel = supabase
      .channel('user-home-casos-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cases' },
        () => {
          void refetchCasos()
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [refetchCasos])

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
            <section className="card overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div>
                  <h2 className="text-sm font-semibold text-text-primary">Pantalla de casos</h2>
                  <p className="text-xs text-text-secondary">Se actualiza automaticamente.</p>
                </div>
                <span className="text-[11px] text-text-secondary">
                  {featuredIndex + 1} / {displayCases.length}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4 p-4 bg-white">
                <div className="border border-border rounded-lg overflow-hidden aspect-[3/4] flex items-center justify-center bg-background">
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

                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-text-secondary font-mono">{featuredCase.numero_caso}</p>
                    <h3 className="text-xl font-bold text-text-primary mt-1">
                      {featuredCase.nombres} {featuredCase.apellidos}
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm text-text-secondary">
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-text-secondary">Estado</p>
                      <p className="font-semibold text-text-primary">{getCaseStatusLabel(featuredCase)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-text-secondary">Ciudad</p>
                      <p className="font-semibold text-text-primary">{featuredCase.ciudad ?? 'Sin ciudad'}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-text-secondary">Fecha</p>
                      <p className="font-semibold text-text-primary">{formatPosterDate(featuredCase.fecha_desaparicion)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-text-secondary">Vistas</p>
                      <p className="font-semibold text-text-primary">{featuredCase.vistas}</p>
                    </div>
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
              onClick={() => refetchCasos()}
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
              <button onClick={() => refetchCasos()} className="text-xs text-primary hover:underline">
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
