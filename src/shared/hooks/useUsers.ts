// src/features/admin/hooks/useUsers.ts
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase/client'
import type { Role } from '../../features/admin/components/RoleBadge'
import type { UserRow } from '../../features/admin/components/UserTableRow'

const PAGE_SIZE = 8
const USERS_TIMEOUT_MS = 15000

interface ProfileRow {
  id: string
  name: string
  last_name: string
  email: string
  activo: boolean
  created_at: string
}

interface RoleRelationRow {
  user_id: string
  roles: { name: Role } | Array<{ name: Role }> | null
}

const withTimeout = async <T,>(promise: PromiseLike<T>, ms = USERS_TIMEOUT_MS): Promise<T> => {
  let timeoutId: number | undefined

  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeoutId = window.setTimeout(() => reject(new Error('Timeout')), ms)
      }),
    ])
  } finally {
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId)
    }
  }
}

async function fetchUsers(): Promise<UserRow[]> {
  const { data: profiles, error } = await withTimeout(
    supabase
      .from('profiles')
      .select('id, name, last_name, email, activo, created_at')
      .order('created_at', { ascending: false })
  )

  if (error) throw error

  const { data: userRoles, error: userRolesError } = await withTimeout(
    supabase
      .from('user_roles')
      .select('user_id, roles(name)')
  )

  if (userRolesError) throw userRolesError

  const rolesMap: Record<string, Role[]> = {}
  ;((userRoles ?? []) as RoleRelationRow[]).forEach((ur) => {
    if (!rolesMap[ur.user_id]) rolesMap[ur.user_id] = []

    if (Array.isArray(ur.roles)) {
      ur.roles.forEach((role) => rolesMap[ur.user_id].push(role.name))
    } else if (ur.roles?.name) {
      rolesMap[ur.user_id].push(ur.roles.name)
    }
  })

  return ((profiles ?? []) as ProfileRow[]).map((profile) => ({
    ...profile,
    roles: rolesMap[profile.id] ?? [],
  }))
}

export function useUsers() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState<Role | 'all'>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [page, setPage] = useState(1)

  const load = async () => {
    setLoading(true)
    try {
      setUsers(await fetchUsers())
    } catch (err) {
      if (err instanceof Error && err.message === 'Timeout') {
        console.error('[useUsers] Timeout cargando usuarios')
      } else {
        console.error('[useUsers]', err)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  useEffect(() => {
    setPage(1)
  }, [search, filterRole, filterStatus])

  const filtered = users.filter((u) => {
    const matchSearch = `${u.name} ${u.last_name} ${u.email}`
      .toLowerCase()
      .includes(search.toLowerCase())

    const matchRole = filterRole === 'all' || u.roles.includes(filterRole)

    const matchStatus =
      filterStatus === 'all' ||
      (filterStatus === 'active' && u.activo) ||
      (filterStatus === 'inactive' && !u.activo)

    return matchSearch && matchRole && matchStatus
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const toggleActivo = async (user: UserRow) => {
    await supabase.from('profiles').update({ activo: !user.activo }).eq('id', user.id)
    await load()
  }

  const deleteUser = async (userId: string) => {
    await supabase.from('profiles').delete().eq('id', userId)
    await load()
  }

  const stats = {
    total: users.length,
    active: users.filter((u) => u.activo).length,
    authorities: users.filter((u) => u.roles.includes('authority')).length,
    admins: users.filter((u) => u.roles.includes('admin')).length,
  }

  return {
    users: paginated,
    loading,
    stats,
    page,
    totalPages,
    totalFiltered: filtered.length,
    pageSize: PAGE_SIZE,
    setPage,
    search,
    setSearch,
    filterRole,
    setFilterRole,
    filterStatus,
    setFilterStatus,
    load,
    toggleActivo,
    deleteUser,
  }
}
