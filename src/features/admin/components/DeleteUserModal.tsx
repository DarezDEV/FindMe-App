// src/features/admin/components/users/DeleteUserModal.tsx
import { AlertTriangle } from 'lucide-react'
import type { UserRow } from './UserTableRow'

interface Props {
  user: UserRow
  loading: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function DeleteUserModal({ user, loading, onConfirm, onCancel }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-5">

        <div className="flex items-center gap-4">
          <div className="bg-error/10 p-3 rounded-xl shrink-0">
            <AlertTriangle size={22} className="text-error" />
          </div>
          <div>
            <h3 className="font-bold text-text-primary">Eliminar usuario</h3>
            <p className="text-text-secondary text-sm">Esta acción no se puede deshacer</p>
          </div>
        </div>

        <p className="text-sm text-text-secondary">
          ¿Estás seguro de que deseas eliminar a{' '}
          <span className="font-semibold text-text-primary">
            {user.name} {user.last_name}
          </span>?
        </p>

        <div className="flex gap-3">
          <button onClick={onCancel} className="btn-secondary flex-1">
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 bg-error hover:bg-error/90 text-white font-semibold py-2.5 px-4 rounded-lg text-sm
              transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Eliminando...
              </span>
            ) : 'Sí, eliminar'}
          </button>
        </div>
      </div>
    </div>
  )
}