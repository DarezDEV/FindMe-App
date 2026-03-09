// src/features/admin/components/users/UserTableRow.tsx
import { Pencil, Trash2 } from 'lucide-react'
import { UserAvatar } from './UserAvatar'
import { RoleBadge } from './RoleBadge'
import { StatusBadge } from './StatusBadge'
import type { Role } from './role-meta'

export interface UserRow {
  id: string
  name: string
  last_name: string
  email: string
  activo: boolean
  created_at: string
  roles: Role[]
}

interface Props {
  user: UserRow
  onEdit: (user: UserRow) => void
  onDelete: (user: UserRow) => void
  onToggleStatus: (user: UserRow) => void
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-DO', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

export function UserTableRow({ user, onEdit, onDelete, onToggleStatus }: Props) {
  return (
    <tr className="hover:bg-background/60 transition-colors">
      {/* Usuario */}
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <UserAvatar name={user.name} lastName={user.last_name} />
          <div>
            <p className="font-medium text-text-primary text-sm">
              {user.name} {user.last_name}
            </p>
            <p className="text-text-secondary text-xs">{user.email}</p>
          </div>
        </div>
      </td>

      {/* Roles */}
      <td className="px-5 py-4 hidden md:table-cell">
        <div className="flex gap-1 flex-wrap">
          {user.roles.length > 0
            ? user.roles.map(r => <RoleBadge key={r} role={r} />)
            : <span className="text-text-secondary text-xs">Sin rol</span>
          }
        </div>
      </td>

      {/* Fecha */}
      <td className="px-5 py-4 hidden lg:table-cell">
        <span className="text-text-secondary text-sm">{formatDate(user.created_at)}</span>
      </td>

      {/* Estado */}
      <td className="px-5 py-4">
        <StatusBadge activo={user.activo} onClick={() => onToggleStatus(user)} />
      </td>

      {/* Acciones */}
      <td className="px-5 py-4">
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => onEdit(user)}
            className="p-2 rounded-lg text-text-secondary hover:text-primary hover:bg-primary/8 transition-all"
            title="Editar"
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={() => onDelete(user)}
            className="p-2 rounded-lg text-text-secondary hover:text-error hover:bg-error/8 transition-all"
            title="Eliminar"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </td>
    </tr>
  )
}
