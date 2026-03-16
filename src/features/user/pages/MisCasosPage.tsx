import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Calendar, ChevronLeft, Clock3, Edit3, Eye, MapPin, Trash2 } from 'lucide-react'
import { useAuth } from '../../auth/hooks'
import { Alert, Spinner } from '../../../shared/components/ui'
import { supabase } from '../../../lib/supabase/client'
import UserNavbar from '../components/Usernavbar'
import { type CasoReciente, useMisCasos } from '../hooks/useMisCasos'

type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'found' | 'closed'
type SightingStatus = 'pendiente' | 'validado' | 'rechazado'

interface CaseReference {
  caseNumber: string
  fullName: string
}

interface UserSighting {
  id: string
  casoId: string
  fecha: string | null
  hora: string | null
  lugar: string
  descripcion: string
  status: SightingStatus
  createdAt: string | null
}

interface EditCaseForm {
  nombres: string
  apellidos: string
  fechaDesaparicion: string
  lugarDesaparicion: string
  descripcionGeneral: string
}

interface NoticeState {
  type: 'error' | 'success' | 'warning' | 'info'
  message: string
}

const OWNER_COLUMN_CANDIDATES = ['publicado_por', 'user_id', 'autor_id'] as const

const INITIAL_EDIT_FORM: EditCaseForm = {
  nombres: '',
  apellidos: '',
  fechaDesaparicion: '',
  lugarDesaparicion: '',
  descripcionGeneral: '',
}

function normalizeReviewStatus(value: CasoReciente['workflow_status']): ReviewStatus {
  return value ?? 'pending'
}

function getReviewMeta(status: ReviewStatus) {
  if (status === 'approved') {
    return { label: 'Aprobado', className: 'bg-success/10 text-success', canEdit: false }
  }
  if (status === 'rejected') {
    return { label: 'Rechazado', className: 'bg-error/10 text-error', canEdit: true }
  }
  if (status === 'found') {
    return { label: 'Reunificada', className: 'bg-info/10 text-info', canEdit: false }
  }
  if (status === 'closed') {
    return { label: 'Archivada', className: 'bg-text-secondary/10 text-text-secondary', canEdit: false }
  }
  return { label: 'Pendiente', className: 'bg-warning/10 text-warning', canEdit: true }
}

function normalizeSightingStatus(value: unknown): SightingStatus {
  if (typeof value === 'boolean') {
    return value ? 'validado' : 'pendiente'
  }

  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (
    normalized === 'validado' ||
    normalized === 'aprobado' ||
    normalized === 'approved' ||
    normalized === 'confirmado'
  ) {
    return 'validado'
  }

  if (
    normalized === 'rechazado' ||
    normalized === 'rejected' ||
    normalized === 'descartado' ||
    normalized === 'invalido'
  ) {
    return 'rechazado'
  }

  return 'pendiente'
}

function getSightingStatusMeta(status: SightingStatus) {
  if (status === 'validado') {
    return { label: 'Validado', className: 'bg-success/10 text-success' }
  }
  if (status === 'rechazado') {
    return { label: 'Rechazado', className: 'bg-error/10 text-error' }
  }
  return { label: 'Pendiente', className: 'bg-warning/10 text-warning' }
}

function pickText(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = row[key]
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }
  return null
}

function isRecoverableSightingsError(message: string) {
  const lowered = message.toLowerCase()
  return (
    lowered.includes('row-level security policy') ||
    lowered.includes('permission denied') ||
    lowered.includes('relation') ||
    lowered.includes('does not exist')
  )
}

async function fetchCaseForUser(caseId: string, userId: string) {
  const errors: string[] = []

  for (const column of OWNER_COLUMN_CANDIDATES) {
    const { data, error } = await supabase
      .from('casos')
      .select('id, nombres, apellidos, fecha_desaparicion, lugar_desaparicion, descripcion_general, workflow_status')
      .eq('id', caseId)
      .eq(column, userId)
      .maybeSingle()

    if (!error && data) return data

    if (error) {
      const message = error.message.toLowerCase()
      if (message.includes('column') && message.includes('does not exist')) {
        errors.push(error.message)
        continue
      }
      if (message.includes('row-level security policy') || message.includes('permission denied')) {
        throw new Error('No tienes permisos para editar este caso.')
      }
      errors.push(error.message)
      continue
    }
  }

  throw new Error(errors[errors.length - 1] ?? 'No se encontro el caso para editar.')
}

async function updateCaseForUser(
  caseId: string,
  userId: string,
  payload: Record<string, unknown>,
  requireEditable = false,
) {
  const errors: string[] = []

  for (const column of OWNER_COLUMN_CANDIDATES) {
    let query = supabase
      .from('casos')
      .update(payload)
      .eq('id', caseId)
      .eq(column, userId)

    if (requireEditable) {
      query = query.or('workflow_status.is.null,workflow_status.eq.pending,workflow_status.eq.rejected')
    }

    const { data, error } = await query.select('id').maybeSingle()

    if (!error && data) return true

    if (error) {
      const message = error.message.toLowerCase()
      if (message.includes('column') && message.includes('does not exist')) {
        errors.push(error.message)
        continue
      }
      if (message.includes('row-level security policy') || message.includes('permission denied')) {
        throw new Error('No tienes permisos para modificar este caso.')
      }
      errors.push(error.message)
      continue
    }
  }

  throw new Error(errors[errors.length - 1] ?? 'No se pudo actualizar el caso.')
}

async function fetchSightingsByUser(
  table: string,
  userId: string,
  columnCandidates: readonly string[],
) {
  const errors: string[] = []

  for (const column of columnCandidates) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq(column, userId)
      .order('created_at', { ascending: false })

    if (!error) {
      return { rows: (data ?? []) as Record<string, unknown>[], errors: [] }
    }

    const message = error.message.toLowerCase()
    if (message.includes('column') && message.includes('does not exist')) {
      errors.push(error.message)
      continue
    }

    if (isRecoverableSightingsError(error.message)) {
      errors.push(error.message)
      continue
    }

    throw error
  }

  return { rows: [] as Record<string, unknown>[], errors }
}

function parseSightingRow(row: Record<string, unknown>, source: string, index: number): UserSighting | null {
  const idValue = row.id
  const id =
    typeof idValue === 'string' && idValue.trim()
      ? idValue
      : typeof idValue === 'number'
        ? String(idValue)
        : `${source}-${index + 1}`

  const casoId = pickText(row, ['caso_id', 'case_id'])
  if (!casoId) return null

  const fecha = pickText(row, ['fecha_avistamiento', 'fecha', 'date'])
  const hora = pickText(row, ['hora_avistamiento', 'hora', 'time'])
  const lugar = pickText(row, ['lugar', 'ubicacion', 'direccion', 'location']) ?? 'Sin ubicacion'
  const descripcion = pickText(row, ['descripcion', 'detalle', 'observacion', 'contenido']) ?? 'Sin descripcion'

  const rawStatus =
    row.estado ??
    row.status ??
    row.workflow_status ??
    row.validacion_status ??
    row.review_status ??
    row.validado ??
    row.aprobado

  const createdAt = pickText(row, ['created_at', 'fecha_creacion', 'updated_at'])

  return {
    id,
    casoId,
    fecha,
    hora,
    lugar,
    descripcion,
    status: normalizeSightingStatus(rawStatus),
    createdAt,
  }
}

function formatSightingDate(fecha: string | null, hora: string | null) {
  if (!fecha && !hora) return 'Sin fecha'
  if (fecha && hora) return `${fecha} ${hora}`
  return fecha ?? hora ?? 'Sin fecha'
}

function formatRelativeDate(value: string | null) {
  if (!value) return 'Reciente'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleString('es-DO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function MisCasosPage() {
  const { user, loading: authLoading } = useAuth()
  const [notice, setNotice] = useState<NoticeState | null>(null)
  const [sightings, setSightings] = useState<UserSighting[]>([])
  const [sightingsLoading, setSightingsLoading] = useState(false)
  const [sightingsError, setSightingsError] = useState<string | null>(null)
  const [externalCaseReferenceById, setExternalCaseReferenceById] = useState<Record<string, CaseReference>>({})
  const [editingCaseId, setEditingCaseId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<EditCaseForm>(INITIAL_EDIT_FORM)
  const [editLoading, setEditLoading] = useState(false)
  const [retireLoadingId, setRetireLoadingId] = useState<string | null>(null)

  const {
    data: myCases = [],
    isLoading: casesLoading,
    isError: casesError,
    refetch: refetchCases,
  } = useMisCasos(user?.id ?? '', 120)

  const ownCaseReferenceById = useMemo(() => {
    const mapped: Record<string, CaseReference> = {}
    myCases.forEach((item) => {
      mapped[item.id] = {
        caseNumber: item.numero_caso,
        fullName: `${item.nombres} ${item.apellidos}`.trim(),
      }
    })
    return mapped
  }, [myCases])

  const caseReferenceById = useMemo(
    () => ({ ...externalCaseReferenceById, ...ownCaseReferenceById }),
    [externalCaseReferenceById, ownCaseReferenceById],
  )

  const loadMySightings = useCallback(async () => {
    if (!user?.id) return

    setSightingsLoading(true)
    setSightingsError(null)

    try {
      const collected: UserSighting[] = []
      const fatalErrors: string[] = []

      const [firstSource, secondSource] = await Promise.all([
        fetchSightingsByUser('caso_avistamientos', user.id, ['reportado_por', 'user_id', 'autor_id']),
        fetchSightingsByUser('avistamientos', user.id, ['user_id', 'reportado_por', 'autor_id']),
      ])

      if (firstSource.errors.length > 0) {
        fatalErrors.push(firstSource.errors[firstSource.errors.length - 1] ?? 'No se pudieron cargar tus avistamientos.')
      }

      if (secondSource.errors.length > 0) {
        fatalErrors.push(secondSource.errors[secondSource.errors.length - 1] ?? 'No se pudieron cargar tus avistamientos.')
      }

      collected.push(
        ...firstSource.rows
          .map((row, index) => parseSightingRow(row as Record<string, unknown>, 'caso_avistamientos', index))
          .filter((item): item is UserSighting => item !== null),
        ...secondSource.rows
          .map((row, index) => parseSightingRow(row as Record<string, unknown>, 'avistamientos', index))
          .filter((item): item is UserSighting => item !== null),
      )

      if (collected.length === 0 && fatalErrors.length > 0) {
        throw new Error(fatalErrors[fatalErrors.length - 1] ?? 'No se pudieron cargar tus avistamientos.')
      }

      const uniqueByKey = new Map<string, UserSighting>()
      collected.forEach((item) => {
        const key = `${item.id}:${item.casoId}:${item.fecha ?? ''}:${item.hora ?? ''}`
        if (!uniqueByKey.has(key)) {
          uniqueByKey.set(key, item)
        }
      })

      const normalized = Array.from(uniqueByKey.values()).sort((a, b) => {
        const aTime = new Date(a.createdAt ?? a.fecha ?? 0).getTime()
        const bTime = new Date(b.createdAt ?? b.fecha ?? 0).getTime()
        return bTime - aTime
      })

      setSightings(normalized)

      const caseIds = [...new Set(normalized.map((item) => item.casoId).filter(Boolean))]
      if (caseIds.length === 0) {
        setExternalCaseReferenceById({})
      } else {
        const { data, error } = await supabase
          .from('casos')
          .select('id, numero_caso, nombres, apellidos')
          .in('id', caseIds)

        if (!error) {
          const mapped: Record<string, CaseReference> = {}
          ;(data ?? []).forEach((row) => {
            const safeRow = row as { id: string; numero_caso: string; nombres: string; apellidos: string }
            mapped[safeRow.id] = {
              caseNumber: safeRow.numero_caso,
              fullName: `${safeRow.nombres} ${safeRow.apellidos}`.trim(),
            }
          })
          setExternalCaseReferenceById(mapped)
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo cargar el historial de avistamientos.'
      setSightingsError(message)
      setSightings([])
      setExternalCaseReferenceById({})
    } finally {
      setSightingsLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    void loadMySightings()
  }, [loadMySightings])

  const openEditModal = async (targetCase: CasoReciente) => {
    if (!user?.id) return

    const reviewMeta = getReviewMeta(normalizeReviewStatus(targetCase.workflow_status))
    if (!reviewMeta.canEdit) {
      setNotice({
        type: 'warning',
        message: 'Este caso ya no puede editarse porque su revision esta finalizada.',
      })
      return
    }

    setEditLoading(true)
    setNotice(null)
    try {
      const row = (await fetchCaseForUser(targetCase.id, user.id)) as {
        id: string
        nombres: string | null
        apellidos: string | null
        fecha_desaparicion: string | null
        lugar_desaparicion: string | null
        descripcion_general: string | null
        workflow_status: CasoReciente['workflow_status']
      }

      const status = normalizeReviewStatus(row.workflow_status)
      if (status === 'approved' || status === 'found' || status === 'closed') {
        throw new Error('Solo puedes editar casos pendientes o rechazados.')
      }

      setEditingCaseId(row.id)
      setEditForm({
        nombres: row.nombres ?? '',
        apellidos: row.apellidos ?? '',
        fechaDesaparicion: row.fecha_desaparicion ?? '',
        lugarDesaparicion: row.lugar_desaparicion ?? '',
        descripcionGeneral: row.descripcion_general ?? '',
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo abrir el formulario de edicion.'
      setNotice({ type: 'error', message })
    } finally {
      setEditLoading(false)
    }
  }

  const closeEditModal = () => {
    if (editLoading) return
    setEditingCaseId(null)
    setEditForm(INITIAL_EDIT_FORM)
  }

  const saveCaseChanges = async (event: FormEvent) => {
    event.preventDefault()
    if (!editingCaseId || !user?.id || editLoading) return

    const nombres = editForm.nombres.trim()
    const apellidos = editForm.apellidos.trim()
    const lugarDesaparicion = editForm.lugarDesaparicion.trim()
    const descripcionGeneral = editForm.descripcionGeneral.trim()

    if (!nombres || !apellidos || !lugarDesaparicion || !descripcionGeneral) {
      setNotice({ type: 'warning', message: 'Completa nombres, apellidos, lugar y descripcion para guardar cambios.' })
      return
    }

    setEditLoading(true)
    try {
      await updateCaseForUser(
        editingCaseId,
        user.id,
        {
          nombres,
          apellidos,
          fecha_desaparicion: editForm.fechaDesaparicion || null,
          lugar_desaparicion: lugarDesaparicion,
          descripcion_general: descripcionGeneral,
          updated_at: new Date().toISOString(),
        },
        true,
      )

      await refetchCases()
      setNotice({ type: 'success', message: 'Caso actualizado correctamente.' })
      closeEditModal()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo guardar los cambios del caso.'
      setNotice({ type: 'error', message })
    } finally {
      setEditLoading(false)
    }
  }

  const retireCase = async (targetCase: CasoReciente) => {
    if (!user?.id || retireLoadingId) return
    const confirmMessage = `Retirar el caso ${targetCase.numero_caso}? Esta accion lo ocultara de tus listados.`
    if (!window.confirm(confirmMessage)) return

    setRetireLoadingId(targetCase.id)
    try {
      await updateCaseForUser(targetCase.id, user.id, {
        eliminado: true,
        eliminado_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      await refetchCases()
      setNotice({ type: 'success', message: `Caso ${targetCase.numero_caso} retirado.` })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo retirar el caso.'
      setNotice({ type: 'error', message })
    } finally {
      setRetireLoadingId(null)
    }
  }

  if (authLoading || !user) {
    return (
      <>
        <UserNavbar />
        <Spinner fullScreen />
      </>
    )
  }

  return (
    <>
      <UserNavbar />

      <main className="min-h-screen bg-background py-8 px-4">
        <div className="max-w-5xl mx-auto space-y-6">
          <Link
            to="/user"
            className="inline-flex items-center gap-1.5 text-xs text-text-secondary hover:text-primary transition-colors"
          >
            <ChevronLeft size={14} />
            Volver al inicio
          </Link>

          <section className="card p-6 sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold text-text-primary">Mis casos y avistamientos</h1>
                <p className="text-sm text-text-secondary mt-1">
                  Administra tus reportes, revisa su estado y da seguimiento a tu historial de avistamientos.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs text-text-secondary">
                <span className="font-semibold text-text-primary">{myCases.length}</span>
                casos registrados
              </div>
            </div>
          </section>

          {notice && <Alert type={notice.type} message={notice.message} />}

          <section className="card p-6 sm:p-7 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2">
                <span className="h-9 w-1.5 rounded-full bg-primary/70" />
                <div>
                  <h2 className="text-lg font-semibold text-text-primary">Mis casos</h2>
                  <p className="text-xs text-text-secondary">Listado de reportes activos y en revision.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-1 text-xs text-text-secondary">
                  Total: <span className="ml-1 font-semibold text-text-primary">{myCases.length}</span>
                </span>
              <button type="button" onClick={() => refetchCases()} className="btn-secondary text-xs !px-3 !py-1.5">
                Actualizar
              </button>
              </div>
            </div>

            {casesLoading && (
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <Spinner size="sm" />
                Cargando tus casos...
              </div>
            )}

            {casesError && (
              <div className="rounded-lg border border-error/30 bg-error/5 p-3">
                <p className="text-sm text-error">No se pudieron cargar tus casos.</p>
              </div>
            )}

            {!casesLoading && !casesError && myCases.length === 0 && (
              <div className="rounded-xl border border-border bg-background p-4 text-sm text-text-secondary">
                Aun no tienes casos publicados.
              </div>
            )}

            {!casesLoading && !casesError && myCases.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {myCases.map((item) => {
                  const reviewMeta = getReviewMeta(normalizeReviewStatus(item.workflow_status))
                  const retiring = retireLoadingId === item.id
                  return (
                    <article
                      key={item.id}
                      className="card p-4 space-y-3 transition-shadow duration-200 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-mono text-text-secondary">{item.numero_caso}</p>
                          <p className="text-base font-semibold text-text-primary mt-0.5">
                            {item.nombres} {item.apellidos}
                          </p>
                        </div>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${reviewMeta.className}`}>
                          {reviewMeta.label}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-text-secondary">
                        <span className="inline-flex items-center gap-1">
                          <Calendar size={12} />
                          {item.fecha_desaparicion ?? 'Sin fecha'}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin size={12} />
                          {item.ciudad ?? 'Sin ciudad'}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Link to={`/caso/${item.id}`} className="btn-secondary text-xs !px-3 !py-1.5 inline-flex items-center gap-1">
                          <Eye size={12} />
                          Ver
                        </Link>
                        {reviewMeta.canEdit && (
                          <button
                            type="button"
                            onClick={() => void openEditModal(item)}
                            className="btn-secondary text-xs !px-3 !py-1.5 inline-flex items-center gap-1"
                            disabled={editLoading}
                          >
                            <Edit3 size={12} />
                            Editar
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => void retireCase(item)}
                          className="btn-secondary text-xs !px-3 !py-1.5 inline-flex items-center gap-1 text-error border-error/30 hover:bg-error/5"
                          disabled={retiring}
                        >
                          <Trash2 size={12} />
                          {retiring ? 'Retirando...' : 'Retirar'}
                        </button>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </section>

          <section className="card p-6 sm:p-7 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2">
                <span className="h-9 w-1.5 rounded-full bg-info/70" />
                <div>
                  <h2 className="text-lg font-semibold text-text-primary">Mis avistamientos</h2>
                  <p className="text-xs text-text-secondary">Historial de reportes enviados por ti.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-1 text-xs text-text-secondary">
                  Total: <span className="ml-1 font-semibold text-text-primary">{sightings.length}</span>
                </span>
                <button type="button" onClick={() => void loadMySightings()} className="btn-secondary text-xs !px-3 !py-1.5">
                  Actualizar
                </button>
              </div>
            </div>

            {sightingsLoading && (
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <Spinner size="sm" />
                Cargando historial de avistamientos...
              </div>
            )}

            {sightingsError && (
              <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 flex items-center justify-between gap-3">
                <p className="text-xs text-text-secondary inline-flex items-center gap-1.5">
                  <AlertTriangle size={14} className="text-warning" />
                  {sightingsError}
                </p>
                <button type="button" onClick={() => void loadMySightings()} className="text-xs text-primary hover:underline">
                  Reintentar
                </button>
              </div>
            )}

            {!sightingsLoading && !sightingsError && sightings.length === 0 && (
              <div className="rounded-xl border border-border bg-background p-4 text-sm text-text-secondary">
                Aun no has enviado avistamientos.
              </div>
            )}

            {!sightingsLoading && !sightingsError && sightings.length > 0 && (
              <div className="space-y-3">
                {sightings.map((item) => {
                  const statusMeta = getSightingStatusMeta(item.status)
                  const caseReference = caseReferenceById[item.casoId]
                  const caseLabel = caseReference
                    ? `${caseReference.caseNumber} - ${caseReference.fullName}`
                    : `Caso ${item.casoId.slice(0, 8)}`

                  return (
                    <article
                      key={item.id}
                      className="card p-4 space-y-2 transition-shadow duration-200 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-text-primary">{caseLabel}</p>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${statusMeta.className}`}>
                          {statusMeta.label}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-text-secondary">
                        <span className="inline-flex items-center gap-1">
                          <Clock3 size={12} />
                          {formatSightingDate(item.fecha, item.hora)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin size={12} />
                          {item.lugar}
                        </span>
                      </div>

                      <p className="text-sm text-text-primary">{item.descripcion}</p>
                      <p className="text-[11px] text-text-secondary">Registrado: {formatRelativeDate(item.createdAt)}</p>
                    </article>
                  )
                })}
              </div>
            )}
          </section>
        </div>
      </main>

      {editingCaseId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/35"
            onClick={closeEditModal}
            disabled={editLoading}
          />

          <div className="relative card p-6 w-full max-w-2xl space-y-4">
            <h3 className="text-lg font-semibold text-text-primary">Editar caso</h3>
            <p className="text-xs text-text-secondary">
              Solo puedes editar casos pendientes o rechazados antes de su aprobacion final.
            </p>

            <form onSubmit={saveCaseChanges} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  className="input-field"
                  placeholder="Nombres"
                  value={editForm.nombres}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, nombres: event.target.value }))}
                />
                <input
                  className="input-field"
                  placeholder="Apellidos"
                  value={editForm.apellidos}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, apellidos: event.target.value }))}
                />
              </div>

              <input
                type="date"
                className="input-field"
                value={editForm.fechaDesaparicion}
                onChange={(event) => setEditForm((prev) => ({ ...prev, fechaDesaparicion: event.target.value }))}
              />

              <input
                className="input-field"
                placeholder="Lugar de desaparicion"
                value={editForm.lugarDesaparicion}
                onChange={(event) => setEditForm((prev) => ({ ...prev, lugarDesaparicion: event.target.value }))}
              />

              <textarea
                rows={4}
                className="input-field resize-none"
                placeholder="Descripcion general"
                value={editForm.descripcionGeneral}
                onChange={(event) => setEditForm((prev) => ({ ...prev, descripcionGeneral: event.target.value.slice(0, 500) }))}
              />

              <div className="flex items-center justify-end gap-2 pt-1">
                <button type="button" className="btn-secondary" onClick={closeEditModal} disabled={editLoading}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={editLoading}>
                  {editLoading ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
