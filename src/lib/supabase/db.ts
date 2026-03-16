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
  updated_at?: string | null
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

export type AdminDashboardActivityType = 'user' | 'case' | 'resolved'

export interface AdminDashboardActivityItem {
  id: string
  type: AdminDashboardActivityType
  title: string
  detail: string
  created_at: string
}

export interface AdminDashboardSummary {
  totalUsers: number
  usersThisMonth: number
  usersPreviousMonth: number
  activeAuthorities: number
  authoritiesThisMonth: number
  authoritiesPreviousMonth: number
  activeCases: number
  casesThisWeek: number
  casesPreviousWeek: number
  resolvedCases: number
  resolvedThisMonth: number
  resolvedPreviousMonth: number
  pendingCases: number
  recentCases: AuthorityCaseRow[]
  recentActivity: AdminDashboardActivityItem[]
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

interface AdminProfileRow {
  id: string
  name: string | null
  last_name: string | null
  email: string | null
  activo: boolean | null
  created_at: string | null
}

interface UserRoleRelationRow {
  user_id: string
  roles: { name: AppRole } | Array<{ name: AppRole }> | null
}

interface AdminCaseMetricsRow {
  id: string
  status: string | null
  workflow_status: string | null
  created_at: string | null
  updated_at: string | null
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

function createDateAtMidnight(base: Date) {
  const date = new Date(base)
  date.setHours(0, 0, 0, 0)
  return date
}

function getStartOfCurrentMonth(base = new Date()) {
  return new Date(base.getFullYear(), base.getMonth(), 1)
}

function getStartOfPreviousMonth(base = new Date()) {
  return new Date(base.getFullYear(), base.getMonth() - 1, 1)
}

function getStartOfCurrentWeek(base = new Date()) {
  const date = createDateAtMidnight(base)
  const currentDay = date.getDay()
  const diffToMonday = currentDay === 0 ? 6 : currentDay - 1
  date.setDate(date.getDate() - diffToMonday)
  return date
}

function getStartOfPreviousWeek(base = new Date()) {
  const date = getStartOfCurrentWeek(base)
  date.setDate(date.getDate() - 7)
  return date
}

function getTimestamp(value: string | null | undefined) {
  if (!value) return null
  const time = new Date(value).getTime()
  return Number.isNaN(time) ? null : time
}

function isWithinRange(value: string | null | undefined, start: Date, end?: Date) {
  const timestamp = getTimestamp(value)
  if (timestamp === null) return false

  const startTime = start.getTime()
  if (timestamp < startTime) return false

  if (!end) return true
  return timestamp < end.getTime()
}

function isResolvedCase(status: string | null | undefined, workflowStatus: string | null | undefined) {
  const normalizedStatus = status?.trim().toLowerCase() ?? ''
  return (
    workflowStatus === 'found' ||
    workflowStatus === 'closed' ||
    normalizedStatus === 'encontrado' ||
    normalizedStatus === 'resuelto' ||
    normalizedStatus === 'cerrado'
  )
}

function isActiveCase(status: string | null | undefined, workflowStatus: string | null | undefined) {
  if (workflowStatus === 'rejected' || workflowStatus === 'closed' || workflowStatus === 'found') {
    return false
  }

  const normalizedStatus = status?.trim().toLowerCase() ?? ''
  return (
    normalizedStatus === 'activo' ||
    normalizedStatus === 'en_proceso' ||
    normalizedStatus === 'en_revision' ||
    normalizedStatus === 'avistado' ||
    normalizedStatus.length === 0
  )
}

function isPendingWorkflow(workflowStatus: string | null | undefined) {
  return workflowStatus === 'pending' || workflowStatus === null
}

function formatDisplayName(
  value: { name?: string | null; last_name?: string | null; email?: string | null },
  fallback = 'Usuario',
) {
  const name = toText(value.name)
  const lastName = toText(value.last_name)
  const fullName = [name, lastName].filter(Boolean).join(' ')
  if (fullName) return fullName

  const email = toText(value.email)
  if (!email) return fallback

  return email.includes('@') ? email.split('@')[0] : email
}

function buildRoleMap(rows: UserRoleRelationRow[]) {
  const roleMap: Record<string, AppRole[]> = {}

  rows.forEach((row) => {
    if (!roleMap[row.user_id]) {
      roleMap[row.user_id] = []
    }

    if (Array.isArray(row.roles)) {
      row.roles.forEach((role) => {
        if (!roleMap[row.user_id].includes(role.name)) {
          roleMap[row.user_id].push(role.name)
        }
      })
      return
    }

    if (row.roles?.name && !roleMap[row.user_id].includes(row.roles.name)) {
      roleMap[row.user_id].push(row.roles.name)
    }
  })

  return roleMap
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

export async function getAdminDashboardSummary(): Promise<AdminDashboardSummary> {
  const now = new Date()
  const startOfCurrentMonth = getStartOfCurrentMonth(now)
  const startOfPreviousMonth = getStartOfPreviousMonth(now)
  const startOfCurrentWeek = getStartOfCurrentWeek(now)
  const startOfPreviousWeek = getStartOfPreviousWeek(now)

  const [profilesResponse, userRolesResponse, caseMetricsResponse, recentCasesResponse] = await Promise.all([
    withRetry(
      () =>
        supabase
          .from('profiles')
          .select('id, name, last_name, email, activo, created_at')
          .order('created_at', { ascending: false }),
      { timeoutMs: 30000, retries: 1 },
    ),
    withRetry(
      () =>
        supabase
          .from('user_roles')
          .select('user_id, roles(name)'),
      { timeoutMs: 30000, retries: 1 },
    ),
    withRetry(
      () =>
        supabase
          .from('cases')
          .select('id, status, workflow_status, created_at, updated_at')
          .eq('eliminado', false),
      { timeoutMs: 35000, retries: 1 },
    ),
    withRetry(
      () =>
        supabase
          .from('cases')
          .select(
            'id, numero_caso, status, workflow_status, nombres, apellidos, edad, ciudad, estado_provincia, lugar_ultima_vez, fecha_desaparicion, created_at, updated_at',
          )
          .eq('eliminado', false)
          .order('created_at', { ascending: false })
          .limit(12),
      { timeoutMs: 35000, retries: 1 },
    ),
  ])

  if (profilesResponse.error) {
    console.error('[getAdminDashboardSummary] Profiles error:', profilesResponse.error)
    throw profilesResponse.error
  }

  if (userRolesResponse.error) {
    console.error('[getAdminDashboardSummary] User roles error:', userRolesResponse.error)
    throw userRolesResponse.error
  }

  if (caseMetricsResponse.error) {
    console.error('[getAdminDashboardSummary] Case metrics error:', caseMetricsResponse.error)
    throw caseMetricsResponse.error
  }

  if (recentCasesResponse.error) {
    console.error('[getAdminDashboardSummary] Recent cases error:', recentCasesResponse.error)
    throw recentCasesResponse.error
  }

  const profiles = (profilesResponse.data ?? []) as AdminProfileRow[]
  const userRoles = (userRolesResponse.data ?? []) as UserRoleRelationRow[]
  const caseMetrics = (caseMetricsResponse.data ?? []) as AdminCaseMetricsRow[]
  const recentCaseRows = (recentCasesResponse.data ?? []) as AuthorityCaseRow[]
  const roleMap = buildRoleMap(userRoles)

  let usersThisMonth = 0
  let usersPreviousMonth = 0
  let activeAuthorities = 0
  let authoritiesThisMonth = 0
  let authoritiesPreviousMonth = 0

  profiles.forEach((profile) => {
    const createdAt = profile.created_at
    const roles = roleMap[profile.id] ?? []
    const isAuthority = roles.includes('authority')
    const isActive = profile.activo ?? true

    if (isWithinRange(createdAt, startOfCurrentMonth)) {
      usersThisMonth += 1
    } else if (isWithinRange(createdAt, startOfPreviousMonth, startOfCurrentMonth)) {
      usersPreviousMonth += 1
    }

    if (isAuthority && isActive) {
      activeAuthorities += 1
    }

    if (!isAuthority) return

    if (isWithinRange(createdAt, startOfCurrentMonth)) {
      authoritiesThisMonth += 1
    } else if (isWithinRange(createdAt, startOfPreviousMonth, startOfCurrentMonth)) {
      authoritiesPreviousMonth += 1
    }
  })

  let activeCases = 0
  let casesThisWeek = 0
  let casesPreviousWeek = 0
  let resolvedCases = 0
  let resolvedThisMonth = 0
  let resolvedPreviousMonth = 0
  let pendingCases = 0

  caseMetrics.forEach((row) => {
    if (isActiveCase(row.status, row.workflow_status)) {
      activeCases += 1
    }

    if (isPendingWorkflow(row.workflow_status)) {
      pendingCases += 1
    }

    if (isWithinRange(row.created_at, startOfCurrentWeek)) {
      casesThisWeek += 1
    } else if (isWithinRange(row.created_at, startOfPreviousWeek, startOfCurrentWeek)) {
      casesPreviousWeek += 1
    }

    if (!isResolvedCase(row.status, row.workflow_status)) return

    resolvedCases += 1

    const resolutionDate = row.updated_at ?? row.created_at
    if (isWithinRange(resolutionDate, startOfCurrentMonth)) {
      resolvedThisMonth += 1
    } else if (isWithinRange(resolutionDate, startOfPreviousMonth, startOfCurrentMonth)) {
      resolvedPreviousMonth += 1
    }
  })

  const recentUsers = profiles.slice(0, 4).flatMap<AdminDashboardActivityItem>((profile) => {
    if (!profile.created_at) return []

    return [
      {
        id: `user-${profile.id}`,
        type: 'user',
        title: 'Nuevo usuario registrado',
        detail: formatDisplayName(profile, 'Usuario nuevo'),
        created_at: profile.created_at,
      },
    ]
  })

  const recentResolvedCases = [...recentCaseRows]
    .filter((row) => isResolvedCase(row.status, row.workflow_status))
    .sort((a, b) => {
      const aTime = getTimestamp(a.updated_at ?? a.created_at) ?? 0
      const bTime = getTimestamp(b.updated_at ?? b.created_at) ?? 0
      return bTime - aTime
    })
    .slice(0, 4)
    .flatMap<AdminDashboardActivityItem>((row) => {
      const timestamp = row.updated_at ?? row.created_at
      if (!timestamp) return []

      return [
        {
          id: `resolved-${row.id}`,
          type: 'resolved',
          title: 'Caso actualizado',
          detail: `${row.numero_caso} - ${row.nombres} ${row.apellidos}`,
          created_at: timestamp,
        },
      ]
    })

  const recentCreatedCases = recentCaseRows
    .filter((row) => !isResolvedCase(row.status, row.workflow_status))
    .slice(0, 4)
    .flatMap<AdminDashboardActivityItem>((row) => {
      if (!row.created_at) return []

      return [
        {
          id: `case-${row.id}`,
          type: 'case',
          title: 'Nuevo caso registrado',
          detail: `${row.numero_caso} - ${row.nombres} ${row.apellidos}`,
          created_at: row.created_at,
        },
      ]
    })

  const recentActivity = [...recentUsers, ...recentResolvedCases, ...recentCreatedCases]
    .sort((a, b) => {
      const aTime = getTimestamp(a.created_at) ?? 0
      const bTime = getTimestamp(b.created_at) ?? 0
      return bTime - aTime
    })
    .slice(0, 6)

  return {
    totalUsers: profiles.length,
    usersThisMonth,
    usersPreviousMonth,
    activeAuthorities,
    authoritiesThisMonth,
    authoritiesPreviousMonth,
    activeCases,
    casesThisWeek,
    casesPreviousWeek,
    resolvedCases,
    resolvedThisMonth,
    resolvedPreviousMonth,
    pendingCases,
    recentCases: recentCaseRows.slice(0, 5),
    recentActivity,
  }
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
