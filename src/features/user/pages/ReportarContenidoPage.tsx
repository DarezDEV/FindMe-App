import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, ChevronLeft, Flag, Info } from 'lucide-react'
import { Alert, Spinner } from '../../../shared/components/ui'
import UserNavbar from '../components/Usernavbar'
import { useCasosGenerales } from '../hooks/useMisCasos'
import { reportarContenido } from '../services/reportes'

const REASONS = [
  { value: 'informacion_falsa', label: 'Información falsa o engañosa' },
  { value: 'spam', label: 'Spam o promoción no relacionada' },
  { value: 'lenguaje_ofensivo', label: 'Lenguaje ofensivo o agresivo' },
  { value: 'datos_privados', label: 'Publicación de datos sensibles' },
  { value: 'otro', label: 'Otro motivo' },
] as const

export default function ReportarContenidoPage() {
  const { id } = useParams<{ id: string }>()
  const [casoId, setCasoId] = useState(id ?? '')
  const [motivo, setMotivo] = useState<string>(REASONS[0].value)
  const [descripcion, setDescripcion] = useState('')
  const [evidenciaUrl, setEvidenciaUrl] = useState('')
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
      await reportarContenido({ casoId, motivo, descripcion, evidenciaUrl })
      setSuccess('Reporte de contenido enviado. El equipo de moderación lo revisará a la brevedad.')
      setDescripcion('')
      setEvidenciaUrl('')
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : 'No se pudo enviar el reporte.'
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
        <div className="absolute -top-24 right-0 h-80 w-80 rounded-full bg-warning/5 blur-3xl" />
        <div className="absolute bottom-10 -left-20 h-72 w-72 rounded-full bg-error/4 blur-3xl" />
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
            <div className="h-1 w-full bg-gradient-to-r from-warning/70 via-warning/30 to-transparent" />

            <div className="p-6 sm:p-8 space-y-6">

              {/* Header */}
              <div className="flex items-start gap-4">
                <div className="shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-warning/20 to-warning/5 border border-warning/25 flex items-center justify-center shadow-sm">
                  <Flag size={20} className="text-warning" strokeWidth={1.8} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-text-primary">
                    Reportar contenido
                  </h1>
                  <p className="text-sm text-text-secondary mt-1 leading-relaxed">
                    Ayuda a mantener la plataforma segura reportando publicaciones inapropiadas.
                  </p>
                </div>
              </div>

              {/* Info tip */}
              <div className="flex items-start gap-2.5 rounded-xl bg-warning/5 border border-warning/20 px-4 py-3">
                <Info size={15} className="text-warning mt-0.5 shrink-0" />
                <p className="text-xs text-text-secondary leading-relaxed">
                  Los reportes son anónimos. Solo usa esta función para contenido genuinamente
                  problemático. El abuso del sistema puede resultar en restricciones de cuenta.
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

              {/* Feedback */}
              {error && <Alert type="error" message={error} />}

              {success && (
                <div className="rounded-xl border border-success/30 bg-success/5 p-3.5 flex items-center gap-2.5">
                  <CheckCircle2 size={16} className="text-success shrink-0" />
                  <p className="text-sm text-success leading-snug">{success}</p>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-5">

                {/* Caso */}
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

                {/* Motivo — radio cards */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-widest">
                    Motivo del reporte
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {REASONS.map((reason) => (
                      <label
                        key={reason.value}
                        className={`flex items-center gap-2.5 rounded-xl border px-4 py-3 cursor-pointer transition-colors ${
                          motivo === reason.value
                            ? 'border-warning/50 bg-warning/5 text-text-primary'
                            : 'border-border/70 bg-background/50 text-text-secondary hover:border-border'
                        }`}
                      >
                        <input
                          type="radio"
                          name="motivo"
                          value={reason.value}
                          checked={motivo === reason.value}
                          onChange={(e) => setMotivo(e.target.value)}
                          className="accent-warning"
                        />
                        <span className="text-sm leading-snug">{reason.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Detalle */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-widest">
                    Detalle del reporte
                  </label>
                  <textarea
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    rows={4}
                    placeholder="Describe por qué este contenido debe revisarse…"
                    className="input-field resize-none"
                    required
                  />
                </div>

                {/* Evidencia */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-widest">
                    URL de evidencia{' '}
                    <span className="normal-case font-normal text-text-secondary tracking-normal">
                      (opcional)
                    </span>
                  </label>
                  <input
                    type="url"
                    value={evidenciaUrl}
                    onChange={(e) => setEvidenciaUrl(e.target.value)}
                    placeholder="https://…"
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
                      'Enviar reporte'
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