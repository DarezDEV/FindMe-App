// src/features/admin/components/users/UsersTable.tsx
import { User, ChevronLeft, ChevronRight } from 'lucide-react'
import { UserTableRow, type UserRow } from './UserTableRow'

interface Props {
  users: UserRow[]
  loading: boolean
  page: number
  totalPages: number
  totalFiltered: number
  pageSize: number
  onPageChange: (page: number) => void
  onEdit: (user: UserRow) => void
  onDelete: (user: UserRow) => void
  onToggleStatus: (user: UserRow) => void
}

export function UsersTable({
  users, loading, page, totalPages, totalFiltered, pageSize,
  onPageChange, onEdit, onDelete, onToggleStatus,
}: Props) {
  return (
    <div className="card overflow-hidden">
      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : users.length === 0 ? (
        /* Empty state */
        <div className="text-center py-20 space-y-3">
          <div className="w-14 h-14 bg-border rounded-2xl flex items-center justify-center mx-auto">
            <User size={24} className="text-text-secondary" />
          </div>
          <p className="text-text-secondary font-medium">No se encontraron usuarios</p>
          <p className="text-text-secondary text-sm">Intenta cambiar los filtros de búsqueda</p>
        </div>
      ) : (
        /* Tabla */
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-background">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-text-secondary uppercase tracking-wider">Usuario</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-text-secondary uppercase tracking-wider hidden md:table-cell">Roles</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-text-secondary uppercase tracking-wider hidden lg:table-cell">Registro</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-text-secondary uppercase tracking-wider">Estado</th>
                <th className="text-right px-5 py-3.5 text-xs font-semibold text-text-secondary uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map(user => (
                <UserTableRow
                  key={user.id}
                  user={user}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onToggleStatus={onToggleStatus}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginación */}
      {!loading && totalFiltered > pageSize && (
        <div className="flex items-center justify-between px-5 py-4 border-t border-border">
          <p className="text-text-secondary text-sm">
            Mostrando {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalFiltered)} de {totalFiltered}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1}
              className="p-2 rounded-lg text-text-secondary hover:text-primary hover:bg-primary/8 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
              <button
                key={n}
                onClick={() => onPageChange(n)}
                className={`w-8 h-8 rounded-lg text-sm font-medium transition-all
                  ${page === n
                    ? 'bg-primary text-white'
                    : 'text-text-secondary hover:bg-primary/8 hover:text-primary'
                  }`}
              >
                {n}
              </button>
            ))}
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page === totalPages}
              className="p-2 rounded-lg text-text-secondary hover:text-primary hover:bg-primary/8 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}