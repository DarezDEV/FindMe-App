// src/features/admin/hooks/useUsers.ts
import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase/client'
import { appToast } from '../components/ui'
import { handleError } from '../utils/handleError'
import { getErrorMessage, toAppError } from '../utils/errors'
import {
  ADMIN_DASHBOARD_SUMMARY_QUERY_KEY,
  ADMIN_QUERY_GC_TIME,
  ADMIN_QUERY_STALE_TIME,
  ADMIN_USERS_QUERY_KEY,
} from '../../features/admin/hooks/queryKeys'
import type { Role } from '../../features/admin/components/role-meta'
import type { UserRow } from '../../features/admin/components/UserTableRow'

const PAGE_SIZE = 8
const USERS_TIMEOUT_MS = 15000

type ProfileRow = Record<string, unknown>

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
  const baseColumns = 'id, name, email, activo, created_at'
  const lastNameCandidates = ['last_name', 'last_nmae', 'apellido', 'apellidos'] as const
  const selectCandidates = lastNameCandidates.flatMap((lastNameColumn) => [
    `${baseColumns}, ${lastNameColumn}, avatar_url`,
    `${baseColumns}, ${lastNameColumn}`,
  ])

  const pickString = (row: ProfileRow, keys: string[]): string | null => {
    for (const key of keys) {
      const value = row[key]
      if (typeof value !== 'string') continue
      const trimmed = value.trim()
      if (trimmed) return trimmed
    }
    return null
  }

  const pickBoolean = (row: ProfileRow, key: string): boolean | null => {
    const value = row[key]
    return typeof value === 'boolean' ? value : null
  }

  const pickId = (row: ProfileRow): string => {
    const value = row.id
    if (typeof value === 'string') return value
    if (typeof value === 'number') return String(value)
    return ''
  }

  let profiles: ProfileRow[] | null = null
  let lastProfilesError: unknown = null

  for (const selectColumns of selectCandidates) {
    const response = await withTimeout(
      supabase
        .from('profiles')
        .select(selectColumns)
        .order('created_at', { ascending: false }),
    )

    if (!response.error) {
      profiles = (response.data ?? []) as unknown as ProfileRow[]
      break
    }

    const lowered = response.error.message.toLowerCase()
    if (lowered.includes('column') && lowered.includes('does not exist')) {
      lastProfilesError = response.error
      continue
    }

    throw toAppError(response.error, 'Error al cargar usuarios. Inténtalo nuevamente.', 'useUsers.fetchUsers')
  }

  if (!profiles) {
    if (lastProfilesError) {
      throw toAppError(lastProfilesError, 'Error al cargar usuarios. Inténtalo nuevamente.', 'useUsers.fetchUsers')
    }
    return []
  }

  const { data: userRoles, error: userRolesError } = await withTimeout(
    supabase
      .from('user_roles')
      .select('user_id, roles(name)'),
  )

  if (userRolesError) {
    throw toAppError(userRolesError, 'Error al cargar usuarios. Inténtalo nuevamente.', 'useUsers.fetchUsers')
  }

  const rolesMap: Record<string, Role[]> = {}
  ;((userRoles ?? []) as RoleRelationRow[]).forEach((ur) => {
    if (!rolesMap[ur.user_id]) rolesMap[ur.user_id] = []

    if (Array.isArray(ur.roles)) {
      ur.roles.forEach((role) => rolesMap[ur.user_id].push(role.name))
    } else if (ur.roles?.name) {
      rolesMap[ur.user_id].push(ur.roles.name)
    }
  })

  return profiles.map((profile) => {
    const id = pickId(profile)
    const name = pickString(profile, ['name', 'nombre', 'nombres']) ?? ''
    const lastName = pickString(profile, ['last_name', 'last_nmae', 'apellido', 'apellidos']) ?? ''
    const email = pickString(profile, ['email']) ?? ''
    const createdAt = pickString(profile, ['created_at']) ?? new Date().toISOString()
    const activo = pickBoolean(profile, 'activo') ?? true
    const avatarUrl = pickString(profile, ['avatar_url', 'avatar', 'foto', 'photo_url'])

    return {
      id,
      name,
      last_name: lastName,
      email,
      activo,
      created_at: createdAt,
      avatar_url: avatarUrl,
      roles: rolesMap[id] ?? [],
    }
  })
}

export function useUsers() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState<Role | 'all'>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [page, setPage] = useState(1)

  const {
    data: users = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ADMIN_USERS_QUERY_KEY,
    queryFn: fetchUsers,
    staleTime: ADMIN_QUERY_STALE_TIME,
    gcTime: ADMIN_QUERY_GC_TIME,
    refetchOnWindowFocus: false,
  })

  const loadError = error ? getErrorMessage(error, 'Error al cargar usuarios. Inténtalo nuevamente.') : null

  useEffect(() => {
    if (!error) return
    handleError('useUsers.query', error, { fallbackMessage: 'Error al cargar usuarios. Inténtalo nuevamente.', toast: false })
  }, [error])

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

  const syncAdminQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ADMIN_USERS_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: ADMIN_DASHBOARD_SUMMARY_QUERY_KEY }),
    ])
  }

  const updateSearch = (value: string) => {
    setSearch(value)
    setPage(1)
  }

  const updateFilterRole = (value: Role | 'all') => {
    setFilterRole(value)
    setPage(1)
  }

  const updateFilterStatus = (value: 'all' | 'active' | 'inactive') => {
    setFilterStatus(value)
    setPage(1)
  }

  const load = async () => {
    await refetch()
  }

  const toggleActivo = async (user: UserRow) => {
    try {
      const nextState = !user.activo
      const { error } = await supabase.from('profiles').update({ activo: nextState }).eq('id', user.id)
      if (error) throw error

      await syncAdminQueries()
      appToast.success(
        nextState
          ? `Usuario ${user.name} ${user.last_name} activado correctamente.`
          : `Usuario ${user.name} ${user.last_name} desactivado correctamente.`,
      )
    } catch (err) {
      handleError('useUsers.toggleActivo', err, { fallbackMessage: 'No se pudo actualizar el estado del usuario.' })
    }
  }

  const deleteUser = async (userId: string) => {
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', userId)
      if (error) throw error
      await syncAdminQueries()
    } catch (error) {
      throw toAppError(error, 'No se pudo eliminar el usuario. Inténtalo nuevamente.', 'useUsers.deleteUser')
    }
  }

  const stats = {
    total: users.length,
    active: users.filter((u) => u.activo).length,
    authorities: users.filter((u) => u.roles.includes('authority')).length,
    admins: users.filter((u) => u.roles.includes('admin')).length,
  }

  return {
    users: paginated,
    loading: isLoading,
    refreshing: isFetching,
    error: loadError,
    stats,
    page,
    totalPages,
    totalFiltered: filtered.length,
    pageSize: PAGE_SIZE,
    setPage,
    search,
    setSearch: updateSearch,
    filterRole,
    setFilterRole: updateFilterRole,
    filterStatus,
    setFilterStatus: updateFilterStatus,
    load,
    toggleActivo,
    deleteUser,
  }
}
