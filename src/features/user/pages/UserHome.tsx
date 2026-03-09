import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, MapPin, Search } from 'lucide-react'
import { useAuth } from '../../auth/hooks'
import { Spinner, StatusBadge, type WorkflowStatus } from '../../../shared/components/ui'
import { getAuthorityCases, subscribeToCasesRealtime, type AuthorityCaseRow } from '../../../lib/supabase/db'

function getPublicWorkflowStatus(caso: AuthorityCaseRow): WorkflowStatus | null {
  if (caso.workflow_status) {
    if (caso.workflow_status === 'rejected') return null
    return caso.workflow_status
  }
  if (caso.status === 'resuelto') return 'found'
  if (caso.status === 'cerrado') return 'closed'
  if (caso.status === 'activo' || caso.status === 'en_proceso') return 'approved'
  return null
}

function getLocation(caso: AuthorityCaseRow): string {
  return caso.ciudad || caso.estado_provincia || caso.lugar_ultima_vez || 'Sin ubicacion'
}

function getDateLabel(caso: AuthorityCaseRow): string {
  const sourceDate = caso.fecha_desaparicion || caso.created_at
  const parsed = new Date(sourceDate)
  if (Number.isNaN(parsed.getTime())) return 'Fecha no disponible'
  return new Intl.DateTimeFormat('es-DO', { day: '2-digit', month: 'short', year: 'numeric' }).format(parsed)
}

export default function UserHome() {
  const { user, loading } = useAuth()
  const [rows, setRows] = useState<AuthorityCaseRow[]>([])
  const [search, setSearch] = useState('')
  const [loadingCases, setLoadingCases] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadCases = useCallback(async () => {
    setLoadingCases(true)
    setError(null)
    try {
      const data = await getAuthorityCases({ limit: 120 })
      setRows(data.filter((item) => Boolean(getPublicWorkflowStatus(item))))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los casos visibles.')
      setRows([])
    } finally {
      setLoadingCases(false)
    }
  }, [])

  useEffect(() => {
    void loadCases()
  }, [loadCases])

  useEffect(() => {
    const unsubscribe = subscribeToCasesRealtime(() => {
      void loadCases()
    })
    return unsubscribe
  }, [loadCases])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return rows
    return rows.filter((item) => {
      const fullName = `${item.nombres} ${item.apellidos}`.toLowerCase()
      return fullName.includes(term) || item.numero_caso.toLowerCase().includes(term) || getLocation(item).toLowerCase().includes(term)
    })
  }, [rows, search])

  if (loading || !user) return <Spinner fullScreen />

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto space-y-5">
        <div className="card p-6">
          <h1 className="text-2xl font-bold text-text-primary">Bienvenido, {user.name} {user.last_nmae}</h1>
          <p className="text-text-secondary text-sm mt-1">Panel ciudadano con casos visibles para apoyar en la busqueda.</p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Link to="/publish-case" className="btn-primary !px-4 !py-2">Publicar caso</Link>
            <Link to="/cases" className="btn-secondary !px-4 !py-2">Ver listado completo</Link>
          </div>
        </div>

        <div className="card p-4">
          <label className="relative block">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, caso o ubicacion"
              className="input-field pl-9"
            />
          </label>
        </div>

        {error && <div className="card p-4 border border-error/20 bg-error/10 text-error text-sm">{error}</div>}

        <section className="space-y-3">
          {loadingCases ? (
            <div className="card p-8 flex items-center justify-center"><Spinner size="lg" /></div>
          ) : filtered.length === 0 ? (
            <div className="card p-8 text-center text-text-secondary text-sm">No hay casos visibles con ese filtro.</div>
          ) : (
            filtered.slice(0, 8).map((item) => {
              const workflowStatus = getPublicWorkflowStatus(item)
              if (!workflowStatus) return null
              return (
                <article key={item.id} className="card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-primary tracking-wide uppercase">{item.numero_caso}</p>
                      <h2 className="text-lg font-semibold text-text-primary">{item.nombres} {item.apellidos}</h2>
                    </div>
                    <StatusBadge status={workflowStatus} />
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-text-secondary md:grid-cols-2">
                    <p className="inline-flex items-center gap-2"><MapPin size={14} />{getLocation(item)}</p>
                    <p className="inline-flex items-center gap-2"><Calendar size={14} />{getDateLabel(item)}</p>
                  </div>
                </article>
              )
            })
          )}
        </section>
      </div>
    </div>
  )
}

