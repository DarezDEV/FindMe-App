import { supabase } from './client'
import type { UserProfile } from '../../features/auth/types'

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

const SIGHTING_TABLE = 'case_sightings'

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

export async function getProfile(userId: string) {
  const { data, error } = await withRetry(() =>
    supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single(),
  )

  if (error) {
    console.error('[getProfile] Error:', error)
    throw error
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

  if (urError) throw urError
  if (!userRoles || userRoles.length === 0) return []

  const roleIds = userRoles.map((r: UserRoleRow) => r.role_id)

  if (roleIds.length === 0) return []

  const { data: roles, error: rError } = await withRetry(() =>
    supabase
      .from('roles')
      .select('name')
      .in('id', roleIds),
  )

  if (rError) throw rError

  const names = (roles ?? []).map((r: RoleRow) => r.name)
  return names
}

export async function getProfileWithRoles(userId: string): Promise<UserProfile> {
  const [profile, roles] = await Promise.all([
    getProfile(userId),
    getUserRoles(userId),
  ])
  return { ...profile, roles } as UserProfile
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
    console.error('[getAuthorityCases] Error:', error)
    throw error
  }

  return (data ?? []) as AuthorityCaseRow[]
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
            workflow_status: normalizeCaseWorkflowStatus(newRowRaw.workflow_status),
            status: pickString(newRowRaw, ['status']),
            eliminado: getBooleanValue(newRowRaw.eliminado),
          },
          old: {
            id: pickString(oldRowRaw, ['id']) ?? '',
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
    console.error(`[getAuthoritySightings] Error en tabla ${SIGHTING_TABLE}:`, error)
    throw error
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
        .map((row) => pickString(row, ['caso_id', 'case_id', 'missing_case_id']))
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
    } catch {
      // If profiles fail, we still return sightings without reporter names.
    }
  }

  return rows.map((row) => {
    const id = pickString(row, ['id', 'avistamiento_id']) ?? crypto.randomUUID()
    const caseId = pickString(row, ['caso_id', 'case_id', 'missing_case_id'])
    const caseFromLookup = caseId ? caseMap.get(caseId) : null
    const reporterId = pickString(row, ['reportado_por', 'reporter_id', 'autor_id', 'user_id', 'created_by'])
    const reporterName = reporterId ? (profileMap.get(reporterId) ?? null) : null
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
  })
}

export async function updateAuthoritySightingStatus(
  sightingId: string,
  status: SightingModerationStatus,
): Promise<void> {
  const updatePayload = {
    updated_at: new Date().toISOString(),
  }

  const attempts: Array<{ idColumn: string; statusColumn: string }> = [
    { idColumn: 'id', statusColumn: 'estado' },
    { idColumn: 'id', statusColumn: 'status' },
    { idColumn: 'id', statusColumn: 'workflow_status' },
    { idColumn: 'avistamiento_id', statusColumn: 'estado' },
    { idColumn: 'avistamiento_id', statusColumn: 'status' },
    { idColumn: 'avistamiento_id', statusColumn: 'workflow_status' },
  ]

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
      console.error('[updateAuthoritySightingStatus] Error:', error)
      throw error
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
    console.error('[softDeleteCase] Error:', error)
    throw error
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
    console.error('[getPendingModerationCases] Error:', error)
    throw error
  }

  return (data ?? []) as AuthorityCaseRow[]
}

export async function getProfilesBasicByIds(userIds: string[]): Promise<ProfileBasicRow[]> {
  if (userIds.length === 0) return []

  const uniqueIds = [...new Set(userIds.filter(Boolean))]
  if (uniqueIds.length === 0) return []

  const { data, error } = await withRetry(() =>
    supabase
      .from('profiles')
      .select('id, name, last_name, email')
      .in('id', uniqueIds),
  )

  if (error) {
    console.error('[getProfilesBasicByIds] Error:', error)
    throw error
  }

  return (data ?? []) as ProfileBasicRow[]
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
    console.error('[updateCaseWorkflowStatus] Error:', error)
    throw error
  }
}

export interface CaseCommentRow {
  id: string
  caso_id: string
  autor_id: string
  comentario: string
  created_at: string
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
    console.error('[getCaseComments] Error:', error)
    throw error
  }

  return (data ?? []) as CaseCommentRow[]
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
    console.error('[createCaseComment] Error:', error)
    throw error
  }

  return data as { id: string }
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
    console.error('[updateCaseComment] Error:', error)
    throw error
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
    console.error('[deleteCaseComment] Error:', error)
    throw error
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
    console.error('[getAuthorityDashboardSummary] Error:', error)
    throw error
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

