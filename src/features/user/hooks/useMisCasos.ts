import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase/client'

type CasoStatus = 'activo' | 'en_revision' | 'avistado' | 'encontrado'
type CasoWorkflowStatus = 'pending' | 'approved' | 'rejected' | 'found' | 'closed'

interface FetchCaseOptions {
  hideResolved?: boolean
  hideRejected?: boolean
}

export interface CasoReciente {
  id: string
  numero_caso: string
  nombres: string
  apellidos: string
  status: CasoStatus
  workflow_status: CasoWorkflowStatus | null
  fecha_desaparicion: string | null
  ciudad: string | null
  foto_principal_url: string | null
  vistas: number
  total_fotos: number
  created_at: string | null
}

export interface CasoDetalle extends CasoReciente {
  edad: number | null
  genero: string | null
  lugar_desaparicion: string | null
  hora_desaparicion: string | null
  lugar_ultima_vez: string | null
  pais: string | null
  color_piel: string | null
  color_cabello: string | null
  color_ojos: string | null
  senas_particulares: string | null
  descripcion_general: string | null
  circunstancias: string | null
  ropa_descripcion: string | null
  idioma: string | null
  visibilidad_contacto: 'publico' | 'autoridades' | 'privado' | null
  telefono_contacto: string | null
  email_contacto: string | null
}

export interface CasoMedia {
  id: string
  caso_id: string
  tipo: 'foto' | 'video'
  url: string
  es_principal: boolean
  orden: number
  mime_type: string | null
  created_at: string | null
}

export interface CasoComentario {
  id: string
  autor: string
  contenido: string
  estado: string | null
  created_at: string | null
}

interface CasoStatsRow {
  status: CasoStatus
  vistas: number | null
}

interface CasoFallbackRow {
  id: string
  numero_caso: string
  nombres: string
  apellidos: string
  status: string | null
  workflow_status: string | null
  fecha_desaparicion: string | null
  ciudad: string | null
  vistas: number | null
  created_at: string | null
}

interface CasoDetalleFallbackRow {
  id: string
  numero_caso: string
  nombres: string
  apellidos: string
  edad: number | null
  genero: string | null
  status: string | null
  workflow_status: string | null
  vistas: number | null
  fecha_desaparicion: string | null
  hora_desaparicion: string | null
  lugar_desaparicion: string | null
  lugar_ultima_vez: string | null
  ciudad: string | null
  pais: string | null
  color_piel: string | null
  color_cabello: string | null
  color_ojos: string | null
  senas_particulares: string | null
  descripcion_general: string | null
  circunstancias: string | null
  ropa_descripcion: string | null
  idioma: string | null
  visibilidad_contacto: 'publico' | 'autoridades' | 'privado' | null
  telefono_contacto: string | null
  email_contacto: string | null
  created_at: string | null
}

const CASOS_FALLBACK_SELECT = `
  id,
  numero_caso,
  nombres,
  apellidos,
  status,
  workflow_status,
  fecha_desaparicion,
  ciudad,
  vistas,
  created_at
`

const CASO_DETALLE_FALLBACK_SELECT = `
  id,
  numero_caso,
  nombres,
  apellidos,
  edad,
  genero,
  status,
  workflow_status,
  vistas,
  fecha_desaparicion,
  hora_desaparicion,
  lugar_desaparicion,
  lugar_ultima_vez,
  ciudad,
  pais,
  color_piel,
  color_cabello,
  color_ojos,
  senas_particulares,
  descripcion_general,
  circunstancias,
  ropa_descripcion,
  idioma,
  visibilidad_contacto,
  telefono_contacto,
  email_contacto,
  created_at
`

const MEDIA_SELECT = 'id, caso_id, tipo, url, es_principal, orden, mime_type, created_at'

const QUERY_STALE_TIME = 1000 * 60 * 2

function normalizeStatus(value: string | null): CasoStatus {
  const normalized = value?.trim().toLowerCase() ?? ''
  if (normalized === 'activo' || normalized === 'en_revision' || normalized === 'avistado' || normalized === 'encontrado') {
    return normalized
  }
  if (normalized === 'resuelto' || normalized === 'cerrado') {
    return 'encontrado'
  }
  return 'activo'
}

function normalizeWorkflowStatus(value: string | null): CasoWorkflowStatus | null {
  const normalized = value?.trim().toLowerCase() ?? null
  if (
    normalized === 'pending' ||
    normalized === 'approved' ||
    normalized === 'rejected' ||
    normalized === 'found' ||
    normalized === 'closed'
  ) {
    return normalized
  }
  return null
}

function isResolvedCase(status: string | null, workflowStatus: string | null) {
  const normalizedStatus = status?.trim().toLowerCase() ?? ''
  const normalizedWorkflowStatus = workflowStatus?.trim().toLowerCase() ?? ''
  return (
    normalizedWorkflowStatus === 'found' ||
    normalizedWorkflowStatus === 'closed' ||
    normalizedStatus === 'encontrado' ||
    normalizedStatus === 'resuelto' ||
    normalizedStatus === 'cerrado'
  )
}

function shouldIncludeCase(status: string | null, workflowStatus: string | null, options: FetchCaseOptions) {
  const normalizedWorkflowStatus = workflowStatus?.trim().toLowerCase() ?? ''
  if (options.hideRejected && normalizedWorkflowStatus === 'rejected') {
    return false
  }

  if (options.hideResolved && isResolvedCase(status, workflowStatus)) {
    return false
  }

  return true
}

function normalizeText(value: unknown) {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

function pickText(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = normalizeText(row[key])
    if (value) return value
  }
  return null
}

function toCommentId(value: unknown, fallback: string) {
  if (typeof value === 'string' && value.trim()) return value
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return fallback
}

function normalizeCommentRow(row: Record<string, unknown>, index: number): CasoComentario | null {
  const contenido = pickText(row, [
    'comentario',
    'contenido',
    'mensaje',
    'texto',
    'detalle',
    'descripcion',
    'observacion',
    'nota',
  ])

  if (!contenido) return null

  const normalizedContent = contenido.trim().toUpperCase()
  if (normalizedContent.startsWith('[AVISTAMIENTO]') || normalizedContent.startsWith('[REPORTE_CONTENIDO]')) {
    return null
  }

  const autoridadNombre = pickText(row, [
    'autoridad_nombre',
    'nombre_autoridad',
    'autor',
    'author_name',
    'creado_por_nombre',
    'created_by_name',
  ])

  const autoridadId = pickText(row, ['autoridad_id', 'creado_por', 'created_by', 'user_id'])
  const autor = autoridadNombre ?? (autoridadId ? `Autoridad ${autoridadId.slice(0, 8)}` : 'Autoridad')

  return {
    id: toCommentId(row.id, `comentario-${index + 1}`),
    autor,
    contenido,
    estado: pickText(row, ['estado', 'status', 'tipo']),
    created_at: pickText(row, ['created_at', 'fecha', 'fecha_comentario', 'comentado_en', 'updated_at']),
  }
}

function isCommentListRecoverableError(message: string) {
  const lowered = message.toLowerCase()
  return (
    lowered.includes('row-level security policy') ||
    lowered.includes('permission denied') ||
    lowered.includes('relation') ||
    lowered.includes('does not exist')
  )
}

async function fetchRowsByCaseId(table: string, caseId: string) {
  const attempts = [
    () => supabase.from(table).select('*').eq('caso_id', caseId),
    () => supabase.from(table).select('*').eq('case_id', caseId),
  ]

  const errors: string[] = []
  for (const runQuery of attempts) {
    const response = await runQuery()
    if (!response.error) return response.data ?? []

    const message = response.error.message.toLowerCase()
    if (message.includes('column') && message.includes('does not exist')) {
      errors.push(response.error.message)
      continue
    }
    throw response.error
  }

  return [] as unknown[]
}

async function fetchCaseComments(caseId: string) {
  try {
    const rows = (await fetchRowsByCaseId('case_comments', caseId)) as Record<string, unknown>[]
    return rows
      .map((row, index) => normalizeCommentRow(row as Record<string, unknown>, index))
      .filter((row): row is CasoComentario => row !== null)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudieron cargar los comentarios.'
    if (isCommentListRecoverableError(message)) {
      return [] as CasoComentario[]
    }
    throw error
  }
}

async function fetchMediaForCases(caseIds: string[]) {
  if (caseIds.length === 0) return [] as CasoMedia[]

  const attempts = [
    () => supabase.from('media_case').select(MEDIA_SELECT).in('caso_id', caseIds).order('orden', { ascending: true }),
    () => supabase.from('media_case').select(MEDIA_SELECT).in('case_id', caseIds).order('orden', { ascending: true }),
  ]

  let data: CasoMedia[] | null = null
  let error: { message: string } | null = null

  for (const runQuery of attempts) {
    const response = await runQuery()
    if (!response.error) {
      data = (response.data ?? []) as CasoMedia[]
      error = null
      break
    }
    error = response.error
    const message = response.error.message.toLowerCase()
    if (message.includes('column') && message.includes('does not exist')) {
      continue
    }
    break
  }

  if (error) {
    const message = error.message.toLowerCase()
    if (message.includes('row-level security policy') || message.includes('permission denied')) {
      return [] as CasoMedia[]
    }
    throw error
  }

  const rows = (data ?? []) as Array<Record<string, unknown>>
  return rows.map((row) => ({
    id: String(row.id ?? ''),
    caso_id: (row.caso_id as string | undefined) ?? (row.case_id as string | undefined) ?? '',
    tipo: (row.tipo as CasoMedia['tipo']) ?? 'foto',
    url: (row.url as string) ?? '',
    es_principal: Boolean(row.es_principal ?? row.is_primary ?? row.principal ?? false),
    orden: typeof row.orden === 'number' ? row.orden : 0,
    mime_type: (row.mime_type as string | null) ?? null,
    created_at: (row.created_at as string | null) ?? null,
  }))
}

function mapRecienteFromFallback(rows: CasoFallbackRow[], media: CasoMedia[]): CasoReciente[] {
  return rows.map(row => {
    const caseMedia = media.filter(item => item.caso_id === row.id && item.tipo === 'foto')
    const principal = caseMedia.find(item => item.es_principal) ?? caseMedia[0]

    return {
      id: row.id,
      numero_caso: row.numero_caso,
      nombres: row.nombres,
      apellidos: row.apellidos,
      status: normalizeStatus(row.status),
      workflow_status: normalizeWorkflowStatus(row.workflow_status),
      fecha_desaparicion: row.fecha_desaparicion,
      ciudad: row.ciudad,
      foto_principal_url: principal?.url ?? null,
      vistas: row.vistas ?? 0,
      total_fotos: caseMedia.length,
      created_at: row.created_at,
    }
  })
}

async function fetchCasosFallback(limit?: number, userId?: string, options: FetchCaseOptions = {}): Promise<CasoReciente[]> {
  const hideResolved = options.hideResolved ?? false
  const hideRejected = options.hideRejected ?? false
  const queryLimit = typeof limit === 'number' ? (hideResolved || hideRejected ? limit * 4 : limit) : undefined

  let query = supabase
    .from('cases')
    .select(CASOS_FALLBACK_SELECT)
    .eq('eliminado', false)
    .order('created_at', { ascending: false })

  if (userId) {
    query = query.eq('publicado_por', userId)
  }

  if (typeof queryLimit === 'number') {
    query = query.limit(queryLimit)
  }

  const { data, error } = await query
  if (error) throw error

  const rows = (data ?? []) as CasoFallbackRow[]
  const visibleRows = rows.filter(row => shouldIncludeCase(row.status, row.workflow_status, { hideResolved, hideRejected }))
  const limitedRows = typeof limit === 'number' ? visibleRows.slice(0, limit) : visibleRows
  const media = await fetchMediaForCases(limitedRows.map(row => row.id))

  return mapRecienteFromFallback(limitedRows, media)
}

async function fetchCasos(limit?: number, userId?: string, options: FetchCaseOptions = {}): Promise<CasoReciente[]> {
  return fetchCasosFallback(limit, userId, options)
}

export function useMisCasos(userId: string, limit = 3) {
  return useQuery({
    queryKey: ['mis-casos', userId, limit],
    queryFn: () => fetchCasos(limit, userId),
    enabled: !!userId,
    staleTime: QUERY_STALE_TIME,
  })
}

export function useCasosGenerales(limit = 24, options: { hideResolved?: boolean; hideRejected?: boolean } = {}) {
  const hideResolved = options.hideResolved ?? false
  const hideRejected = options.hideRejected ?? false

  return useQuery({
    queryKey: ['casos-generales', limit, hideResolved, hideRejected],
    queryFn: () => fetchCasos(limit, undefined, { hideResolved, hideRejected }),
    staleTime: QUERY_STALE_TIME,
  })
}

export function useCasoDetalle(caseId: string) {
  return useQuery({
    queryKey: ['caso-detalle', caseId],
    enabled: !!caseId,
    staleTime: QUERY_STALE_TIME,
    queryFn: async () => {
      const [fallback, media, comentarios] = await Promise.all([
        supabase.from('cases').select(CASO_DETALLE_FALLBACK_SELECT).eq('id', caseId).single(),
        fetchMediaForCases([caseId]),
        fetchCaseComments(caseId),
      ])

      if (fallback.error) throw fallback.error

      const fallbackCase = fallback.data as CasoDetalleFallbackRow
      const photoMedia = media.filter(item => item.tipo === 'foto')
      const mainPhoto = photoMedia.find(item => item.es_principal) ?? photoMedia[0]

      const caso: CasoDetalle = {
        id: fallbackCase.id,
        numero_caso: fallbackCase.numero_caso,
        nombres: fallbackCase.nombres,
        apellidos: fallbackCase.apellidos,
        edad: fallbackCase.edad,
        genero: fallbackCase.genero,
        status: normalizeStatus(fallbackCase.status),
        workflow_status: normalizeWorkflowStatus(fallbackCase.workflow_status),
        vistas: fallbackCase.vistas ?? 0,
        fecha_desaparicion: fallbackCase.fecha_desaparicion,
        hora_desaparicion: fallbackCase.hora_desaparicion,
        lugar_desaparicion: fallbackCase.lugar_desaparicion,
        lugar_ultima_vez: fallbackCase.lugar_ultima_vez,
        ciudad: fallbackCase.ciudad,
        pais: fallbackCase.pais,
        color_piel: fallbackCase.color_piel,
        color_cabello: fallbackCase.color_cabello,
        color_ojos: fallbackCase.color_ojos,
        senas_particulares: fallbackCase.senas_particulares,
        descripcion_general: fallbackCase.descripcion_general,
        circunstancias: fallbackCase.circunstancias,
        ropa_descripcion: fallbackCase.ropa_descripcion,
        idioma: fallbackCase.idioma,
        visibilidad_contacto: fallbackCase.visibilidad_contacto,
        telefono_contacto: fallbackCase.telefono_contacto,
        email_contacto: fallbackCase.email_contacto,
        foto_principal_url: mainPhoto?.url ?? null,
        total_fotos: photoMedia.length,
        created_at: fallbackCase.created_at,
      }

      return { caso, media, comentarios }
    },
  })
}

// Hook para estadisticas del usuario (conteos)
export function useMisEstadisticas(userId: string) {
  return useQuery({
    queryKey: ['mis-estadisticas', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cases')
        .select('status, vistas')
        .eq('publicado_por', userId)
        .eq('eliminado', false)

      if (error) throw error

      const casos = (data ?? []) as CasoStatsRow[]
      return {
        total: casos.length,
        activos: casos.filter(c => c.status === 'activo' || c.status === 'en_revision').length,
        encontrados: casos.filter(c => c.status === 'encontrado').length,
        totalVistas: casos.reduce((acc, c) => acc + (c.vistas ?? 0), 0),
      }
    },
    enabled: !!userId,
    staleTime: QUERY_STALE_TIME,
  })
}
