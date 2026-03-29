import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, ChevronLeft, Flag } from 'lucide-react'
import { Alert, Spinner, appToast } from '../../../shared/components/ui'
import UserNavbar from '../components/Usernavbar'
import { useCasosGenerales } from '../hooks/useMisCasos'
import { reportarContenido } from '../services/reportes'

const REASONS = [
  { value: 'informacion_falsa', label: 'Informacion falsa o engañosa' },
  { value: 'spam', label: 'Spam o promocion no relacionada' },
  { value: 'lenguaje_ofensivo', label: 'Lenguaje ofensivo o agresivo' },
  { value: 'datos_privados', label: 'Publicacion de datos sensibles' },
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
    if (id) {
      setCasoId(id)
    }
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
      await reportarContenido({
        casoId,
        motivo,
        descripcion,
        evidenciaUrl,
      })

      setSuccess('Reporte de contenido enviado. El equipo de moderacion lo revisara.')
      appToast.success('Reporte de contenido enviado correctamente.')
      setDescripcion('')
      setEvidenciaUrl('')
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : 'No se pudo enviar el reporte.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <UserNavbar />

      <main className="min-h-screen bg-background py-8 px-4">
        <div className="max-w-2xl mx-auto space-y-5">
          <Link
            to={backPath}
            className="inline-flex items-center gap-1.5 text-xs text-text-secondary hover:text-primary transition-colors"
          >
            <ChevronLeft size={14} />
            Volver
          </Link>

          <div className="card p-6 sm:p-8 space-y-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-warning/10 text-warning flex items-center justify-center">
                <Flag size={18} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-text-primary">Reportar contenido</h1>
                <p className="text-sm text-text-secondary mt-1">
                  Ayuda a mantener la plataforma segura reportando publicaciones inapropiadas.
                </p>
              </div>
            </div>

            {casosLoading && (
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <Spinner size="sm" />
                Cargando casos disponibles...
              </div>
            )}

            {casosError && (
              <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 flex items-center justify-between gap-3">
                <p className="text-xs text-text-secondary inline-flex items-center gap-1.5">
                  <AlertTriangle size={14} className="text-warning" />
                  No se pudo cargar la lista de casos.
                </p>
                <button
                  type="button"
                  onClick={() => refetchCasos()}
                  className="text-xs text-primary hover:underline"
                >
                  Reintentar
                </button>
              </div>
            )}

            {error && <Alert type="error" message={error} />}

            {success && (
              <div className="rounded-lg border border-success/30 bg-success/5 p-3">
                <p className="text-sm text-success inline-flex items-center gap-1.5">
                  <CheckCircle2 size={15} />
                  {success}
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                  Caso
                </label>
                <select
                  value={casoId}
                  onChange={(event) => setCasoId(event.target.value)}
                  className="input-field"
                  required
                >
                  <option value="">Selecciona un caso</option>
                  {options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                  Motivo
                </label>
                <select
                  value={motivo}
                  onChange={(event) => setMotivo(event.target.value)}
                  className="input-field"
                  required
                >
                  {REASONS.map((reason) => (
                    <option key={reason.value} value={reason.value}>
                      {reason.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                  Detalle del reporte
                </label>
                <textarea
                  value={descripcion}
                  onChange={(event) => setDescripcion(event.target.value)}
                  rows={4}
                  placeholder="Describe por que este contenido debe revisarse."
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                  URL de evidencia (opcional)
                </label>
                <input
                  type="url"
                  value={evidenciaUrl}
                  onChange={(event) => setEvidenciaUrl(event.target.value)}
                  placeholder="https://..."
                  className="input-field"
                />
              </div>

              <div className="flex flex-wrap gap-3 pt-1">
                <button type="submit" disabled={loading} className="btn-primary text-sm">
                  {loading ? 'Enviando...' : 'Enviar reporte'}
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
      </main>
    </>
  )
}
