// src/features/admin/pages/AdminUsers.tsx
import { useState } from 'react'
import { Plus, RefreshCw } from 'lucide-react'
import AdminSidebar from '../components/Adminsidebar'
import { useUsers } from '../../../shared/hooks/useUsers'
import { UsersFilters } from '../components/UsersFilters'
import { UsersTable } from '../components/UsersTable'
import { UserFormModal } from '../components/UserFormModal'
import { DeleteUserModal } from '../components/DeleteUserModal'
import type { UserRow } from '../components/UserTableRow'

type ModalState =
  | { type: 'create' }
  | { type: 'edit'; user: UserRow }
  | { type: 'delete'; user: UserRow }
  | { type: null }

export default function AdminUsers() {
  const {
    users, loading, refreshing,
    page, totalPages, totalFiltered, pageSize, setPage,
    search, setSearch,
    filterRole, setFilterRole,
    filterStatus, setFilterStatus,
    load, toggleActivo, deleteUser,
  } = useUsers()

  const [modal, setModal] = useState<ModalState>({ type: null })
  const [deleteLoading, setDeleteLoading] = useState(false)

  const closeModal = () => setModal({ type: null })

  const handleDelete = async () => {
    if (modal.type !== 'delete') return
    setDeleteLoading(true)
    await deleteUser(modal.user.id)
    setDeleteLoading(false)
    closeModal()
  }

  return (
    <AdminSidebar>
      <div className="p-6 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Gestión de usuarios</h1>
            <p className="text-text-secondary text-sm mt-0.5">
              Administra los usuarios registrados en el sistema
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => void load()} className="btn-secondary flex items-center gap-2">
              <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
              Actualizar
            </button>
            <button
              onClick={() => setModal({ type: 'create' })}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={16} />
              Nuevo usuario
            </button>
          </div>
        </div>

        {/* Filtros */}
        <UsersFilters
          search={search}           onSearchChange={setSearch}
          filterRole={filterRole}   onRoleChange={setFilterRole}
          filterStatus={filterStatus} onStatusChange={setFilterStatus}
        />

        {/* Tabla */}
        <UsersTable
          users={users}
          loading={loading}
          page={page}
          totalPages={totalPages}
          totalFiltered={totalFiltered}
          pageSize={pageSize}
          onPageChange={setPage}
          onEdit={user => setModal({ type: 'edit', user })}
          onDelete={user => setModal({ type: 'delete', user })}
          onToggleStatus={toggleActivo}
        />

      </div>

      {/* Modal crear */}
      {modal.type === 'create' && (
        <UserFormModal
          mode="create"
          user={null}
          onClose={closeModal}
          onSuccess={closeModal}
        />
      )}

      {/* Modal editar */}
      {modal.type === 'edit' && (
        <UserFormModal
          mode="edit"
          user={modal.user}
          onClose={closeModal}
          onSuccess={closeModal}
        />
      )}

      {/* Modal eliminar */}
      {modal.type === 'delete' && (
        <DeleteUserModal
          user={modal.user}
          loading={deleteLoading}
          onConfirm={handleDelete}
          onCancel={closeModal}
        />
      )}
    </AdminSidebar>
  )
}
