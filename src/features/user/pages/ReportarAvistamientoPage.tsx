import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, ChevronLeft, MapPin } from 'lucide-react'
import { Alert, Spinner, appToast } from '../../../shared/components/ui'
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
      await reportarAvistamiento({
        casoId,
        fecha,
        hora,
        lugar,
        descripcion,
        contacto,
      })

      setSuccess('Avistamiento enviado correctamente. El equipo de moderacion lo revisara.')
      appToast.success('Avistamiento enviado correctamente.')
      setLugar('')
      setDescripcion('')
      setContacto('')
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : 'No se pudo enviar el avistamiento.'
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
              <div className="w-10 h-10 rounded-xl bg-primary-soft text-primary flex items-center justify-center">
                <MapPin size={18} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-text-primary">Reportar avistamiento</h1>
                <p className="text-sm text-text-secondary mt-1">
                  Comparte informacion verificada para apoyar la localizacion del caso.
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                    Fecha del avistamiento
                  </label>
                  <input
                    type="date"
                    value={fecha}
                    onChange={(event) => setFecha(event.target.value)}
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                    Hora aproximada
                  </label>
                  <input
                    type="time"
                    value={hora}
                    onChange={(event) => setHora(event.target.value)}
                    className="input-field"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                  Lugar
                </label>
                <input
                  type="text"
                  value={lugar}
                  onChange={(event) => setLugar(event.target.value)}
                  placeholder="Ejemplo: Av. Duarte, Santo Domingo"
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                  Descripcion
                </label>
                <textarea
                  value={descripcion}
                  onChange={(event) => setDescripcion(event.target.value)}
                  rows={4}
                  placeholder="Describe lo que viste, direccion de desplazamiento, compania, etc."
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                  Contacto opcional
                </label>
                <input
                  type="text"
                  value={contacto}
                  onChange={(event) => setContacto(event.target.value)}
                  placeholder="Telefono o correo para seguimiento"
                  className="input-field"
                />
              </div>

              <div className="flex flex-wrap gap-3 pt-1">
                <button type="submit" disabled={loading} className="btn-primary text-sm">
                  {loading ? 'Enviando...' : 'Enviar avistamiento'}
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
