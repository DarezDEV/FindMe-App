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
  nombres: string
  apellidos: string
  edad: number | null
  ciudad: string | null
  estado_provincia: string | null
  lugar_ultima_vez: string | null
  fecha_desaparicion: string | null
  created_at: string
}

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('[getProfile] Error:', error)
    throw error
  }
  return data
}

export async function getUserRoles(userId: string): Promise<string[]> {
  const { data: userRoles, error: urError } = await supabase
    .from('user_roles')
    .select('role_id')
    .eq('user_id', userId)

  if (urError) throw urError
  if (!userRoles || userRoles.length === 0) return []

  const roleIds = userRoles.map((r: UserRoleRow) => r.role_id)

  if (roleIds.length === 0) return []

  const { data: roles, error: rError } = await supabase
    .from('roles')
    .select('name')
    .in('id', roleIds)

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

  const { data, error } = await query

  if (error) {
    console.error('[getAuthorityCases] Error:', error)
    throw error
  }

  return (data ?? []) as AuthorityCaseRow[]
}

export async function softDeleteCase(caseId: string): Promise<void> {
  const { error } = await supabase
    .from('casos')
    .update({
      eliminado: true,
      eliminado_at: new Date().toISOString(),
    })
    .eq('id', caseId)

  if (error) {
    console.error('[softDeleteCase] Error:', error)
    throw error
  }
}

export async function updateCaseWorkflowStatus(caseId: string, status: CaseWorkflowStatus): Promise<void> {
  const { error } = await supabase
    .from('casos')
    .update({
      workflow_status: status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', caseId)

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

  const { data, error } = await supabase
    .from('caso_comentarios')
    .select('id, caso_id, autor_id, comentario, created_at')
    .in('caso_id', caseIds)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[getCaseComments] Error:', error)
    throw error
  }

  return (data ?? []) as CaseCommentRow[]
}

export async function createCaseComment(casoId: string, autorId: string, comentario: string): Promise<void> {
  const { error } = await supabase
    .from('caso_comentarios')
    .insert({
      caso_id: casoId,
      autor_id: autorId,
      comentario,
    })

  if (error) {
    console.error('[createCaseComment] Error:', error)
    throw error
  }
}
