import { supabase } from './client'
import type { UserProfile } from '../../features/auth/types'
import { logError, toAppError } from '../../shared/utils/errors'

interface UserRoleRow {
  role_id: string
}

interface RoleRow {
  name: string
}

export type CaseStatus = 'activo' | 'en_proceso' | 'resuelto' | 'cerrado'
export type CaseWorkflowStatus = 'pending' | 'approved' | 'rejected' | 'found' | 'closed'

export interface AuthorityCaseRow {
  id: string
  numero_caso: string
  status: CaseStatus | string
  workflow_status: CaseWorkflowStatus | null
  publicado_por?: string | null
  nombres: string
  apellidos: string
  edad: number | null
  genero?: string | null
  telefono_contacto?: string | null
  email_contacto?: string | null
  fecha_nacimiento?: string | null
  ciudad: string | null
  estado_provincia: string | null
  lugar_ultima_vez: string | null
  descripcion_general?: string | null
  fecha_desaparicion: string | null
  created_at: string
}

export interface ProfileBasicRow {
  id: string
  name: string | null
  last_name: string | null
  email: string | null
}

export interface AuthorityDashboardSummary {
  total: number
  active: number
  inProgress: number
  resolved: number
  pending: number
  approved: number
  rejected: number
  found: number
  closed: number
  recentCases: AuthorityCaseRow[]
}

export interface CaseRealtimeRow {
  id: string
  numero_caso: string | null
  publicado_por: string | null
  nombres: string | null
  apellidos: string | null
  edad: number | null
  genero: string | null
  telefono_contacto: string | null
  email_contacto: string | null
  fecha_nacimiento: string | null
  ciudad: string | null
  estado_provincia: string | null
  lugar_desaparicion: string | null
  lugar_ultima_vez: string | null
  descripcion_general: string | null
  fecha_desaparicion: string | null
  hora_desaparicion: string | null
  person_id: string | null
  pais: string | null
  color_piel: string | null
  color_cabello: string | null
  color_ojos: string | null
  senas_particulares: string | null
  circunstancias: string | null
  ropa_descripcion: string | null
  idioma: string | null
  visibilidad_contacto: 'publico' | 'autoridades' | 'privado' | null
  vistas: number | null
  created_at: string | null
  workflow_status: CaseWorkflowStatus | null
  status: string | null
  eliminado: boolean | null
}

export interface CaseRealtimePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: Partial<CaseRealtimeRow>
  old: Partial<CaseRealtimeRow>
}

export interface AuthoritySightingRow {
  id: string
  caseId: string | null
  caseNumber: string | null
  missingPersonName: string | null
  reporterId: string | null
  reporterName: string | null
  details: string
  location: string | null
  status: string | null
  created_at: string
  sourceTable: string
}

export type SightingModerationStatus = 'pending' | 'approved' | 'rejected'

export interface CaseCommentRealtimeRow {
  id: string
  caso_id: string | null
  autor_id: string | null
  comentario: string | null
  created_at: string | null
}

export interface CaseCommentRealtimePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: Partial<CaseCommentRealtimeRow>
  old: Partial<CaseCommentRealtimeRow>
}

export interface CaseMediaRealtimeRow {
  id: string
  caso_id: string | null
  tipo: 'foto' | 'video' | null
  url: string | null
  es_principal: boolean | null
  orden: number | null
  mime_type: string | null
  created_at: string | null
}

export interface CaseMediaRealtimePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: Partial<CaseMediaRealtimeRow>
  old: Partial<CaseMediaRealtimeRow>
}

export interface SightingRealtimeRow {
  id: string | null
  avistamiento_id: string | null
  caso_id: string | null
  missing_caso_id: string | null
  numero_caso: string | null
  case_number: string | null
  nombre_persona: string | null
  persona_nombre: string | null
  missing_person_name: string | null
  nombre: string | null
  reportado_por: string | null
  reporter_id: string | null
  autor_id: string | null
  user_id: string | null
  created_by: string | null
  fecha_avistamiento: string | null
  fecha_reporte: string | null
  reported_at: string | null
  fecha: string | null
  hora_avistamiento: string | null
  hora: string | null
  time: string | null
  lugar: string | null
  ubicacion: string | null
  direccion: string | null
  location: string | null
  descripcion: string | null
  detalle: string | null
  comentario: string | null
  note: string | null
  contenido: string | null
  texto: string | null
  estado: string | null
  status: string | null
  workflow_status: string | null
  validado: boolean | null
  aprobado: boolean | null
  eliminado: boolean | null
  created_at: string | null
  updated_at: string | null
}

export interface SightingRealtimePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: Partial<SightingRealtimeRow>
  old: Partial<SightingRealtimeRow>
}

const SIGHTING_TABLE = 'case_sightings'

function throwDbError(context: string, error: unknown, fallbackMessage: string): never {
  logError(context, error)
  throw toAppError(error, fallbackMessage, context)
}

function withTimeout<T>(promise: PromiseLike<T>, ms = 12000): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Timeout: el servidor tardó demasiado en responder.')), ms)
  })

  return Promise.race([Promise.resolve(promise), timeout])
}

async function withRetry<T>(
  operation: () => PromiseLike<T>,
  options: { timeoutMs?: number; retries?: number } = {},
): Promise<T> {
  const timeoutMs = options.timeoutMs ?? 30000
  const retries = options.retries ?? 1

  let lastError: unknown = null

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await withTimeout(operation(), timeoutMs)
    } catch (err) {
      lastError = err
      if (attempt === retries) break
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Error inesperado al consultar Supabase.')
}

function getStringValue(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function getBooleanValue(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value
  return null
}

function getNumberValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

function pickString(row: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = getStringValue(row[key])
    if (value) return value
  }
  return null
}

function normalizeCaseWorkflowStatus(value: unknown): CaseWorkflowStatus | null {
  if (typeof value !== 'string') return null
  if (value === 'pending') return 'pending'
  if (value === 'approved') return 'approved'
  if (value === 'rejected') return 'rejected'
  if (value === 'found') return 'found'
  if (value === 'closed') return 'closed'
  return null
}

function normalizeContactVisibility(value: unknown): 'publico' | 'autoridades' | 'privado' | null {
  if (value === 'publico' || value === 'autoridades' || value === 'privado') return value
  return null
}

function isTableMissingError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false

  const candidate = error as { code?: unknown; message?: unknown }
  const code = typeof candidate.code === 'string' ? candidate.code : ''
  const message = typeof candidate.message === 'string' ? candidate.message.toLowerCase() : ''

  return (
    code === '42P01'
    || message.includes('does not exist')
    || message.includes('relation')
  )
}

function isColumnMissingError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false

  const candidate = error as { code?: unknown; message?: unknown }
  const code = typeof candidate.code === 'string' ? candidate.code : ''
  const message = typeof candidate.message === 'string' ? candidate.message.toLowerCase() : ''

  return (
    code === '42703'
    || message.includes('column')
    || message.includes('does not exist')
  )
}

function isStatusValueError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false

  const candidate = error as { code?: unknown; message?: unknown }
  const code = typeof candidate.code === 'string' ? candidate.code : ''
  const message = typeof candidate.message === 'string' ? candidate.message.toLowerCase() : ''

  return (
    code === '22P02'
    || code === '23514'
    || message.includes('invalid input value for enum')
    || message.includes('enum')
    || message.includes('check constraint')
  )
}

async function tryUpdateSightingStatusVariants(
  sightingId: string,
  updatePayload: Record<string, string>,
  attempts: Array<{ idColumn: string; statusColumn: string }>,
  statusCandidates: string[],
) {
  for (const attempt of attempts) {
    let shouldContinue = false

    for (const candidateStatus of statusCandidates) {
      const { data, error } = await withRetry(
        () =>
          supabase
            .from(SIGHTING_TABLE)
            .update({
              ...updatePayload,
              [attempt.statusColumn]: candidateStatus,
            })
            .eq(attempt.idColumn, sightingId)
            .select(attempt.idColumn)
            .maybeSingle(),
        { timeoutMs: 30000, retries: 0 },
      )

      if (error) {
        if (isColumnMissingError(error)) {
          shouldContinue = true
          break
        }
        if (isStatusValueError(error)) {
          continue
        }
        throwDbError('updateAuthoritySightingStatus', error, 'No se pudo actualizar el avistamiento. IntÃ©ntalo nuevamente.')
      }

      if (data) return true
    }

    if (shouldContinue) continue
  }

  return false
}

export async function getProfile(userId: string) {
  const { data, error } = await withRetry(() =>
    supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single(),
  )

  if (error) {
    throwDbError('getProfile', error, 'No se pudo cargar el perfil. Inténtalo nuevamente.')
  }
  return data
}

export async function getUserRoles(userId: string): Promise<string[]> {
  const { data: userRoles, error: urError } = await withRetry(() =>
    supabase
      .from('user_roles')
      .select('role_id')
      .eq('user_id', userId),
  )

  if (urError) {
    throwDbError('getUserRoles', urError, 'No se pudieron cargar los roles del usuario. Inténtalo nuevamente.')
  }
  if (!userRoles || userRoles.length === 0) return []

  const roleIds = userRoles.map((r: UserRoleRow) => r.role_id)

  if (roleIds.length === 0) return []

  const { data: roles, error: rError } = await withRetry(() =>
    supabase
      .from('roles')
      .select('name')
      .in('id', roleIds),
  )

  if (rError) {
    throwDbError('getUserRoles', rError, 'No se pudieron cargar los roles del usuario. Inténtalo nuevamente.')
  }

  const names = (roles ?? []).map((r: RoleRow) => r.name)
  return names
}

export async function getProfileWithRoles(userId: string): Promise<UserProfile> {
  const [profile, roles] = await Promise.all([
    getProfile(userId),
    getUserRoles(userId),
  ])

  const row = (profile ?? {}) as Record<string, unknown>

  const normalized: UserProfile = {
    ...(row as Record<string, unknown>),
    id: pickString(row, ['id']) ?? userId,
    name: pickString(row, ['name', 'nombre', 'nombres']) ?? '',
    last_nmae: pickString(row, ['last_nmae', 'last_name', 'apellido', 'apellidos']) ?? '',
    email: pickString(row, ['email']) ?? '',
    activo: typeof row.activo === 'boolean' ? row.activo : true,
    created_at: pickString(row, ['created_at']) ?? new Date().toISOString(),
    avatar_url: pickString(row, ['avatar_url', 'avatar', 'foto', 'photo_url']),
    roles: roles as UserProfile['roles'],
  } as UserProfile

  return normalized
}

export async function getUserRolesByIds(userIds: string[]): Promise<Record<string, string[]>> {
  if (userIds.length === 0) return {}

  const uniqueIds = [...new Set(userIds.filter(Boolean))]
  if (uniqueIds.length === 0) return {}

  const { data: relationData, error: relationError } = await withRetry(() =>
    supabase
      .from('user_roles')
      .select('user_id, role_id')
      .in('user_id', uniqueIds),
  )

  if (relationError) {
    throwDbError('getUserRolesByIds', relationError, 'Error al cargar los roles. Inténtalo nuevamente.')
  }

  const roleIdsByUser = new Map<string, string[]>()
  const roleIds: string[] = []

  const relationRows = (relationData ?? []) as Array<Record<string, unknown>>
  relationRows.forEach((row) => {
    const userId = pickString(row, ['user_id'])
    const roleId = pickString(row, ['role_id'])
    if (!userId || !roleId) return

    roleIds.push(roleId)
    const existing = roleIdsByUser.get(userId) ?? []
    existing.push(roleId)
    roleIdsByUser.set(userId, existing)
  })

  const result: Record<string, string[]> = {}
  uniqueIds.forEach((id) => {
    result[id] = []
  })

  const uniqueRoleIds = [...new Set(roleIds)]
  if (uniqueRoleIds.length === 0) return result

  const { data: rolesData, error: rolesError } = await withRetry(() =>
    supabase
      .from('roles')
      .select('id, name')
      .in('id', uniqueRoleIds),
  )

  if (rolesError) {
    throwDbError('getUserRolesByIds', rolesError, 'Error al cargar los roles. Inténtalo nuevamente.')
  }

  const roleNameById = new Map<string, string>()
  const roleRows = (rolesData ?? []) as Array<Record<string, unknown>>
  roleRows.forEach((row) => {
    const roleId = pickString(row, ['id'])
    const roleName = pickString(row, ['name'])
    if (!roleId || !roleName) return
    roleNameById.set(roleId, roleName)
  })

  roleIdsByUser.forEach((ids, userId) => {
    result[userId] = Array.from(
      new Set(ids.map((id) => roleNameById.get(id)).filter((value): value is string => Boolean(value))),
    )
  })

  return result
}

interface GetCasesParams {
  search?: string
  status?: CaseStatus | 'all'
  limit?: number
}

export async function getAuthorityCases(params: GetCasesParams = {}): Promise<AuthorityCaseRow[]> {
  const { search, status = 'all', limit = 100 } = params

  let query = supabase
    .from('cases')
    .select(
      'id, numero_caso, status, workflow_status, nombres, apellidos, edad, ciudad, estado_provincia, lugar_ultima_vez, fecha_desaparicion, created_at',
    )
    .eq('eliminado', false)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (status !== 'all') {
    query = query.eq('status', status)
  }

  if (search && search.trim()) {
    const term = search.trim()
    query = query.or(`numero_caso.ilike.%${term}%,nombres.ilike.%${term}%,apellidos.ilike.%${term}%`)
  }

  const { data, error } = await withRetry(() => query, { timeoutMs: 30000, retries: 1 })

  if (error) {
    throwDbError('getAuthorityCases', error, 'Error al cargar los casos. Inténtalo nuevamente.')
  }

  return (data ?? []) as AuthorityCaseRow[]
}

export function normalizeAuthorityCaseRow(row: Partial<CaseRealtimeRow>): AuthorityCaseRow | null {
  const id = getStringValue(row.id) ?? null
  const numeroCaso = getStringValue(row.numero_caso) ?? null
  const nombres = getStringValue(row.nombres) ?? null
  const apellidos = getStringValue(row.apellidos) ?? null
  const createdAt = getStringValue(row.created_at) ?? null

  if (!id || !numeroCaso || !nombres || !apellidos || !createdAt) return null

  return {
    id,
    numero_caso: numeroCaso,
    status: getStringValue(row.status) ?? 'activo',
    workflow_status: normalizeCaseWorkflowStatus(row.workflow_status),
    publicado_por: getStringValue(row.publicado_por),
    nombres,
    apellidos,
    edad: getNumberValue(row.edad),
    genero: getStringValue(row.genero),
    telefono_contacto: getStringValue(row.telefono_contacto),
    email_contacto: getStringValue(row.email_contacto),
    fecha_nacimiento: getStringValue(row.fecha_nacimiento),
    ciudad: getStringValue(row.ciudad),
    estado_provincia: getStringValue(row.estado_provincia),
    lugar_ultima_vez: getStringValue(row.lugar_ultima_vez),
    descripcion_general: getStringValue(row.descripcion_general),
    fecha_desaparicion: getStringValue(row.fecha_desaparicion),
    created_at: createdAt,
  }
}

export function subscribeToCasesRealtime(
  onChange: (payload: CaseRealtimePayload) => void,
): () => void {
  const channel = supabase
    .channel(`cases-realtime-${crypto.randomUUID()}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'cases' },
      (payload) => {
        const newRowRaw = (payload.new ?? {}) as Record<string, unknown>
        const oldRowRaw = (payload.old ?? {}) as Record<string, unknown>

        onChange({
          eventType: payload.eventType as CaseRealtimePayload['eventType'],
          new: {
            id: pickString(newRowRaw, ['id']) ?? '',
            numero_caso: pickString(newRowRaw, ['numero_caso']),
            publicado_por: pickString(newRowRaw, ['publicado_por']),
            nombres: pickString(newRowRaw, ['nombres']),
            apellidos: pickString(newRowRaw, ['apellidos']),
            edad: getNumberValue(newRowRaw.edad),
            genero: pickString(newRowRaw, ['genero']),
            telefono_contacto: pickString(newRowRaw, ['telefono_contacto']),
            email_contacto: pickString(newRowRaw, ['email_contacto']),
            fecha_nacimiento: pickString(newRowRaw, ['fecha_nacimiento']),
            ciudad: pickString(newRowRaw, ['ciudad']),
            estado_provincia: pickString(newRowRaw, ['estado_provincia']),
            lugar_desaparicion: pickString(newRowRaw, ['lugar_desaparicion']),
            lugar_ultima_vez: pickString(newRowRaw, ['lugar_ultima_vez']),
            descripcion_general: pickString(newRowRaw, ['descripcion_general']),
            fecha_desaparicion: pickString(newRowRaw, ['fecha_desaparicion']),
            hora_desaparicion: pickString(newRowRaw, ['hora_desaparicion']),
            person_id: pickString(newRowRaw, ['person_id']),
            pais: pickString(newRowRaw, ['pais']),
            color_piel: pickString(newRowRaw, ['color_piel']),
            color_cabello: pickString(newRowRaw, ['color_cabello']),
            color_ojos: pickString(newRowRaw, ['color_ojos']),
            senas_particulares: pickString(newRowRaw, ['senas_particulares']),
            circunstancias: pickString(newRowRaw, ['circunstancias']),
            ropa_descripcion: pickString(newRowRaw, ['ropa_descripcion']),
            idioma: pickString(newRowRaw, ['idioma']),
            visibilidad_contacto: normalizeContactVisibility(newRowRaw.visibilidad_contacto),
            vistas: getNumberValue(newRowRaw.vistas),
            created_at: pickString(newRowRaw, ['created_at']),
            workflow_status: normalizeCaseWorkflowStatus(newRowRaw.workflow_status),
            status: pickString(newRowRaw, ['status']),
            eliminado: getBooleanValue(newRowRaw.eliminado),
          },
          old: {
            id: pickString(oldRowRaw, ['id']) ?? '',
            numero_caso: pickString(oldRowRaw, ['numero_caso']),
            publicado_por: pickString(oldRowRaw, ['publicado_por']),
            nombres: pickString(oldRowRaw, ['nombres']),
            apellidos: pickString(oldRowRaw, ['apellidos']),
            edad: getNumberValue(oldRowRaw.edad),
            genero: pickString(oldRowRaw, ['genero']),
            telefono_contacto: pickString(oldRowRaw, ['telefono_contacto']),
            email_contacto: pickString(oldRowRaw, ['email_contacto']),
            fecha_nacimiento: pickString(oldRowRaw, ['fecha_nacimiento']),
            ciudad: pickString(oldRowRaw, ['ciudad']),
            estado_provincia: pickString(oldRowRaw, ['estado_provincia']),
            lugar_desaparicion: pickString(oldRowRaw, ['lugar_desaparicion']),
            lugar_ultima_vez: pickString(oldRowRaw, ['lugar_ultima_vez']),
            descripcion_general: pickString(oldRowRaw, ['descripcion_general']),
            fecha_desaparicion: pickString(oldRowRaw, ['fecha_desaparicion']),
            hora_desaparicion: pickString(oldRowRaw, ['hora_desaparicion']),
            person_id: pickString(oldRowRaw, ['person_id']),
            pais: pickString(oldRowRaw, ['pais']),
            color_piel: pickString(oldRowRaw, ['color_piel']),
            color_cabello: pickString(oldRowRaw, ['color_cabello']),
            color_ojos: pickString(oldRowRaw, ['color_ojos']),
            senas_particulares: pickString(oldRowRaw, ['senas_particulares']),
            circunstancias: pickString(oldRowRaw, ['circunstancias']),
            ropa_descripcion: pickString(oldRowRaw, ['ropa_descripcion']),
            idioma: pickString(oldRowRaw, ['idioma']),
            visibilidad_contacto: normalizeContactVisibility(oldRowRaw.visibilidad_contacto),
            vistas: getNumberValue(oldRowRaw.vistas),
            created_at: pickString(oldRowRaw, ['created_at']),
            workflow_status: normalizeCaseWorkflowStatus(oldRowRaw.workflow_status),
            status: pickString(oldRowRaw, ['status']),
            eliminado: getBooleanValue(oldRowRaw.eliminado),
          },
        })
      },
    )
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR') {
        console.error('[subscribeToCasesRealtime] Error en canal realtime de casos.')
      }
    })

  return () => {
    void supabase.removeChannel(channel)
  }
}

export function normalizeAuthoritySightingRow(
  row: Record<string, unknown>,
  lookups: {
    caseMap?: Map<string, { numeroCaso: string | null; fullName: string | null }>
    profileMap?: Map<string, string>
  } = {},
): AuthoritySightingRow {
  const id = pickString(row, ['id', 'avistamiento_id']) ?? crypto.randomUUID()
  const caseId = pickString(row, ['caso_id', 'missing_caso_id'])
  const caseFromLookup = caseId ? lookups.caseMap?.get(caseId) ?? null : null
  const reporterId = pickString(row, ['reportado_por', 'reporter_id', 'autor_id', 'user_id', 'created_by'])
  const reporterName = reporterId ? (lookups.profileMap?.get(reporterId) ?? null) : null
  const rawStatus = pickString(row, ['estado', 'status', 'workflow_status'])
  const details =
    pickString(row, ['descripcion', 'detalle', 'comentario', 'note', 'contenido', 'texto'])
    ?? 'Sin detalles del avistamiento.'

  return {
    id,
    caseId,
    caseNumber: pickString(row, ['numero_caso', 'case_number']) ?? caseFromLookup?.numeroCaso ?? null,
    missingPersonName:
      pickString(row, ['nombre_persona', 'persona_nombre', 'missing_person_name', 'nombre'])
      ?? caseFromLookup?.fullName
      ?? null,
    reporterId,
    reporterName,
    details,
    location: pickString(row, ['ubicacion', 'location', 'lugar', 'direccion', 'ciudad']),
    status: rawStatus,
    created_at:
      pickString(row, ['created_at', 'fecha_reporte', 'reported_at', 'fecha', 'updated_at'])
      ?? new Date().toISOString(),
    sourceTable: SIGHTING_TABLE,
  }
}

export async function getAuthoritySightings(limit = 200): Promise<AuthoritySightingRow[]> {
  const queryWithCreatedAt = await withRetry(
    () =>
      supabase
        .from(SIGHTING_TABLE)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit),
    { timeoutMs: 30000, retries: 0 },
  )

  let data = queryWithCreatedAt.data
  let error = queryWithCreatedAt.error

  if (error && isColumnMissingError(error)) {
    const queryWithFechaReporte = await withRetry(
      () =>
        supabase
          .from(SIGHTING_TABLE)
          .select('*')
          .order('fecha_reporte', { ascending: false })
          .limit(limit),
      { timeoutMs: 30000, retries: 0 },
    )
    data = queryWithFechaReporte.data
    error = queryWithFechaReporte.error
  }

  if (error && isColumnMissingError(error)) {
    const queryWithoutOrder = await withRetry(
      () => supabase.from(SIGHTING_TABLE).select('*').limit(limit),
      { timeoutMs: 30000, retries: 0 },
    )
    data = queryWithoutOrder.data
    error = queryWithoutOrder.error
  }

  if (error) {
    if (isTableMissingError(error)) return []
    throwDbError('getAuthoritySightings', error, 'Error al cargar los avistamientos. Inténtalo nuevamente.')
  }

  const rawRows = (data ?? []) as Record<string, unknown>[]
  const rows = rawRows.filter((row) => {
    const eliminado = row.eliminado
    return eliminado !== true
  })
  if (rows.length === 0) return []

  const caseIds = [
    ...new Set(
      rows
        .map((row) => pickString(row, ['caso_id', 'missing_caso_id']))
        .filter((value): value is string => Boolean(value)),
    ),
  ]

  const reporterIds = [
    ...new Set(
      rows
        .map((row) => pickString(row, ['reportado_por', 'reporter_id', 'autor_id', 'user_id', 'created_by']))
        .filter((value): value is string => Boolean(value)),
    ),
  ]

  const caseMap = new Map<string, { numeroCaso: string | null; fullName: string | null }>()
  if (caseIds.length > 0) {
    const { data: casesData, error: casesError } = await withRetry(
      () =>
        supabase
          .from('cases')
          .select('id, numero_caso, nombres, apellidos')
          .in('id', caseIds),
      { timeoutMs: 30000, retries: 0 },
    )

    if (!casesError) {
      const casesRows = (casesData ?? []) as Array<Record<string, unknown>>
      casesRows.forEach((caseRow) => {
        const id = pickString(caseRow, ['id'])
        if (!id) return
        const nombres = pickString(caseRow, ['nombres']) ?? ''
        const apellidos = pickString(caseRow, ['apellidos']) ?? ''
        caseMap.set(id, {
          numeroCaso: pickString(caseRow, ['numero_caso']),
          fullName: `${nombres} ${apellidos}`.trim() || null,
        })
      })
    }
  }

  const profileMap = new Map<string, string>()
  if (reporterIds.length > 0) {
    try {
      const profiles = await getProfilesBasicByIds(reporterIds)
      profiles.forEach((profile) => {
        const fullName = `${profile.name ?? ''} ${profile.last_name ?? ''}`.trim()
        if (fullName) profileMap.set(profile.id, fullName)
      })
    } catch (error) {
      // If profiles fail, we still return sightings without reporter names.
      logError('getAuthoritySightings.getProfilesBasicByIds', error)
    }
  }

  return rows.map((row) => normalizeAuthoritySightingRow(row, { caseMap, profileMap }))
}

export function subscribeToSightingsRealtime(
  onChange: (payload: SightingRealtimePayload) => void,
): () => void {
  const channel = supabase
    .channel('case-sightings-realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: SIGHTING_TABLE },
      (payload) => {
        const newRowRaw = (payload.new ?? {}) as Record<string, unknown>
        const oldRowRaw = (payload.old ?? {}) as Record<string, unknown>

        onChange({
          eventType: payload.eventType as SightingRealtimePayload['eventType'],
          new: {
            id: pickString(newRowRaw, ['id']),
            avistamiento_id: pickString(newRowRaw, ['avistamiento_id']),
            caso_id: pickString(newRowRaw, ['caso_id']),
            missing_caso_id: pickString(newRowRaw, ['missing_caso_id']),
            numero_caso: pickString(newRowRaw, ['numero_caso']),
            case_number: pickString(newRowRaw, ['case_number']),
            nombre_persona: pickString(newRowRaw, ['nombre_persona']),
            persona_nombre: pickString(newRowRaw, ['persona_nombre']),
            missing_person_name: pickString(newRowRaw, ['missing_person_name']),
            nombre: pickString(newRowRaw, ['nombre']),
            reportado_por: pickString(newRowRaw, ['reportado_por']),
            reporter_id: pickString(newRowRaw, ['reporter_id']),
            autor_id: pickString(newRowRaw, ['autor_id']),
            user_id: pickString(newRowRaw, ['user_id']),
            created_by: pickString(newRowRaw, ['created_by']),
            fecha_avistamiento: pickString(newRowRaw, ['fecha_avistamiento']),
            fecha_reporte: pickString(newRowRaw, ['fecha_reporte']),
            reported_at: pickString(newRowRaw, ['reported_at']),
            fecha: pickString(newRowRaw, ['fecha']),
            hora_avistamiento: pickString(newRowRaw, ['hora_avistamiento']),
            hora: pickString(newRowRaw, ['hora']),
            time: pickString(newRowRaw, ['time']),
            lugar: pickString(newRowRaw, ['lugar']),
            ubicacion: pickString(newRowRaw, ['ubicacion']),
            direccion: pickString(newRowRaw, ['direccion']),
            location: pickString(newRowRaw, ['location']),
            descripcion: pickString(newRowRaw, ['descripcion']),
            detalle: pickString(newRowRaw, ['detalle']),
            comentario: pickString(newRowRaw, ['comentario']),
            note: pickString(newRowRaw, ['note']),
            contenido: pickString(newRowRaw, ['contenido']),
            texto: pickString(newRowRaw, ['texto']),
            estado: pickString(newRowRaw, ['estado']),
            status: pickString(newRowRaw, ['status']),
            workflow_status: pickString(newRowRaw, ['workflow_status']),
            validado: getBooleanValue(newRowRaw.validado),
            aprobado: getBooleanValue(newRowRaw.aprobado),
            eliminado: getBooleanValue(newRowRaw.eliminado),
            created_at: pickString(newRowRaw, ['created_at']),
            updated_at: pickString(newRowRaw, ['updated_at']),
          },
          old: {
            id: pickString(oldRowRaw, ['id']),
            avistamiento_id: pickString(oldRowRaw, ['avistamiento_id']),
            caso_id: pickString(oldRowRaw, ['caso_id']),
            missing_caso_id: pickString(oldRowRaw, ['missing_caso_id']),
            numero_caso: pickString(oldRowRaw, ['numero_caso']),
            case_number: pickString(oldRowRaw, ['case_number']),
            nombre_persona: pickString(oldRowRaw, ['nombre_persona']),
            persona_nombre: pickString(oldRowRaw, ['persona_nombre']),
            missing_person_name: pickString(oldRowRaw, ['missing_person_name']),
            nombre: pickString(oldRowRaw, ['nombre']),
            reportado_por: pickString(oldRowRaw, ['reportado_por']),
            reporter_id: pickString(oldRowRaw, ['reporter_id']),
            autor_id: pickString(oldRowRaw, ['autor_id']),
            user_id: pickString(oldRowRaw, ['user_id']),
            created_by: pickString(oldRowRaw, ['created_by']),
            fecha_avistamiento: pickString(oldRowRaw, ['fecha_avistamiento']),
            fecha_reporte: pickString(oldRowRaw, ['fecha_reporte']),
            reported_at: pickString(oldRowRaw, ['reported_at']),
            fecha: pickString(oldRowRaw, ['fecha']),
            hora_avistamiento: pickString(oldRowRaw, ['hora_avistamiento']),
            hora: pickString(oldRowRaw, ['hora']),
            time: pickString(oldRowRaw, ['time']),
            lugar: pickString(oldRowRaw, ['lugar']),
            ubicacion: pickString(oldRowRaw, ['ubicacion']),
            direccion: pickString(oldRowRaw, ['direccion']),
            location: pickString(oldRowRaw, ['location']),
            descripcion: pickString(oldRowRaw, ['descripcion']),
            detalle: pickString(oldRowRaw, ['detalle']),
            comentario: pickString(oldRowRaw, ['comentario']),
            note: pickString(oldRowRaw, ['note']),
            contenido: pickString(oldRowRaw, ['contenido']),
            texto: pickString(oldRowRaw, ['texto']),
            estado: pickString(oldRowRaw, ['estado']),
            status: pickString(oldRowRaw, ['status']),
            workflow_status: pickString(oldRowRaw, ['workflow_status']),
            validado: getBooleanValue(oldRowRaw.validado),
            aprobado: getBooleanValue(oldRowRaw.aprobado),
            eliminado: getBooleanValue(oldRowRaw.eliminado),
            created_at: pickString(oldRowRaw, ['created_at']),
            updated_at: pickString(oldRowRaw, ['updated_at']),
          },
        })
      },
    )
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR') {
        console.error('[subscribeToSightingsRealtime] Error en canal realtime de avistamientos.')
      }
    })

  return () => {
    void supabase.removeChannel(channel)
  }
}

export async function updateAuthoritySightingStatus(
  sightingId: string,
  status: SightingModerationStatus,
): Promise<void> {
  const updatePayload = {
    updated_at: new Date().toISOString(),
  }

  const statusCandidates =
    status === 'approved'
      ? ['approved', 'aprobado', 'aceptado', 'validado', 'confirmado']
      : status === 'rejected'
        ? ['rejected', 'rechazado', 'descartado']
        : ['pending', 'pendiente', 'en_revision', 'en revision']

  const attempts: Array<{ idColumn: string; statusColumn: string }> = [
    { idColumn: 'id', statusColumn: 'estado' },
    { idColumn: 'id', statusColumn: 'status' },
    { idColumn: 'id', statusColumn: 'workflow_status' },
    { idColumn: 'avistamiento_id', statusColumn: 'estado' },
    { idColumn: 'avistamiento_id', statusColumn: 'status' },
    { idColumn: 'avistamiento_id', statusColumn: 'workflow_status' },
  ]

  if (await tryUpdateSightingStatusVariants(sightingId, updatePayload, attempts, statusCandidates)) {
    return
  }

  for (const attempt of attempts) {
    const { data, error } = await withRetry(
      () =>
        supabase
          .from(SIGHTING_TABLE)
          .update({
            ...updatePayload,
            [attempt.statusColumn]: status,
          })
          .eq(attempt.idColumn, sightingId)
          .select(attempt.idColumn)
          .maybeSingle(),
      { timeoutMs: 30000, retries: 0 },
    )

    if (error) {
      if (isColumnMissingError(error)) continue
      throwDbError('updateAuthoritySightingStatus', error, 'No se pudo actualizar el avistamiento. Inténtalo nuevamente.')
    }

    if (data) return
  }

  throw new Error('No se pudo actualizar el estado del avistamiento por incompatibilidad de columnas.')
}

export async function softDeleteCase(caseId: string): Promise<void> {
  const { error } = await withRetry(() =>
    supabase
      .from('cases')
      .update({
        eliminado: true,
        eliminado_at: new Date().toISOString(),
      })
      .eq('id', caseId),
  )

  if (error) {
    throwDbError('softDeleteCase', error, 'No se pudo eliminar el caso. Inténtalo nuevamente.')
  }
}

export async function getPendingModerationCases(limit = 200): Promise<AuthorityCaseRow[]> {
  const { data, error } = await withRetry(
    () =>
      supabase
        .from('cases')
        .select(
          'id, numero_caso, status, workflow_status, publicado_por, nombres, apellidos, edad, genero, telefono_contacto, email_contacto, fecha_nacimiento, ciudad, estado_provincia, lugar_ultima_vez, descripcion_general, fecha_desaparicion, created_at',
        )
        .eq('eliminado', false)
        .or('workflow_status.is.null,workflow_status.eq.pending')
        .order('created_at', { ascending: false })
        .limit(limit),
    { timeoutMs: 30000, retries: 1 },
  )

  if (error) {
    throwDbError('getPendingModerationCases', error, 'Error al cargar los casos pendientes. Inténtalo nuevamente.')
  }

  return (data ?? []) as AuthorityCaseRow[]
}

export async function getProfilesBasicByIds(userIds: string[]): Promise<ProfileBasicRow[]> {
  if (userIds.length === 0) return []

  const uniqueIds = [...new Set(userIds.filter(Boolean))]
  if (uniqueIds.length === 0) return []

  const attempts = ['id, name, last_name, email', 'id, name, last_nmae, email']

  let lastError: unknown = null

  for (const selectColumns of attempts) {
    const { data, error } = await withRetry(() =>
      supabase
        .from('profiles')
        .select(selectColumns)
        .in('id', uniqueIds),
    )

    if (error) {
      if (isColumnMissingError(error)) {
        lastError = error
        continue
      }
      throwDbError('getProfilesBasicByIds', error, 'Error al cargar perfiles. Inténtalo nuevamente.')
    }

    const rows = (data ?? []) as unknown as Array<Record<string, unknown>>

    return rows.map((row) => ({
      id: pickString(row, ['id']) ?? '',
      name: pickString(row, ['name', 'nombre', 'nombres']),
      last_name: pickString(row, ['last_name', 'last_nmae', 'apellido', 'apellidos']),
      email: pickString(row, ['email']),
    }))
  }

  if (lastError) {
    throwDbError('getProfilesBasicByIds', lastError, 'Error al cargar perfiles. Inténtalo nuevamente.')
  }

  return []
}

export async function updateCaseWorkflowStatus(caseId: string, status: CaseWorkflowStatus): Promise<void> {
  const { error } = await withRetry(() =>
    supabase
      .from('cases')
      .update({
        workflow_status: status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', caseId),
  )

  if (error) {
    throwDbError('updateCaseWorkflowStatus', error, 'No se pudo actualizar el caso. Inténtalo nuevamente.')
  }
}

export interface PersonCaseHistoryRow {
  id: string
  numero_caso: string
  status: string | null
  workflow_status: CaseWorkflowStatus | null
  created_at: string | null
}

export async function getCasesByPersonId(
  personId: string,
  excludeCaseId?: string,
): Promise<PersonCaseHistoryRow[]> {
  let query = supabase
    .from('cases')
    .select('id, numero_caso, status, workflow_status, created_at')
    .eq('person_id', personId)
    .eq('eliminado', false)
    .order('created_at', { ascending: false })

  if (excludeCaseId) {
    query = query.neq('id', excludeCaseId)
  }

  const { data, error } = await withRetry(() => query, { timeoutMs: 20000, retries: 1 })
  if (error) {
    throwDbError('getCasesByPersonId', error, 'Error al cargar el historial de casos. Inténtalo nuevamente.')
  }

  return (data ?? []) as PersonCaseHistoryRow[]
}

export async function createCaseClosure(caseId: string, userId: string, note: string): Promise<void> {
  const trimmed = note.trim()
  if (!trimmed) throw new Error('La nota de cierre no puede estar vacia.')

  const { error } = await withRetry(() =>
    supabase
      .from('cases_closed')
      .insert({
        case_id: caseId,
        closed_by: userId,
        closed_note: trimmed,
        closed_at: new Date().toISOString(),
      }),
  )

  if (error) {
    throwDbError('createCaseClosure', error, 'No se pudo cerrar el caso. Inténtalo nuevamente.')
  }
}

export interface CaseCommentRow {
  id: string
  caso_id: string
  autor_id: string
  comentario: string
  created_at: string
}

export function normalizeCaseCommentRow(row: Record<string, unknown>): CaseCommentRow {
  return {
    id: pickString(row, ['id']) ?? String(row.id ?? ''),
    caso_id: pickString(row, ['caso_id', 'case_id']) ?? String(row.caso_id ?? row.case_id ?? ''),
    autor_id: pickString(row, ['autor_id', 'author_id', 'user_id']) ?? String(row.autor_id ?? row.author_id ?? row.user_id ?? ''),
    comentario:
      pickString(row, ['comentario', 'comment', 'texto', 'text'])
      ?? String(row.comentario ?? row.comment ?? row.texto ?? row.text ?? ''),
    created_at:
      pickString(row, ['created_at', 'fecha', 'updated_at'])
      ?? String(row.created_at ?? row.fecha ?? row.updated_at ?? ''),
  }
}

export function subscribeToCaseCommentsRealtime(
  onChange: (payload: CaseCommentRealtimePayload) => void,
): () => void {
  const channel = supabase
    .channel('case-comments-realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'case_comments' },
      (payload) => {
        const newRowRaw = (payload.new ?? {}) as Record<string, unknown>
        const oldRowRaw = (payload.old ?? {}) as Record<string, unknown>

        onChange({
          eventType: payload.eventType as CaseCommentRealtimePayload['eventType'],
          new: {
            id: pickString(newRowRaw, ['id']) ?? String(newRowRaw.id ?? ''),
            caso_id: pickString(newRowRaw, ['caso_id', 'case_id']),
            autor_id: pickString(newRowRaw, ['autor_id', 'author_id', 'user_id']),
            comentario: pickString(newRowRaw, ['comentario', 'comment', 'texto', 'text']),
            created_at: pickString(newRowRaw, ['created_at', 'fecha', 'updated_at']),
          },
          old: {
            id: pickString(oldRowRaw, ['id']) ?? String(oldRowRaw.id ?? ''),
            caso_id: pickString(oldRowRaw, ['caso_id', 'case_id']),
            autor_id: pickString(oldRowRaw, ['autor_id', 'author_id', 'user_id']),
            comentario: pickString(oldRowRaw, ['comentario', 'comment', 'texto', 'text']),
            created_at: pickString(oldRowRaw, ['created_at', 'fecha', 'updated_at']),
          },
        })
      },
    )
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR') {
        console.error('[subscribeToCaseCommentsRealtime] Error en canal realtime de comentarios.')
      }
    })

  return () => {
    void supabase.removeChannel(channel)
  }
}

export function subscribeToCaseMediaRealtime(
  onChange: (payload: CaseMediaRealtimePayload) => void,
): () => void {
  const channel = supabase
    .channel('case-media-realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'media_case' },
      (payload) => {
        const newRowRaw = (payload.new ?? {}) as Record<string, unknown>
        const oldRowRaw = (payload.old ?? {}) as Record<string, unknown>

        onChange({
          eventType: payload.eventType as CaseMediaRealtimePayload['eventType'],
          new: normalizeCaseMediaRow(newRowRaw),
          old: normalizeCaseMediaRow(oldRowRaw),
        })
      },
    )
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR') {
        console.error('[subscribeToCaseMediaRealtime] Error en canal realtime de media.')
      }
    })

  return () => {
    void supabase.removeChannel(channel)
  }
}

export function normalizeCaseMediaRow(row: Record<string, unknown>): CaseMediaRealtimeRow {
  return {
    id: pickString(row, ['id']) ?? String(row.id ?? ''),
    caso_id: pickString(row, ['caso_id', 'case_id']),
    tipo: (() => {
      const tipo = pickString(row, ['tipo'])
      return tipo === 'foto' || tipo === 'video' ? tipo : null
    })(),
    url: pickString(row, ['url']),
    es_principal: getBooleanValue(row.es_principal),
    orden: getNumberValue(row.orden),
    mime_type: pickString(row, ['mime_type']),
    created_at: pickString(row, ['created_at']),
  }
}

export async function getCaseComments(caseIds: string[]): Promise<CaseCommentRow[]> {
  if (caseIds.length === 0) return []

  const { data, error } = await withRetry(() =>
    supabase
      .from('case_comments')
      .select('id, caso_id, autor_id, comentario, created_at')
      .in('caso_id', caseIds)
      .order('created_at', { ascending: true }),
  )

  if (error) {
    throwDbError('getCaseComments', error, 'Error al cargar los comentarios. Inténtalo nuevamente.')
  }

  const rows = (data ?? []) as Array<Record<string, unknown>>
  return rows.map(normalizeCaseCommentRow)
}

export async function createCaseComment(
  caseId: string,
  authorId: string,
  comment: string,
): Promise<{ id: string }> {
  const { data, error } = await withRetry(() =>
    supabase
      .from('case_comments')
      .insert({
        caso_id: caseId,
        autor_id: authorId,
        comentario: comment,
      })
      .select('id')
      .single(),
  )

  if (error) {
    throwDbError('createCaseComment', error, 'No se pudo guardar el comentario. Inténtalo nuevamente.')
  }

  const id = pickString((data ?? {}) as Record<string, unknown>, ['id']) ?? String((data as { id?: unknown } | null)?.id ?? '')
  if (!id) {
    throw new Error('No se pudo crear el comentario en la base de datos.')
  }

  return { id }
}


export async function updateCaseComment(commentId: string, newText: string): Promise<void> {
  const { data, error } = await withRetry(() =>
    supabase
      .from('case_comments')
      .update({ comentario: newText })
      .eq('id', commentId)
      .select('id')
      .maybeSingle(),
  )

  if (error) {
    throwDbError('updateCaseComment', error, 'No se pudo actualizar el comentario. Inténtalo nuevamente.')
  }

  if (!data) {
    throw new Error('No se pudo actualizar el comentario en la base de datos.')
  }
}


export async function deleteCaseComment(commentId: string): Promise<void> {
  const { data, error } = await withRetry(() =>
    supabase
      .from('case_comments')
      .delete()
      .eq('id', commentId)
      .select('id')
      .maybeSingle(),
  )

  if (error) {
    throwDbError('deleteCaseComment', error, 'No se pudo eliminar el comentario. Inténtalo nuevamente.')
  }

  if (!data) {
    throw new Error('No se pudo eliminar el comentario en la base de datos.')
  }
}

export async function getCasePhotoUrlFromStorage(caseId: string): Promise<string | null> {
  const bucketCandidates = ['casos-media', 'missing-persons']
  const pathCandidates = [
    `images/${caseId}/images`,
    `images/${caseId}`,
    `${caseId}/images`,
    `cases/${caseId}`,
    caseId,
    `caso/${caseId}`,
  ]

  for (const bucket of bucketCandidates) {
    for (const basePath of pathCandidates) {
      const { data, error } = await withRetry(() =>
        supabase.storage
          .from(bucket)
          .list(basePath, {
            limit: 100,
            offset: 0,
          }),
      )

      if (error) {
        continue
      }

      const directFiles = (data ?? []).filter((item) => item.name && !item.name.endsWith('/'))
      let filesWithPath: Array<{ fullPath: string; updatedAt?: string | null; createdAt?: string | null }> =
        directFiles.map((item) => ({
          fullPath: `${basePath}/${item.name}`,
          updatedAt: item.updated_at,
          createdAt: item.created_at,
        }))

      const folders = (data ?? []).filter((item) => !item.metadata)

      for (const folder of folders) {
        const nestedPath = `${basePath}/${folder.name}`
        const nested = await withRetry(() =>
          supabase.storage
            .from(bucket)
            .list(nestedPath, {
              limit: 100,
              offset: 0,
            }),
        )

        if (nested.error || !nested.data?.length) {
          continue
        }

        const nestedFiles = nested.data.filter((item) => item.name && !item.name.endsWith('/'))
        filesWithPath = filesWithPath.concat(
          nestedFiles.map((item) => ({
            fullPath: `${nestedPath}/${item.name}`,
            updatedAt: item.updated_at,
            createdAt: item.created_at,
          })),
        )
      }

      if (filesWithPath.length === 0) {
        continue
      }

      const latestFile = [...filesWithPath].sort((a, b) => {
        const aTime = new Date(a.updatedAt ?? a.createdAt ?? 0).getTime()
        const bTime = new Date(b.updatedAt ?? b.createdAt ?? 0).getTime()
        return bTime - aTime
      })[0]

      const fullPath = latestFile.fullPath

      const signed = await withRetry(() =>
        supabase.storage
          .from(bucket)
          .createSignedUrl(fullPath, 60 * 60),
      )

      if (!signed.error && signed.data?.signedUrl) {
        return signed.data.signedUrl
      }

      const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(fullPath)
      if (publicData.publicUrl) {
        return publicData.publicUrl
      }
    }
  }

  return null
}

export async function getAuthorityDashboardSummary(): Promise<AuthorityDashboardSummary> {
  const { data, error } = await withRetry(
    () =>
      supabase
        .from('cases')
        .select(
          'id, numero_caso, status, workflow_status, nombres, apellidos, edad, ciudad, estado_provincia, lugar_ultima_vez, fecha_desaparicion, created_at',
        )
        .eq('eliminado', false)
        .order('created_at', { ascending: false })
        .limit(120),
    { timeoutMs: 35000, retries: 1 },
  )

  if (error) {
    throwDbError('getAuthorityDashboardSummary', error, 'Error al cargar el dashboard. Inténtalo nuevamente.')
  }

  const rows = (data ?? []) as AuthorityCaseRow[]

  const summary: AuthorityDashboardSummary = {
    total: rows.length,
    active: 0,
    inProgress: 0,
    resolved: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    found: 0,
    closed: 0,
    recentCases: rows.slice(0, 5),
  }

  rows.forEach((row) => {
    if (row.status === 'activo') summary.active += 1
    if (row.status === 'en_proceso') summary.inProgress += 1
    if (row.status === 'resuelto') summary.resolved += 1

    if (row.workflow_status === 'approved') summary.approved += 1
    else if (row.workflow_status === 'rejected') summary.rejected += 1
    else if (row.workflow_status === 'found') summary.found += 1
    else if (row.workflow_status === 'closed') summary.closed += 1
    else summary.pending += 1
  })

  return summary
}

export type AdminDashboardSummary = AuthorityDashboardSummary

export async function getAdminDashboardSummary(): Promise<AdminDashboardSummary> {
  return getAuthorityDashboardSummary()
}

