import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, ChevronLeft, Eye, MapPin } from 'lucide-react'
import { Alert, Spinner } from '../../../shared/components/ui'
import UserNavbar from '../components/Usernavbar'
import { useCasosGenerales } from '../hooks/useMisCasos'
import { reportarAvistamiento } from '../services/reportes'

function getInitialDate() {
  return new Date().toISOString().slice(0, 10)
}

function getInitialTime() {
  const now = new Date()
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

export default function ReportarAvistamientoPage() {
  const { id } = useParams<{ id: string }>()
  const [casoId, setCasoId] = useState(id ?? '')
  const [fecha, setFecha] = useState(getInitialDate)
  const [hora, setHora] = useState(getInitialTime)
  const [lugar, setLugar] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [contacto, setContacto] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const {
    data: casos = [],
    isLoading: casosLoading,
    isError: casosError,
    refetch: refetchCasos,
  } = useCasosGenerales(120)

  useEffect(() => {
    if (id) setCasoId(id)
  }, [id])

  const options = useMemo(
    () =>
      casos.map((caso) => ({
        value: caso.id,
        label: `${caso.numero_caso} - ${caso.nombres} ${caso.apellidos}`,
      })),
    [casos],
  )

  const backPath = casoId ? `/caso/${casoId}` : '/user'

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (loading) return

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      await reportarAvistamiento({ casoId, fecha, hora, lugar, descripcion, contacto })
      setSuccess('Avistamiento enviado correctamente. El equipo de moderación lo revisará.')
      setLugar('')
      setDescripcion('')
      setContacto('')
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : 'No se pudo enviar el avistamiento.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <UserNavbar />

      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-24 -right-24 h-80 w-80 rounded-full bg-primary/6 blur-3xl" />
        <div className="absolute bottom-0 -left-24 h-72 w-72 rounded-full bg-info/5 blur-3xl" />
      </div>

      <main className="relative z-10 min-h-screen bg-background py-10 px-4">
        <div className="max-w-2xl mx-auto space-y-6">

          {/* Back link */}
          <Link
            to={backPath}
            className="inline-flex items-center gap-1.5 text-xs text-text-secondary hover:text-primary transition-colors group"
          >
            <ChevronLeft size={14} className="transition-transform group-hover:-translate-x-0.5" />
            Volver
          </Link>

          {/* Main card */}
          <div className="rounded-2xl border border-border/70 bg-card shadow-sm overflow-hidden">

            {/* Accent stripe */}
            <div className="h-1 w-full bg-gradient-to-r from-primary/70 via-primary/30 to-transparent" />

            <div className="p-6 sm:p-8 space-y-6">

              {/* Header */}
              <div className="flex items-start gap-4">
                <div className="shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 flex items-center justify-center shadow-sm">
                  <MapPin size={22} className="text-primary" strokeWidth={1.8} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-text-primary">
                    Reportar avistamiento
                  </h1>
                  <p className="text-sm text-text-secondary mt-1 leading-relaxed">
                    Comparte información verificada para apoyar la localización del caso.
                  </p>
                </div>
              </div>

              {/* Info tip */}
              <div className="flex items-start gap-2.5 rounded-xl bg-primary/5 border border-primary/15 px-4 py-3">
                <Eye size={15} className="text-primary mt-0.5 shrink-0" />
                <p className="text-xs text-text-secondary leading-relaxed">
                  Tu reporte será revisado antes de ser publicado. La información precisa y honesta
                  aumenta las posibilidades de reunificación.
                </p>
              </div>

              {/* Loading casos */}
              {casosLoading && (
                <div className="flex items-center gap-2.5 text-sm text-text-secondary">
                  <Spinner size="sm" />
                  Cargando casos disponibles…
                </div>
              )}

              {/* Error casos */}
              {casosError && (
                <div className="rounded-xl border border-warning/30 bg-warning/5 p-3.5 flex items-center justify-between gap-3">
                  <p className="text-xs text-text-secondary inline-flex items-center gap-1.5">
                    <AlertTriangle size={14} className="text-warning shrink-0" />
                    No se pudo cargar la lista de casos.
                  </p>
                  <button
                    type="button"
                    onClick={() => refetchCasos()}
                    className="text-xs text-primary font-medium hover:underline shrink-0"
                  >
                    Reintentar
                  </button>
                </div>
              )}

              {/* Feedback alerts */}
              {error && <Alert type="error" message={error} />}

              {success && (
                <div className="rounded-xl border border-success/30 bg-success/5 p-3.5 flex items-center gap-2.5">
                  <CheckCircle2 size={16} className="text-success shrink-0" />
                  <p className="text-sm text-success leading-snug">{success}</p>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-5">

                {/* Caso selector */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-widest">
                    Caso
                  </label>
                  <select
                    value={casoId}
                    onChange={(e) => setCasoId(e.target.value)}
                    className="input-field"
                    required
                  >
                    <option value="">Selecciona un caso</option>
                    {options.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date & time */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-text-secondary uppercase tracking-widest">
                      Fecha del avistamiento
                    </label>
                    <input
                      type="date"
                      value={fecha}
                      onChange={(e) => setFecha(e.target.value)}
                      className="input-field"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-text-secondary uppercase tracking-widest">
                      Hora aproximada
                    </label>
                    <input
                      type="time"
                      value={hora}
                      onChange={(e) => setHora(e.target.value)}
                      className="input-field"
                      required
                    />
                  </div>
                </div>

                {/* Lugar */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-widest">
                    Lugar
                  </label>
                  <input
                    type="text"
                    value={lugar}
                    onChange={(e) => setLugar(e.target.value)}
                    placeholder="Ej: Av. Duarte esq. Juan Pablo Duarte, Santo Domingo"
                    className="input-field"
                    required
                  />
                </div>

                {/* Descripcion */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-widest">
                    Descripción
                  </label>
                  <textarea
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    rows={4}
                    placeholder="Describe lo que viste: dirección de desplazamiento, compañía, vestimenta, estado aparente…"
                    className="input-field resize-none"
                    required
                  />
                </div>

                {/* Contacto */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-widest">
                    Contacto{' '}
                    <span className="normal-case font-normal text-text-secondary tracking-normal">
                      (opcional)
                    </span>
                  </label>
                  <input
                    type="text"
                    value={contacto}
                    onChange={(e) => setContacto(e.target.value)}
                    placeholder="Teléfono o correo para seguimiento"
                    className="input-field"
                  />
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary text-sm inline-flex items-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Spinner size="sm" />
                        Enviando…
                      </>
                    ) : (
                      'Enviar avistamiento'
                    )}
                  </button>
                  {casoId && (
                    <Link to={`/caso/${casoId}`} className="btn-secondary text-sm">
                      Ver caso
                    </Link>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* Help footer */}
          <p className="text-center text-xs text-text-secondary">
            ¿Necesitas ayuda?{' '}
            <a href="mailto:soporte@findme.app" className="text-primary font-medium hover:underline">
              soporte@findme.app
            </a>
          </p>
        </div>
      </main>
    </>
  )
}