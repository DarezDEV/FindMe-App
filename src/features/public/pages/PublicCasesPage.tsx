import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, Calendar, Search, RefreshCw } from 'lucide-react'
import { Alert, Spinner, StatusBadge, type WorkflowStatus } from '../../../shared/components/ui'
import { getAuthorityCases, type AuthorityCaseRow } from '../../../lib/supabase/db'

type PublicFilter = 'all' | WorkflowStatus

function getLocation(caso: AuthorityCaseRow): string {
  return caso.ciudad || caso.estado_provincia || caso.lugar_ultima_vez || 'Sin ubicacion'
}

function getDateLabel(caso: AuthorityCaseRow): string {
  const sourceDate = caso.fecha_desaparicion || caso.created_at
  const parsed = new Date(sourceDate)
  if (Number.isNaN(parsed.getTime())) return 'Fecha no disponible'
  return new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).format(parsed)
}

function getWorkflowStatus(caso: AuthorityCaseRow): WorkflowStatus | null {
  if (!caso.workflow_status) return null
  if (caso.workflow_status === 'rejected') return null
  return caso.workflow_status
}

export default function PublicCasesPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<PublicFilter>('all')
  const [rows, setRows] = useState<AuthorityCaseRow[]>([])

  const loadCases = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await getAuthorityCases({ limit: 200 })
      const publicRows = data.filter((item) => {
        const status = getWorkflowStatus(item)
        if (!status) return false
        return status === 'approved' || status === 'found' || status === 'closed'
      })
      setRows(publicRows)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudieron cargar los casos.'
      setError(message)
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadCases()
  }, [loadCases])

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
              { value: 'approved', label: 'Aprobados' },
              { value: 'found', label: 'Encontrados' },
              { value: 'closed', label: 'Cerrados' },
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

              return (
                <article key={item.id} className="card p-5">
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
                </article>
              )
            })
          )}
        </section>
      </main>
    </div>
  )
}
