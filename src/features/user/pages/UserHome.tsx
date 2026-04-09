import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AlertTriangle, ArrowRight, Eye, MapPin, MoreVertical, Plus, RefreshCw, UserSearch, X } from 'lucide-react'
import { useAuth } from '../../auth/hooks'
import { Spinner } from '../../../shared/components/ui'
import UserNavbar from '../components/Usernavbar'
import { type CasoReciente, useCasosGenerales } from '../hooks/useMisCasos'
import { supabase } from '../../../lib/supabase/client'

const STATUS_CONFIG: Record<CasoReciente['status'], { label: string; className: string }> = {
  activo: { label: 'Publicada', className: 'bg-info/10 text-info' },
  en_revision: { label: 'En revisión', className: 'bg-warning/10 text-warning' },
  avistado: { label: 'Avistado', className: 'bg-primary-soft text-primary' },
  encontrado: { label: 'Reunificada', className: 'bg-success/10 text-success' },
}

const SCREEN_ROTATION_MS = 4200
const SCREEN_FADE_MS = 360

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
    found,
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
    <div className="rounded-2xl overflow-hidden border border-border/40 bg-card animate-pulse">
      <div className="h-2 bg-border/60 w-full" />
      <div className="p-4 flex gap-3 items-center">
        <div className="w-14 h-14 rounded-xl bg-border/50 shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-36 bg-border/50 rounded-lg" />
          <div className="h-3 w-52 bg-border/40 rounded-lg" />
          <div className="h-3 w-24 bg-border/30 rounded-lg" />
        </div>
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

  const filteredCasos = normalizedQuery
    ? casosGenerales.filter((caso) => {
        const fullName = `${caso.nombres} ${caso.apellidos}`.toLowerCase()
        const city = (caso.ciudad ?? '').toLowerCase()
        const caseNumber = caso.numero_caso.toLowerCase()
        return (
          fullName.includes(normalizedQuery) ||
          city.includes(normalizedQuery) ||
          caseNumber.includes(normalizedQuery)
        )
      })
    : casosGenerales

  const visibleCases = filteredCasos.filter(
    (caso) =>
      !(caso.workflow_status === 'found' || caso.workflow_status === 'closed' || caso.status === 'encontrado'),
  )
  const displayCases = visibleCases
  const [featuredIndex, setFeaturedIndex] = useState(0)
  const safeFeaturedIndex = displayCases.length > 0 ? featuredIndex % displayCases.length : 0
  const featuredCase = displayCases[safeFeaturedIndex]

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
    const channel = supabase
      .channel('user-home-casos-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cases' },
        () => { void refetchCasos() }
      )
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
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

      <main className="relative bg-background min-h-screen pb-16 overflow-hidden">
        {/* Ambient background blobs */}
        <div className="pointer-events-none absolute -top-32 -right-24 h-80 w-80 rounded-full bg-primary/8 blur-3xl" />
        <div className="pointer-events-none absolute top-64 -left-28 h-96 w-96 rounded-full bg-info/6 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-1/3 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />

        <div className="max-w-6xl mx-auto px-4 pt-8 space-y-8 relative">

          {/* Search results banner */}
          {normalizedQuery && (
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm shadow-sm text-sm">
              <p className="text-text-secondary">
                Resultados para{' '}
                <span className="font-semibold text-text-primary">"{searchQuery.trim()}"</span>
                <span className="ml-2 inline-flex items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs px-2 py-0.5 min-w-[1.5rem]">
                  {displayCases.length}
                </span>
              </p>
              <button
                type="button"
                onClick={() => setSearchParams({})}
                className="inline-flex items-center gap-1.5 text-xs text-text-secondary hover:text-primary transition-colors"
              >
                <X size={13} />
                Limpiar búsqueda
              </button>
            </div>
          )}

          {/* ── Featured / Slider ─────────────────────────────────────────── */}
          {!casosLoading && !casosError && featuredCase && (
            <section className="relative overflow-hidden rounded-3xl border border-border/50 bg-card shadow-xl shadow-black/5">
              {/* Header bar */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/50 bg-card/90 backdrop-blur">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold px-3 py-1 uppercase tracking-widest">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    En vivo
                  </span>
                  <div>
                    <h2 className="text-sm font-semibold text-text-primary leading-none">Casos recientes</h2>
                    <p className="text-[11px] text-text-secondary mt-0.5">Se actualiza automáticamente</p>
                  </div>
                </div>
                <span className="text-xs font-medium text-text-secondary tabular-nums bg-border/30 rounded-full px-2.5 py-1">
                  {safeFeaturedIndex + 1} / {displayCases.length}
                </span>
              </div>

              {/* Content */}
              <div className="relative">
                <div
                  key={featuredCase.id}
                  className={`grid grid-cols-1 md:grid-cols-[300px_1fr] gap-0 transition-all duration-500 ${
                    isTransitioning ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'
                  }`}
                >
                  {/* Photo */}
                  <div className="relative overflow-hidden md:rounded-none">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent z-10" />
                    <span className="absolute left-4 top-4 z-20 rounded-full bg-primary text-white text-[10px] font-black px-3 py-1.5 tracking-widest shadow-lg">
                      DESAPARECIDO
                    </span>
                    <div className="aspect-[3/4] md:aspect-auto md:h-full min-h-[240px] flex items-center justify-center bg-border/20">
                      {featuredCase.foto_principal_url ? (
                        <img
                          src={featuredCase.foto_principal_url}
                          alt={`${featuredCase.nombres} ${featuredCase.apellidos}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <UserSearch size={40} className="text-text-secondary/40" />
                      )}
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 z-20 p-4 md:hidden">
                      <p className="text-[10px] uppercase tracking-[0.25em] text-white/70">Desaparecido desde</p>
                      <p className="text-lg font-bold text-white">{formatPosterDate(featuredCase.fecha_desaparicion)}</p>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-6 md:p-8 flex flex-col justify-between gap-6">
                    <div className="space-y-4">
                      <p className="text-xs text-text-secondary font-mono tracking-wider">{featuredCase.numero_caso}</p>
                      <h3 className="text-2xl md:text-3xl font-bold text-text-primary leading-tight">
                        {featuredCase.nombres} {featuredCase.apellidos}
                      </h3>

                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { label: 'Estado', value: getCaseStatusLabel(featuredCase) },
                          { label: 'Ciudad', value: featuredCase.ciudad ?? 'Sin ciudad' },
                          { label: 'Desaparecido', value: formatPosterDate(featuredCase.fecha_desaparicion) },
                          { label: 'Visualizaciones', value: String(featuredCase.vistas) },
                        ].map((item) => (
                          <div
                            key={item.label}
                            className="rounded-xl border border-border/50 bg-background/60 px-3.5 py-2.5"
                          >
                            <p className="text-[10px] uppercase tracking-wider text-text-secondary font-medium mb-0.5">{item.label}</p>
                            <p className="font-semibold text-text-primary text-sm leading-snug">{item.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Link
                      to={`/caso/${featuredCase.id}`}
                      className="btn-primary inline-flex items-center gap-2 w-fit text-sm px-5 py-2.5 rounded-xl"
                    >
                      Ver detalles
                      <ArrowRight size={15} />
                    </Link>
                  </div>
                </div>
              </div>

              {/* Progress dots */}
              <div className="absolute bottom-4 right-6 flex gap-1.5">
                {displayCases.slice(0, 6).map((_, index) => (
                  <span
                    key={`dot-${index}`}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      index === safeFeaturedIndex ? 'bg-primary w-4' : 'bg-border w-1.5'
                    }`}
                  />
                ))}
              </div>
            </section>
          )}

          {/* ── List header ───────────────────────────────────────────────── */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div>
              <h2 className="font-bold text-text-primary text-lg">Listado general</h2>
              <p className="text-xs text-text-secondary mt-0.5">Solo casos aprobados para visualización pública.</p>
            </div>
            <button
              onClick={() => refetchCasos()}
              className="inline-flex items-center gap-2 text-xs text-text-secondary hover:text-primary transition-colors rounded-xl border border-border/50 px-3.5 py-2 bg-card hover:bg-primary/5"
              title="Actualizar casos"
            >
              <RefreshCw size={13} />
              Actualizar
            </button>
          </div>

          {/* Loading skeletons */}
          {casosLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <CasoSkeleton />
              <CasoSkeleton />
              <CasoSkeleton />
            </div>
          )}

          {/* Error state */}
          {casosError && (
            <div className="flex items-center gap-4 p-4 rounded-2xl border border-error/25 bg-error/5">
              <div className="w-9 h-9 rounded-xl bg-error/10 flex items-center justify-center shrink-0">
                <AlertTriangle size={17} className="text-error" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-error">Error al cargar casos</p>
                <p className="text-xs text-text-secondary mt-0.5">No se pudo conectar al servidor. Intenta nuevamente.</p>
              </div>
              <button
                onClick={() => refetchCasos()}
                className="text-xs text-primary font-medium hover:underline shrink-0"
              >
                Reintentar
              </button>
            </div>
          )}

          {/* Empty state */}
          {!casosLoading && !casosError && displayCases.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-3 py-16 px-6 rounded-3xl border border-dashed border-border/60 bg-card/40 text-center">
              <div className="w-14 h-14 rounded-2xl bg-border/30 flex items-center justify-center">
                <UserSearch size={26} className="text-text-secondary/60" />
              </div>
              <div>
                <p className="font-semibold text-text-primary">
                  {normalizedQuery ? 'Sin resultados' : 'No hay casos disponibles'}
                </p>
                <p className="text-sm text-text-secondary mt-1 max-w-xs mx-auto">
                  {normalizedQuery
                    ? 'Prueba con otro nombre, ciudad o número de caso.'
                    : 'Publica un reporte para que aparezca en el listado general.'}
                </p>
              </div>
              {!normalizedQuery && (
                <Link to="/publicar" className="btn-primary inline-flex items-center gap-2 text-sm mt-2 px-5 py-2.5 rounded-xl">
                  <Plus size={15} />
                  Publicar ahora
                </Link>
              )}
            </div>
          )}

          {/* ── Case cards grid ───────────────────────────────────────────── */}
          {!casosLoading && !casosError && displayCases.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {displayCases.map((caso) => {
                const poster = getPosterStatus(caso)
                return (
                  <article
                    key={caso.id}
                    className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm hover:shadow-lg hover:shadow-black/8 hover:-translate-y-0.5 transition-all duration-200"
                  >
                    {/* Status strip */}
                    <div className={`h-1.5 w-full ${poster.found ? 'bg-success' : 'bg-primary'}`} />

                    {/* Photo + side info */}
                    <div className="p-3 grid grid-cols-[1fr_0.9fr] gap-2.5 items-stretch flex-1">
                      {/* Photo */}
                      <div className="relative overflow-hidden rounded-xl bg-border/20 aspect-[3/4]">
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent z-10" />
                        <span className={`absolute top-2 left-2 z-20 text-[9px] font-black px-2 py-0.5 rounded-full tracking-widest ${poster.found ? 'bg-success text-white' : 'bg-primary text-white'}`}>
                          {poster.label}
                        </span>
                        {caso.foto_principal_url ? (
                          <img
                            src={caso.foto_principal_url}
                            alt={`${caso.nombres} ${caso.apellidos}`}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <UserSearch size={28} className="text-text-secondary/40" />
                          </div>
                        )}
                      </div>

                      {/* Info panel */}
                      <div className="flex flex-col gap-1.5 py-0.5">
                        <div className="rounded-xl bg-background/80 border border-border/40 p-2 text-center">
                          <p className="text-[9px] font-bold uppercase tracking-widest text-text-secondary leading-none mb-1">
                            Desaparecido desde
                          </p>
                          <p className="text-[11px] font-black text-primary leading-tight">
                            {formatPosterDate(caso.fecha_desaparicion)}
                          </p>
                        </div>

                        <div className="flex-1 rounded-xl bg-background/80 border border-border/40 p-2 space-y-1.5">
                          <div>
                            <p className="text-[9px] uppercase tracking-wider text-text-secondary font-medium">Estado</p>
                            <p className="text-[11px] font-semibold text-text-primary">{getCaseStatusLabel(caso)}</p>
                          </div>
                          <div>
                            <p className="text-[9px] uppercase tracking-wider text-text-secondary font-medium flex items-center gap-1">
                              <MapPin size={8} /> Ciudad
                            </p>
                            <p className="text-[11px] font-semibold text-text-primary">{caso.ciudad ?? 'Sin ciudad'}</p>
                          </div>
                          <div>
                            <p className="text-[9px] uppercase tracking-wider text-text-secondary font-medium flex items-center gap-1">
                              <Eye size={8} /> Vistas
                            </p>
                            <p className="text-[11px] font-semibold text-text-primary">{caso.vistas}</p>
                          </div>
                          <p className="text-[9px] font-mono text-text-secondary/60 pt-0.5 border-t border-border/30">
                            {caso.numero_caso}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Name bar */}
                    <div className="bg-text-primary px-3 py-2 text-center">
                      <p className="text-white text-sm font-black tracking-wide uppercase leading-tight truncate">
                        {caso.nombres} {caso.apellidos}
                      </p>
                    </div>

                    {/* Footer */}
                    <footer className={`px-3 py-2.5 flex items-center justify-between gap-2 ${poster.found ? 'bg-success' : 'bg-primary'}`}>
                      <Link
                        to={`/caso/${caso.id}`}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/90 hover:text-white transition-colors"
                      >
                        Ver detalles
                        <ArrowRight size={12} />
                      </Link>

                      <div className="relative" data-case-menu>
                        <button
                          type="button"
                          onClick={() =>
                            setOpenMenuCaseId((current) => (current === caso.id ? null : caso.id))
                          }
                          className="w-8 h-8 rounded-full bg-white/15 text-white border border-white/25 flex items-center justify-center hover:bg-white/25 transition-colors"
                          aria-label="Más acciones"
                        >
                          <MoreVertical size={15} strokeWidth={2.5} />
                        </button>

                        {openMenuCaseId === caso.id && (
                          <div className="absolute right-0 bottom-full mb-2 w-52 bg-card border border-border rounded-xl shadow-xl z-30 p-1.5 animate-in fade-in slide-in-from-bottom-2">
                            <Link
                              to={`/caso/${caso.id}/avistamiento`}
                              onClick={() => setOpenMenuCaseId(null)}
                              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-text-primary hover:bg-primary/8 transition-colors"
                            >
                              <Eye size={14} className="text-text-secondary" />
                              Reportar avistamiento
                            </Link>
                            <Link
                              to={`/caso/${caso.id}/reportar`}
                              onClick={() => setOpenMenuCaseId(null)}
                              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-text-primary hover:bg-error/8 transition-colors"
                            >
                              <AlertTriangle size={14} className="text-text-secondary" />
                              Reportar contenido
                            </Link>
                          </div>
                        )}
                      </div>
                    </footer>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </>
  )
}
