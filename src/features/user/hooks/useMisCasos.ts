import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase/client'

type CasoStatus = 'activo' | 'en_revision' | 'avistado' | 'encontrado'
type CasoWorkflowStatus = 'pending' | 'approved' | 'rejected' | 'found' | 'closed'

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
  person_id?: string | null
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

interface CasoViewRow {
  id: string
  numero_caso: string
  nombres: string
  apellidos: string
  status: string | null
  workflow_status: string | null
  fecha_desaparicion: string | null
  ciudad: string | null
  foto_principal_url: string | null
  vistas: number | null
  total_fotos: number | null
  created_at: string | null
}

interface CasoDetalleFallbackRow {
  person_id?: string | null
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

const CASOS_SELECT = `
  id,
  numero_caso,
  nombres,
  apellidos,
  status,
  workflow_status,
  fecha_desaparicion,
  ciudad,
  foto_principal_url,
  vistas,
  total_fotos,
  created_at
`

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

const CASO_DETALLE_SELECT = `
  id,
  person_id,
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
  foto_principal_url,
  total_fotos,
  created_at
`

const CASO_DETALLE_FALLBACK_SELECT = `
  id,
  person_id,
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
  if (value === 'activo' || value === 'en_revision' || value === 'avistado' || value === 'encontrado') {
    return value
  }
  if (value === 'resuelto' || value === 'cerrado') {
    return 'encontrado'
  }
  return 'activo'
}

function normalizeWorkflowStatus(value: string | null): CasoWorkflowStatus | null {
  if (value === 'pending' || value === 'approved' || value === 'rejected' || value === 'found' || value === 'closed') {
    return value
  }
  return null
}

function isResolvedCase(status: string | null, workflowStatus: string | null) {
  const normalizedStatus = status?.trim().toLowerCase() ?? ''
  return (
    workflowStatus === 'found' ||
    workflowStatus === 'closed' ||
    normalizedStatus === 'encontrado' ||
    normalizedStatus === 'resuelto' ||
    normalizedStatus === 'cerrado'
  )
}

function isViewErrorRecoverable(message: string) {
  const lowered = message.toLowerCase()
  return (
    lowered.includes('row-level security policy') ||
    lowered.includes('permission denied') ||
    (lowered.includes('column') && lowered.includes('does not exist')) ||
    lowered.includes('relation') ||
    lowered.includes('does not exist')
  )
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

async function fetchCaseComments(caseId: string) {
  const queries = [
    () =>
      supabase
        .from('case_comments')
        .select('*')
        .eq('caso_id', caseId)
        .order('created_at', { ascending: false }),
    () =>
      supabase
        .from('case_comments')
        .select('*')
        .eq('caso_id', caseId)
        .order('id', { ascending: false }),
    () =>
      supabase
        .from('case_comments')
        .select('*')
        .eq('caso_id', caseId),
  ] as const

  for (const runQuery of queries) {
    const response = await runQuery()

    if (!response.error) {
      return (response.data ?? [])
        .map((row, index) => normalizeCommentRow(row as Record<string, unknown>, index))
        .filter((row): row is CasoComentario => row !== null)
    }

    const message = response.error.message.toLowerCase()
    if (message.includes('column') && message.includes('does not exist')) {
      continue
    }

    if (isCommentListRecoverableError(response.error.message)) {
      return [] as CasoComentario[]
    }

    throw response.error
  }

  return [] as CasoComentario[]
}

async function fetchMediaForCases(caseIds: string[]) {
  if (caseIds.length === 0) return [] as CasoMedia[]

  const { data, error } = await supabase
    .from('media_case')
    .select(MEDIA_SELECT)
    .in('caso_id', caseIds)
    .order('orden', { ascending: true })

  if (error) {
    const message = error.message.toLowerCase()
    if (message.includes('row-level security policy') || message.includes('permission denied')) {
      return [] as CasoMedia[]
    }
    throw error
  }

  return (data ?? []) as CasoMedia[]
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

async function fetchCasosFallback(limit?: number, userId?: string, hideResolved = false): Promise<CasoReciente[]> {
  const queryLimit = typeof limit === 'number' ? (hideResolved ? limit * 4 : limit) : undefined

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
  const visibleRows = hideResolved ? rows.filter(row => !isResolvedCase(row.status, row.workflow_status)) : rows
  const limitedRows = typeof limit === 'number' ? visibleRows.slice(0, limit) : visibleRows
  const media = await fetchMediaForCases(limitedRows.map(row => row.id))

  return mapRecienteFromFallback(limitedRows, media)
}

async function fetchCasos(limit?: number, userId?: string, hideResolved = false): Promise<CasoReciente[]> {
  const queryLimit = typeof limit === 'number' ? (hideResolved ? limit * 4 : limit) : undefined

  let query = supabase
    .from('casos_con_media')
    .select(CASOS_SELECT)
    .order('created_at', { ascending: false })

  if (userId) {
    query = query.eq('publicado_por', userId)
  }

  if (typeof queryLimit === 'number') {
    query = query.limit(queryLimit)
  }

  const { data, error } = await query
  if (error) {
    if (isViewErrorRecoverable(error.message)) {
      return fetchCasosFallback(limit, userId, hideResolved)
    }
    throw error
  }

  const rows = (data ?? []) as CasoViewRow[]
  const visibleRows = hideResolved
    ? rows.filter(row => !isResolvedCase(row.status, row.workflow_status))
    : rows
  const limitedRows = typeof limit === 'number' ? visibleRows.slice(0, limit) : visibleRows

  return limitedRows.map(row => ({
    id: row.id,
    numero_caso: row.numero_caso,
    nombres: row.nombres,
    apellidos: row.apellidos,
    status: normalizeStatus(row.status),
    workflow_status: normalizeWorkflowStatus(row.workflow_status),
    fecha_desaparicion: row.fecha_desaparicion,
    ciudad: row.ciudad,
    foto_principal_url: row.foto_principal_url,
    vistas: row.vistas ?? 0,
    total_fotos: row.total_fotos ?? 0,
    created_at: row.created_at,
  }))
}

export function useMisCasos(userId: string, limit = 3) {
  return useQuery({
    queryKey: ['mis-casos', userId, limit],
    queryFn: () => fetchCasos(limit, userId),
    enabled: !!userId,
    staleTime: QUERY_STALE_TIME,
  })
}

export function useCasosGenerales(limit = 24, options: { hideResolved?: boolean } = {}) {
  const hideResolved = options.hideResolved ?? false

  return useQuery({
    queryKey: ['casos-generales', limit, hideResolved],
    queryFn: () => fetchCasos(limit, undefined, hideResolved),
    staleTime: QUERY_STALE_TIME,
  })
}

export function useCasoDetalle(caseId: string) {
  return useQuery({
    queryKey: ['caso-detalle', caseId],
    enabled: !!caseId,
    staleTime: QUERY_STALE_TIME,
    queryFn: async () => {
      const [caseResponse, mediaResponse, comentarios] = await Promise.all([
        supabase
          .from('casos_con_media')
          .select(CASO_DETALLE_SELECT)
          .eq('id', caseId)
          .single(),
        supabase
          .from('media_case')
          .select(MEDIA_SELECT)
          .eq('caso_id', caseId)
          .order('orden', { ascending: true }),
        fetchCaseComments(caseId),
      ])

      if (caseResponse.error) {
        if (!isViewErrorRecoverable(caseResponse.error.message)) {
          throw caseResponse.error
        }

        if (mediaResponse.error) {
          const message = mediaResponse.error.message.toLowerCase()
          if (!message.includes('row-level security policy') && !message.includes('permission denied')) {
            throw mediaResponse.error
          }
        }

        const fallback = await supabase
          .from('cases')
          .select(CASO_DETALLE_FALLBACK_SELECT)
          .eq('id', caseId)
          .single()

        if (fallback.error) throw fallback.error

        const fallbackCase = fallback.data as CasoDetalleFallbackRow
        const safeMedia = (mediaResponse.data ?? []) as CasoMedia[]
        const photoMedia = safeMedia.filter(item => item.tipo === 'foto')
        const mainPhoto = photoMedia.find(item => item.es_principal) ?? photoMedia[0]

        const caso: CasoDetalle = {
          id: fallbackCase.id,
          person_id: fallbackCase.person_id ?? null,
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

        return { caso, media: safeMedia, comentarios }
      }

      if (mediaResponse.error) {
        const message = mediaResponse.error.message.toLowerCase()
        if (!message.includes('row-level security policy')) {
          throw mediaResponse.error
        }
      }

      const caso = caseResponse.data as CasoDetalle
      const media = (mediaResponse.data ?? []) as CasoMedia[]

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

