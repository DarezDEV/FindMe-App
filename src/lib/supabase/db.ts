import type { User } from '@supabase/supabase-js'
import { supabase } from './client'
import type { UserProfile } from '../../features/auth/types'

interface UserRoleRow {
  role_id: string
}

interface RoleRow {
  name: string
}

type AppRole = UserProfile['roles'][number]

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

interface ProfileRow {
  id: string
  name: string | null
  last_nmae: string | null
  email: string | null
  activo: boolean | null
  created_at: string | null
  avatar_url: string | null
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

function toText(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

function toRole(value: unknown): AppRole | null {
  if (value === 'user' || value === 'authority' || value === 'admin') {
    return value
  }
  return null
}

function readMetadataString(metadata: unknown, key: string): string | null {
  if (!metadata || typeof metadata !== 'object') return null
  return toText((metadata as Record<string, unknown>)[key])
}

function readUserField(authUser: User | null, key: string): string | null {
  if (!authUser) return null
  return readMetadataString(authUser.user_metadata, key) ?? readMetadataString(authUser.app_metadata, key)
}

function parseRoleValue(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === 'string')
  }

  if (typeof value === 'string' && value.trim()) {
    return [value]
  }

  return []
}

function resolveRoles(dbRoles: string[], authUser: User | null): AppRole[] {
  const rolesFromDb = dbRoles.map(toRole).filter((role): role is AppRole => role !== null)
  if (rolesFromDb.length > 0) {
    return [...new Set(rolesFromDb)]
  }

  const metadataCandidates = [
    ...parseRoleValue(authUser?.app_metadata?.roles),
    ...parseRoleValue(authUser?.app_metadata?.role),
    ...parseRoleValue(authUser?.user_metadata?.roles),
    ...parseRoleValue(authUser?.user_metadata?.role),
  ]

  const rolesFromMetadata = metadataCandidates.map(toRole).filter((role): role is AppRole => role !== null)
  if (rolesFromMetadata.length > 0) {
    return [...new Set(rolesFromMetadata)]
  }

  return ['user']
}

function isRecoverableProfileError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false

  const maybeCode = (err as { code?: unknown }).code
  const maybeMessage = (err as { message?: unknown }).message
  const code = typeof maybeCode === 'string' ? maybeCode : ''
  const message = typeof maybeMessage === 'string' ? maybeMessage.toLowerCase() : ''

  return (
    code === 'PGRST116' ||
    message.includes('0 rows') ||
    message.includes('cannot coerce the result') ||
    message.includes('row-level security') ||
    message.includes('permission denied')
  )
}

export async function getProfile(userId: string): Promise<ProfileRow | null> {
  const { data, error } = await withRetry(() =>
    supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle(),
  )

  if (error) {
    console.error('[getProfile] Error:', error)
    throw error
  }
  return (data ?? null) as ProfileRow | null
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
  const [profile, roles, sessionResponse] = await Promise.all([
    getProfile(userId).catch((err) => {
      if (!isRecoverableProfileError(err)) throw err
      console.warn('[getProfileWithRoles] Perfil no disponible, se usa fallback de sesion.', err)
      return null
    }),
    getUserRoles(userId).catch((err) => {
      console.warn('[getProfileWithRoles] No se pudieron cargar roles, se usa fallback.', err)
      return [] as string[]
    }),
    supabase.auth.getSession(),
  ])

  const authUser = sessionResponse.data.session?.user?.id === userId ? sessionResponse.data.session.user : null
  const resolvedRoles = resolveRoles(roles, authUser)
  const email = toText(profile?.email) ?? authUser?.email ?? ''
  const fallbackNameFromEmail = email.includes('@') ? email.split('@')[0] : null

  return {
    id: profile?.id ?? userId,
    name: toText(profile?.name) ?? readUserField(authUser, 'name') ?? fallbackNameFromEmail ?? 'Usuario',
    last_nmae:
      toText(profile?.last_nmae) ??
      readUserField(authUser, 'last_nmae') ??
      readUserField(authUser, 'last_name') ??
      '',
    email,
    activo: typeof profile?.activo === 'boolean' ? profile.activo : true,
    created_at: toText(profile?.created_at) ?? authUser?.created_at ?? new Date().toISOString(),
    avatar_url: toText(profile?.avatar_url),
    roles: resolvedRoles,
  }
}

interface GetCasesParams {
  search?: string
  status?: CaseStatus | 'all'
  limit?: number
}

export async function getAuthorityCases(params: GetCasesParams = {}): Promise<AuthorityCaseRow[]> {
  const { search, status = 'all', limit = 100 } = params

  let query = supabase
    .from('casos')
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

export async function softDeleteCase(caseId: string): Promise<void> {
  const { error } = await withRetry(() =>
    supabase
      .from('casos')
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
        .from('casos')
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
      .from('casos')
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
      .from('caso_comentarios')
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
      .from('caso_comentarios')
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
      .from('caso_comentarios')
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
      .from('caso_comentarios')
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
        .from('casos')
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
