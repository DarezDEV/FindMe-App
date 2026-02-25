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
  ciudad: string | null
  estado_provincia: string | null
  lugar_ultima_vez: string | null
  descripcion_general?: string | null
  fecha_desaparicion: string | null
  created_at: string
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
          'id, numero_caso, status, workflow_status, publicado_por, nombres, apellidos, edad, ciudad, estado_provincia, lugar_ultima_vez, descripcion_general, created_at',
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
