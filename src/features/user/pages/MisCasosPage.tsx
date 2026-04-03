import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Calendar, ChevronLeft, Clock3, Edit3, Eye, MapPin, Trash2 } from 'lucide-react'
import { useAuth } from '../../auth/hooks'
import { Alert, Spinner } from '../../../shared/components/ui'
import { supabase } from '../../../lib/supabase/client'
import { createCaseComment, getProfilesBasicByIds } from '../../../lib/supabase/db'
import { uploadFile } from '../../../shared/utils/api'
import UserNavbar from '../components/UserNavbar'
import { type CasoReciente, useMisCasos } from '../hooks/useMisCasos'

type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'found' | 'closed'
type SightingStatus = 'pendiente' | 'validado' | 'rechazado'
type UserCaseState = 'borrador' | 'publicado' | 'encontrado' | 'archivado'

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

interface CaseComment {
  id: string
  caseId: string
  authorId: string
  text: string
  createdAt: string | null
}

interface EditCaseForm {
  nombres: string
  apellidos: string
  fechaDesaparicion: string
  lugarDesaparicion: string
  lugarUltimaVez: string
  ciudad: string
  lat: string
  lng: string
  descripcionGeneral: string
}

interface NoticeState {
  type: 'error' | 'success' | 'warning' | 'info'
  message: string
}

const OWNER_COLUMN_CANDIDATES = ['publicado_por', 'user_id', 'autor_id'] as const
const RESOLUTION_DATE_FIELDS = ['fecha_resolucion', 'fecha_encontrado', 'fecha_cierre', 'fecha_resuelto', 'resuelto_en']
const RESOLUTION_COMMENT_FIELDS = ['comentario_final', 'comentario_cierre', 'nota_cierre', 'observacion_final']

const CASES_BUCKET = 'casos-media'
const CONFIGURED_CASES_BUCKET = (import.meta.env.VITE_CASES_BUCKET as string | undefined)?.trim()
const ACTIVE_CASES_BUCKET = CONFIGURED_CASES_BUCKET || CASES_BUCKET

const MAX_PHOTOS = 10
const MAX_PHOTO_SIZE = 10 * 1024 * 1024
const MAX_VIDEO_SIZE = 50 * 1024 * 1024
const OFFICIAL_DOCUMENT_PATTERNS = [
  'cedula',
  'dni',
  'pasaporte',
  'passport',
  'documento',
  'document',
  'identidad',
  'idcard',
  'id_card',
  'licencia',
  'license',
]

interface MediaMeta {
  total: number
  nextOrder: number
  hasPrincipal: boolean
  ids: string[]
  paths: string[]
}

const INITIAL_EDIT_FORM: EditCaseForm = {
  nombres: '',
  apellidos: '',
  fechaDesaparicion: '',
  lugarDesaparicion: '',
  lugarUltimaVez: '',
  ciudad: '',
  lat: '',
  lng: '',
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

function getUserCaseState(caso: CasoReciente): { value: UserCaseState; label: string; className: string } {
  if (caso.workflow_status === 'closed') {
    return { value: 'archivado', label: 'Archivado', className: 'bg-text-secondary/10 text-text-secondary' }
  }
  if (caso.workflow_status === 'found' || caso.status === 'encontrado') {
    return { value: 'encontrado', label: 'Encontrado', className: 'bg-success/10 text-success' }
  }
  if (!caso.workflow_status) {
    return { value: 'borrador', label: 'Borrador', className: 'bg-warning/10 text-warning' }
  }
  return { value: 'publicado', label: 'Publicado', className: 'bg-info/10 text-info' }
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

function normalizeFileName(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

function isOfficialDocumentFileName(name: string) {
  const normalized = normalizeFileName(name)
  return OFFICIAL_DOCUMENT_PATTERNS.some(pattern => normalized.includes(pattern))
}

function getFileExtension(file: File, fallback: string) {
  const fromName = file.name.split('.').pop()?.toLowerCase()
  if (fromName) return fromName
  if (file.type.includes('/')) return file.type.split('/')[1] ?? fallback
  return fallback
}

function createMediaToken() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`
}

function buildUbicacionPoint(lat: string, lng: string) {
  const latNum = Number(lat)
  const lngNum = Number(lng)
  if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) return null
  return `POINT(${lngNum} ${latNum})`
}

async function fetchMediaMeta(caseId: string): Promise<MediaMeta> {
  const response = await supabase
    .from('media_case')
    .select('id, storage_path, es_principal, orden')
    .eq('caso_id', caseId)

  if (response.error) {
    return { total: 0, nextOrder: 1, hasPrincipal: false, ids: [], paths: [] }
  }

  const rows = (response.data ?? []) as Array<Record<string, unknown>>
  const maxOrder = rows.reduce((acc, row) => Math.max(acc, Number(row.orden ?? 0)), 0)
  const hasPrincipal = rows.some(row => Boolean(row.es_principal))
  const ids = rows.map(row => String(row.id ?? '')).filter(Boolean)
  const paths = rows
    .map(row => (row.storage_path as string | undefined) ?? '')
    .filter(Boolean)
  return {
    total: rows.length,
    nextOrder: maxOrder + 1,
    hasPrincipal,
    ids,
    paths,
  }
}

function validateEditMedia(photos: File[], video: File | null, existingTotal: number) {
  if (photos.length > MAX_PHOTOS) {
    throw new Error(`Solo se permiten ${MAX_PHOTOS} fotos por caso.`)
  }

  if (existingTotal + photos.length > MAX_PHOTOS) {
    throw new Error(`Ya tienes ${existingTotal} fotos. El limite total es ${MAX_PHOTOS}.`)
  }

  const documentPhoto = photos.find(file => isOfficialDocumentFileName(file.name))
  if (documentPhoto) {
    throw new Error(`No se permiten documentos oficiales. Elimina "${documentPhoto.name}".`)
  }

  const invalidPhoto = photos.find(file => !file.type.startsWith('image/'))
  if (invalidPhoto) {
    throw new Error(`"${invalidPhoto.name}" no es una imagen valida.`)
  }

  const largePhoto = photos.find(file => file.size > MAX_PHOTO_SIZE)
  if (largePhoto) {
    throw new Error(`"${largePhoto.name}" supera el limite de 10 MB.`)
  }

  if (video) {
    if (isOfficialDocumentFileName(video.name)) {
      throw new Error('No se permiten documentos oficiales en el video.')
    }
    if (!video.type.startsWith('video/')) {
      throw new Error('El archivo de video no tiene un formato valido.')
    }
    if (video.size > MAX_VIDEO_SIZE) {
      throw new Error('El video supera el limite de 50 MB.')
    }
  }
}

async function uploadCaseMediaUpdate(
  caseId: string,
  userId: string,
  photos: File[],
  video: File | null,
  meta: MediaMeta,
) {
  const mediaRows: Array<Record<string, unknown>> = []
  let order = meta.nextOrder
  let principalAssigned = meta.hasPrincipal

  for (const [index, file] of photos.entries()) {
    const ext = getFileExtension(file, 'jpg')
    const path = `cases/${caseId}/images/${createMediaToken()}-${index}.${ext}`
    const url = await uploadFile(ACTIVE_CASES_BUCKET, path, file)
    mediaRows.push({
      caso_id: caseId,
      subido_por: userId,
      storage_path: path,
      tipo: 'foto',
      url,
      es_principal: !principalAssigned,
      orden: order,
      mime_type: file.type || null,
    })
    principalAssigned = true
    order += 1
  }

  if (video) {
    const ext = getFileExtension(video, 'mp4')
    const path = `cases/${caseId}/videos/${createMediaToken()}.${ext}`
    const url = await uploadFile(ACTIVE_CASES_BUCKET, path, video)
    mediaRows.push({
      caso_id: caseId,
      subido_por: userId,
      storage_path: path,
      tipo: 'video',
      url,
      es_principal: false,
      orden: order,
      mime_type: video.type || null,
    })
  }

  if (mediaRows.length === 0) return

  const { error } = await supabase.from('media_case').insert(mediaRows)
  if (error) throw error
}

async function deleteCaseMedia(meta: MediaMeta) {
  if (meta.ids.length > 0) {
    await supabase.from('media_case').delete().in('id', meta.ids)
  }
  if (meta.paths.length > 0) {
    await supabase.storage.from(ACTIVE_CASES_BUCKET).remove(meta.paths)
  }
}

async function fetchCaseForUser(caseId: string, userId: string) {
  const errors: string[] = []

  for (const column of OWNER_COLUMN_CANDIDATES) {
    const { data, error } = await supabase
      .from('cases')
      .select(
        'id, nombres, apellidos, fecha_desaparicion, lugar_desaparicion, lugar_ultima_vez, ciudad, descripcion_general, workflow_status'
      )
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
      .from('cases')
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
      if (message.includes('column') && message.includes('workflow_status')) {
        const { workflow_status: _, ...rest } = payload
        if (Object.keys(rest).length > 0) {
          const retry = await supabase
            .from('cases')
            .update(rest)
            .eq('id', caseId)
            .eq(column, userId)
            .select('id')
            .maybeSingle()
          if (!retry.error && retry.data) return true
        }
      }
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

function formatCommentDate(value: string | null) {
  if (!value) return 'Reciente'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleString('es-DO', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function normalizeCommentRow(row: Record<string, unknown>): CaseComment | null {
  const rawText = typeof row.comentario === 'string' ? row.comentario.trim() : ''
  if (!rawText) return null

  const upper = rawText.toUpperCase()
  if (upper.startsWith('[PUBLICO]') || upper.startsWith('[AVISTAMIENTO]') || upper.startsWith('[REPORTE_CONTENIDO]')) {
    return null
  }

  const caseId = (row.caso_id as string | undefined) ?? ''
  if (!caseId) return null

  return {
    id: String(row.id ?? ''),
    caseId,
    authorId: String(row.autor_id ?? ''),
    text: rawText,
    createdAt: (row.created_at as string | null) ?? null,
  }
}

async function fetchCaseCommentsByIds(caseIds: string[]) {
  if (caseIds.length === 0) return [] as CaseComment[]

  const response = await supabase
    .from('case_comments')
    .select('id, caso_id, autor_id, comentario, created_at')
    .in('caso_id', caseIds)
    .order('created_at', { ascending: true })

  if (response.error) throw response.error

  return (response.data ?? [])
    .map((row) => normalizeCommentRow(row as Record<string, unknown>))
    .filter((row): row is CaseComment => row !== null)
}

export default function MisCasosPage() {
  const { user, loading: authLoading } = useAuth()
  const [notice, setNotice] = useState<NoticeState | null>(null)
  const [sightings, setSightings] = useState<UserSighting[]>([])
  const [sightingsLoading, setSightingsLoading] = useState(false)
  const [sightingsError, setSightingsError] = useState<string | null>(null)
  const [commentsByCaseId, setCommentsByCaseId] = useState<Record<string, CaseComment[]>>({})
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [commentsError, setCommentsError] = useState<string | null>(null)
  const [commentAuthorById, setCommentAuthorById] = useState<Record<string, string>>({})
  const [expandedCommentsByCaseId, setExpandedCommentsByCaseId] = useState<Record<string, boolean>>({})
  const [externalCaseReferenceById, setExternalCaseReferenceById] = useState<Record<string, CaseReference>>({})
  const [editingCaseId, setEditingCaseId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<EditCaseForm>(INITIAL_EDIT_FORM)
  const [editLoading, setEditLoading] = useState(false)
  const [retireLoadingId, setRetireLoadingId] = useState<string | null>(null)
  const [stateLoadingId, setStateLoadingId] = useState<string | null>(null)
  const [mediaMeta, setMediaMeta] = useState<MediaMeta>({ total: 0, nextOrder: 1, hasPrincipal: false, ids: [], paths: [] })
  const [newPhotos, setNewPhotos] = useState<File[]>([])
  const [newVideo, setNewVideo] = useState<File | null>(null)
  const [replaceMedia, setReplaceMedia] = useState(false)
  const [mediaError, setMediaError] = useState<string | null>(null)
  const [closingCase, setClosingCase] = useState<CasoReciente | null>(null)
  const [resolutionDate, setResolutionDate] = useState('')
  const [resolutionComment, setResolutionComment] = useState('')
  const [resolutionError, setResolutionError] = useState<string | null>(null)
  const [resolutionLoading, setResolutionLoading] = useState(false)

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

  const openCloseCaseModal = (target: CasoReciente) => {
    setClosingCase(target)
    setResolutionDate(new Date().toISOString().slice(0, 10))
    setResolutionComment('')
    setResolutionError(null)
  }

  const closeCloseCaseModal = () => {
    if (resolutionLoading) return
    setClosingCase(null)
    setResolutionError(null)
  }

  const updateCaseOptionalField = async (
    caseId: string,
    userId: string,
    field: string,
    value: string,
  ) => {
    let lastError: string | null = null
    for (const column of OWNER_COLUMN_CANDIDATES) {
      const { data, error } = await supabase
        .from('cases')
        .update({ [field]: value })
        .eq('id', caseId)
        .eq(column, userId)
        .select('id')
        .maybeSingle()

      if (!error && data) return true

      if (error) {
        const message = error.message.toLowerCase()
        if (message.includes('column') && message.includes('does not exist')) {
          return false
        }
        if (message.includes('row-level security policy') || message.includes('permission denied')) {
          throw new Error('No tienes permisos para modificar este caso.')
        }
        lastError = error.message
      }
    }

    if (lastError) throw new Error(lastError)
    return false
  }

  const updateResolutionFields = async (caseId: string, userId: string, dateValue: string, commentValue: string) => {
    for (const field of RESOLUTION_DATE_FIELDS) {
      const updated = await updateCaseOptionalField(caseId, userId, field, dateValue)
      if (updated) break
    }

    for (const field of RESOLUTION_COMMENT_FIELDS) {
      const updated = await updateCaseOptionalField(caseId, userId, field, commentValue)
      if (updated) break
    }
  }

  const loadCaseComments = useCallback(async () => {
    if (!user?.id) return
    const caseIds = myCases.map((item) => item.id)
    setCommentsLoading(true)
    setCommentsError(null)

    try {
      const comments = await fetchCaseCommentsByIds(caseIds)
      const grouped: Record<string, CaseComment[]> = {}
      comments.forEach((comment) => {
        if (!grouped[comment.caseId]) grouped[comment.caseId] = []
        grouped[comment.caseId].push(comment)
      })
      setCommentsByCaseId(grouped)

      const authorIds = Array.from(new Set(comments.map((comment) => comment.authorId).filter(Boolean)))
      if (authorIds.length > 0) {
        try {
          const profiles = await getProfilesBasicByIds(authorIds)
          const mapped: Record<string, string> = {}
          profiles.forEach((profile) => {
            const fullName = [profile.name, profile.last_name].filter(Boolean).join(' ').trim()
            mapped[profile.id] = fullName || profile.email || `Usuario ${profile.id.slice(0, 8)}`
          })
          setCommentAuthorById(mapped)
        } catch {
          setCommentAuthorById({})
        }
      } else {
        setCommentAuthorById({})
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudieron cargar los comentarios.'
      setCommentsError(message)
      setCommentsByCaseId({})
      setCommentAuthorById({})
    } finally {
      setCommentsLoading(false)
    }
  }, [myCases, user?.id])

  const loadMySightings = useCallback(async () => {
    if (!user?.id) return

    setSightingsLoading(true)
    setSightingsError(null)

    try {
      const collected: UserSighting[] = []
      const fatalErrors: string[] = []

      const { rows, errors } = await fetchSightingsByUser('case_sightings', user.id, [
        'reportado_por',
        'user_id',
        'autor_id',
      ])

      if (errors.length > 0) {
        fatalErrors.push(errors[errors.length - 1] ?? 'No se pudieron cargar tus avistamientos.')
      }

      collected.push(
        ...rows
          .map((row, index) => parseSightingRow(row as Record<string, unknown>, 'case_sightings', index))
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
          .from('cases')
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
      let message = err instanceof Error ? err.message : 'No se pudo cargar el historial de avistamientos.'
      const lowered = message.toLowerCase()
      if (lowered.includes('row-level security policy') || lowered.includes('permission denied')) {
        message = 'No tienes permisos para ver tus avistamientos. Revisa las politicas RLS en Supabase.'
      }
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

  useEffect(() => {
    void loadCaseComments()
  }, [loadCaseComments])

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
        lugar_ultima_vez: string | null
        ciudad: string | null
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
        lugarUltimaVez: row.lugar_ultima_vez ?? '',
        ciudad: row.ciudad ?? '',
        lat: '',
        lng: '',
        descripcionGeneral: row.descripcion_general ?? '',
      })
      const meta = await fetchMediaMeta(row.id)
      setMediaMeta(meta)
      setNewPhotos([])
      setNewVideo(null)
      setReplaceMedia(false)
      setMediaError(null)
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
    setNewPhotos([])
    setNewVideo(null)
    setReplaceMedia(false)
    setMediaError(null)
  }

  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    setNewPhotos(files)
  }

  const handleVideoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    setNewVideo(file)
  }

  const saveCaseChanges = async (event: FormEvent) => {
    event.preventDefault()
    if (!editingCaseId || !user?.id || editLoading) return

    const nombres = editForm.nombres.trim()
    const apellidos = editForm.apellidos.trim()
    const lugarDesaparicion = editForm.lugarDesaparicion.trim()
    const lugarUltimaVez = editForm.lugarUltimaVez.trim()
    const ciudad = editForm.ciudad.trim()
    const descripcionGeneral = editForm.descripcionGeneral.trim()

    if (!nombres || !apellidos || !lugarDesaparicion || !descripcionGeneral) {
      setNotice({ type: 'warning', message: 'Completa nombres, apellidos, lugar y descripcion para guardar cambios.' })
      return
    }

    setMediaError(null)
    try {
      if (newPhotos.length > 0 || newVideo) {
        validateEditMedia(newPhotos, newVideo, replaceMedia ? 0 : mediaMeta.total)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Archivos invalidos.'
      setMediaError(message)
      return
    }

    setEditLoading(true)
    try {
      const ubicacion = buildUbicacionPoint(editForm.lat, editForm.lng)
      await updateCaseForUser(
        editingCaseId,
        user.id,
        {
          nombres,
          apellidos,
          fecha_desaparicion: editForm.fechaDesaparicion || null,
          lugar_desaparicion: lugarDesaparicion,
          lugar_ultima_vez: lugarUltimaVez || null,
          ciudad: ciudad || null,
          ubicacion,
          descripcion_general: descripcionGeneral,
          updated_at: new Date().toISOString(),
        },
        true,
      )

      if (newPhotos.length > 0 || newVideo) {
        if (replaceMedia) {
          await deleteCaseMedia(mediaMeta)
        }
        const nextMeta = replaceMedia
          ? { total: 0, nextOrder: 1, hasPrincipal: false, ids: [], paths: [] }
          : mediaMeta
        await uploadCaseMediaUpdate(editingCaseId, user.id, newPhotos, newVideo, nextMeta)
        const refreshed = await fetchMediaMeta(editingCaseId)
        setMediaMeta(refreshed)
      }

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

  const updateCaseState = async (targetCase: CasoReciente, nextState: UserCaseState) => {
    if (!user?.id || stateLoadingId) return

    if (nextState === 'encontrado') {
      openCloseCaseModal(targetCase)
      return
    }

    const confirmMessage = `Cambiar estado a "${nextState}" para el caso ${targetCase.numero_caso}?`
    if (!window.confirm(confirmMessage)) return

    setStateLoadingId(targetCase.id)
    setNotice(null)

    const basePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

      if (nextState === 'archivado') {
        basePayload.workflow_status = 'closed'
      }

    if (nextState === 'publicado') {
      basePayload.status = 'activo'
      basePayload.workflow_status = 'pending'
    }

    if (nextState === 'borrador') {
      basePayload.workflow_status = null
    }

    try {
      await updateCaseForUser(targetCase.id, user.id, basePayload)
      await refetchCases()
      setNotice({ type: 'success', message: `Estado actualizado a "${nextState}".` })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo actualizar el estado.'
      setNotice({ type: 'error', message })
      } finally {
        setStateLoadingId(null)
      }
    }

  const confirmCloseCase = async () => {
    if (!closingCase || !user?.id || resolutionLoading) return

    if (!resolutionDate) {
      setResolutionError('Selecciona la fecha de resolucion.')
      return
    }

    const trimmedComment = resolutionComment.trim()
    if (trimmedComment.length < 3) {
      setResolutionError('Agrega un comentario final (minimo 3 caracteres).')
      return
    }

    setResolutionLoading(true)
    setResolutionError(null)

    try {
      const basePayload: Record<string, unknown> = {
        status: 'encontrado',
        workflow_status: 'found',
        updated_at: new Date().toISOString(),
      }

      await updateCaseForUser(closingCase.id, user.id, basePayload)
      await updateResolutionFields(closingCase.id, user.id, resolutionDate, trimmedComment)
      await createCaseComment(
        closingCase.id,
        user.id,
        `[CIERRE] ${trimmedComment} (Fecha: ${resolutionDate})`,
      )
      await refetchCases()
      setNotice({ type: 'success', message: 'Caso marcado como encontrado.' })
      setClosingCase(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo cerrar el caso.'
      setResolutionError(message)
    } finally {
      setResolutionLoading(false)
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
                  const caseState = getUserCaseState(item)
                  const updatingState = stateLoadingId === item.id
                  const caseComments = commentsByCaseId[item.id] ?? []
                  const isExpanded = expandedCommentsByCaseId[item.id] ?? false
                  const visibleComments = isExpanded ? caseComments : caseComments.slice(-3)
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
                        <div className="flex flex-col items-end gap-1">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${reviewMeta.className}`}>
                            {reviewMeta.label}
                          </span>
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${caseState.className}`}>
                            {caseState.label}
                          </span>
                        </div>
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
                        {caseState.value !== 'encontrado' && (
                          <button
                            type="button"
                            onClick={() => openCloseCaseModal(item)}
                            className="btn-secondary text-xs !px-3 !py-1.5 inline-flex items-center gap-1"
                            disabled={updatingState}
                          >
                            Marcar encontrada
                          </button>
                        )}
                        {caseState.value !== 'archivado' && (
                          <button
                            type="button"
                            onClick={() => void updateCaseState(item, 'archivado')}
                            className="btn-secondary text-xs !px-3 !py-1.5 inline-flex items-center gap-1"
                            disabled={updatingState}
                          >
                            Archivar
                          </button>
                        )}
                        {(caseState.value === 'archivado' || caseState.value === 'borrador') && (
                          <button
                            type="button"
                            onClick={() => void updateCaseState(item, 'publicado')}
                            className="btn-secondary text-xs !px-3 !py-1.5 inline-flex items-center gap-1"
                            disabled={updatingState}
                          >
                            Publicar
                          </button>
                        )}
                        {caseState.value === 'encontrado' && (
                          <button
                            type="button"
                            onClick={() => void updateCaseState(item, 'publicado')}
                            className="btn-secondary text-xs !px-3 !py-1.5 inline-flex items-center gap-1"
                            disabled={updatingState}
                          >
                            Reabrir
                          </button>
                        )}
                      </div>

                      <div className="border-t border-border pt-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-text-primary">Comentarios</p>
                          <span className="text-[11px] text-text-secondary">
                            {commentsLoading ? 'Cargando...' : caseComments.length}
                          </span>
                        </div>

                        {commentsError && (
                          <p className="text-[11px] text-error">{commentsError}</p>
                        )}

                        {!commentsLoading && caseComments.length === 0 && !commentsError && (
                          <p className="text-xs text-text-secondary">Aun no hay comentarios para este caso.</p>
                        )}

                        {caseComments.length > 0 && (
                          <div className="space-y-2">
                            {visibleComments.map((comment) => (
                              <div key={comment.id} className="rounded-md border border-border bg-background px-3 py-2">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-[11px] font-semibold text-text-primary">
                                    {comment.authorId === user?.id
                                      ? 'Tu'
                                      : commentAuthorById[comment.authorId] ?? `Usuario ${comment.authorId.slice(0, 8)}`}
                                  </p>
                                  <p className="text-[11px] text-text-secondary">
                                    {formatCommentDate(comment.createdAt)}
                                  </p>
                                </div>
                                <p className="text-sm text-text-primary mt-1 whitespace-pre-wrap">
                                  {comment.text}
                                </p>
                              </div>
                            ))}
                            {caseComments.length > 3 && (
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedCommentsByCaseId((prev) => ({
                                    ...prev,
                                    [item.id]: !isExpanded,
                                  }))
                                }
                                className="text-xs text-primary hover:underline self-start"
                              >
                                {isExpanded ? 'Ver menos' : 'Ver mas'}
                              </button>
                            )}
                          </div>
                        )}
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  className="input-field"
                  placeholder="Ciudad"
                  value={editForm.ciudad}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, ciudad: event.target.value }))}
                />
                <input
                  className="input-field"
                  placeholder="Lugar ultima vez"
                  value={editForm.lugarUltimaVez}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, lugarUltimaVez: event.target.value }))}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  className="input-field"
                  placeholder="Latitud (opcional)"
                  value={editForm.lat}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, lat: event.target.value }))}
                />
                <input
                  className="input-field"
                  placeholder="Longitud (opcional)"
                  value={editForm.lng}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, lng: event.target.value }))}
                />
              </div>

              <textarea
                rows={4}
                className="input-field resize-none"
                placeholder="Descripcion general"
                value={editForm.descripcionGeneral}
                onChange={(event) => setEditForm((prev) => ({ ...prev, descripcionGeneral: event.target.value.slice(0, 500) }))}
              />

              <div className="space-y-2">
                <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Actualizar fotos y video</p>
                <p className="text-xs text-text-secondary">
                  Fotos actuales: {mediaMeta.total}. Puedes agregar nuevas o reemplazar todo.
                </p>
                <label className="flex items-center gap-2 text-xs text-text-secondary">
                  <input
                    type="checkbox"
                    checked={replaceMedia}
                    onChange={(event) => setReplaceMedia(event.target.checked)}
                  />
                  Reemplazar media actual
                </label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="input-field"
                />
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleVideoChange}
                  className="input-field"
                />
                {mediaError && <p className="text-xs text-error">{mediaError}</p>}
              </div>

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

      {closingCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/35"
            onClick={closeCloseCaseModal}
            disabled={resolutionLoading}
          />

          <div className="relative card p-6 w-full max-w-lg space-y-4">
            <h3 className="text-lg font-semibold text-text-primary">Cerrar caso</h3>
            <p className="text-xs text-text-secondary">
              Marca el caso como encontrado, registra la fecha de resolucion y un comentario final.
            </p>

            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold text-text-secondary">Caso</p>
                <p className="text-sm text-text-primary">
                  {closingCase.numero_caso} - {closingCase.nombres} {closingCase.apellidos}
                </p>
              </div>

              <label className="block text-xs font-semibold text-text-secondary">
                Fecha de resolucion
                <input
                  type="date"
                  className="input-field mt-1"
                  value={resolutionDate}
                  onChange={(event) => setResolutionDate(event.target.value)}
                />
              </label>

              <label className="block text-xs font-semibold text-text-secondary">
                Comentario final
                <textarea
                  rows={3}
                  className="input-field resize-none mt-1"
                  value={resolutionComment}
                  onChange={(event) => setResolutionComment(event.target.value.slice(0, 300))}
                  placeholder="Ej: La persona fue reunificada con su familia."
                />
                <span className="text-[11px] text-text-secondary">{resolutionComment.length}/300</span>
              </label>

              {resolutionError && <p className="text-xs text-error">{resolutionError}</p>}
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                className="btn-secondary"
                onClick={closeCloseCaseModal}
                disabled={resolutionLoading}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => void confirmCloseCase()}
                disabled={resolutionLoading}
              >
                {resolutionLoading ? 'Guardando...' : 'Confirmar cierre'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
