import { supabase } from './client'
import type { UserProfile } from '../../features/auth/types'

interface UserRoleRow {
  role_id: string
}

interface RoleRow {
  name: string
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