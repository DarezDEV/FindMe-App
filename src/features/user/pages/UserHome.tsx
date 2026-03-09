import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
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
      <div className="w-12 h-12 rounded-xl bg-border animate-pulse shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-40 bg-border rounded animate-pulse" />
        <div className="h-3 w-56 bg-border rounded animate-pulse" />
      </div>
    </div>
  )
}

export default function UserHome() {
  const { user, loading: authLoading } = useAuth()
  const [openMenuCaseId, setOpenMenuCaseId] = useState<string | null>(null)

  const {
    data: casosGenerales = [],
    isLoading: casosLoading,
    isError: casosError,
    refetch: refetchCasos,
  } = useCasosGenerales(24, { hideResolved: true })

  useEffect(() => {
    const channel = supabase
      .channel('user-home-casos-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'casos' },
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

          {!casosLoading && !casosError && casosGenerales.length === 0 && (
            <div className="card p-8 text-center">
              <UserSearch size={32} className="text-border mx-auto mb-3" />
              <p className="text-sm font-medium text-text-primary">Aun no hay casos disponibles</p>
              <p className="text-xs text-text-secondary mt-1">
                Publica un reporte para que aparezca en el listado general.
              </p>
              <Link to="/publicar" className="btn-primary inline-flex mt-4 text-sm gap-2 items-center">
                <Plus size={15} /> Publicar ahora
              </Link>
            </div>
          )}

          {!casosLoading && !casosError && casosGenerales.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-fr">
              {casosGenerales.map(caso => (
                <article
                  key={caso.id}
                  className="relative h-full min-h-[460px] border border-border rounded-sm bg-card shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col"
                >
                  <header className="bg-primary-soft px-3 py-2 rounded-t-sm border-b border-border">
                    <p className="text-primary text-center font-black tracking-wide text-xl sm:text-2xl leading-none">
                      DESAPARECIDO
                    </p>
                  </header>

                  <div className="bg-background p-3 grid grid-cols-[1fr_0.9fr] gap-3 items-stretch">
                    <div className="bg-card border border-border aspect-[3/4] overflow-hidden flex items-center justify-center rounded-sm">
                      {caso.foto_principal_url ? (
                        <img
                          src={caso.foto_principal_url}
                          alt={`${caso.nombres} ${caso.apellidos}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <UserSearch size={30} className="text-primary" />
                      )}
                    </div>

                    <div className="bg-card border border-border p-2.5 flex flex-col rounded-sm">
                      <p className="text-[11px] font-extrabold text-center tracking-wide text-text-primary">DESAPARECIDO DESDE</p>
                      <p className="text-lg font-black text-primary text-center leading-none mt-1">
                        {formatPosterDate(caso.fecha_desaparicion)}
                      </p>

                      <div className="mt-3 space-y-1.5 text-[11px] text-text-primary">
                        <p className="font-semibold">Estado: {STATUS_CONFIG[caso.status].label}</p>
                        <p className="font-semibold">Ciudad: {caso.ciudad ?? 'Sin ciudad'}</p>
                        <p className="font-semibold">Vistas: {caso.vistas}</p>
                        <p className="font-mono text-[10px] text-text-secondary">{caso.numero_caso}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-text-primary px-3 py-2 h-14 flex items-center justify-center">
                    <p className="text-white text-sm font-black tracking-wide uppercase text-center leading-tight truncate w-full">
                      {caso.nombres} {caso.apellidos}
                    </p>
                  </div>

                  <footer className="bg-card border-t border-border px-3 py-2.5 flex items-center justify-between gap-2 rounded-b-sm mt-auto">
                    <Link
                      to={`/caso/${caso.id}`}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
                    >
                      Ver detalles
                    </Link>

                    <div className="relative" data-case-menu>
                      <button
                        type="button"
                        onClick={() => setOpenMenuCaseId((current) => (current === caso.id ? null : caso.id))}
                        className="w-9 h-9 rounded-full bg-card text-text-primary border border-border shadow-sm flex items-center justify-center hover:bg-primary-soft/40 transition-colors"
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
                </article>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  )
}
