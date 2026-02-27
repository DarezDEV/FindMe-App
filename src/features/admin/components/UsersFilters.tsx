// src/features/admin/components/users/UsersFilters.tsx
import { Search } from 'lucide-react'
import type { Role } from './RoleBadge'

interface Props {
  search: string
  onSearchChange: (v: string) => void
  filterRole: Role | 'all'
  onRoleChange: (v: Role | 'all') => void
  filterStatus: 'all' | 'active' | 'inactive'
  onStatusChange: (v: 'all' | 'active' | 'inactive') => void
}

export function UsersFilters({
  search, onSearchChange,
  filterRole, onRoleChange,
  filterStatus, onStatusChange,
}: Props) {
  return (
    <div className="card p-4">
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Búsqueda */}
        <div className="relative flex-1">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none"
          />
          <input
            className="input-field pl-9"
            placeholder="Buscar por nombre o correo..."
            value={search}
            onChange={e => onSearchChange(e.target.value)}
          />
        </div>

        {/* Filtro rol */}
        <select
          className="input-field w-full sm:w-44"
          value={filterRole}
          onChange={e => onRoleChange(e.target.value as Role | 'all')}
        >
          <option value="all">Todos los roles</option>
          <option value="user">Usuario</option>
          <option value="authority">Autoridad</option>
          <option value="admin">Admin</option>
        </select>

        {/* Filtro estado */}
        <select
          className="input-field w-full sm:w-40"
          value={filterStatus}
          onChange={e => onStatusChange(e.target.value as any)}
        >
          <option value="all">Todos</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
        </select>
      </div>
    </div>
  )
}