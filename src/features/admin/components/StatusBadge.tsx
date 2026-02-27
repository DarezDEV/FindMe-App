// src/features/admin/components/users/StatusBadge.tsx

interface Props {
  activo: boolean
  onClick?: () => void
}

export function StatusBadge({ activo, onClick }: Props) {
  const base = `inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium
    ${activo ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}
    ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`

  return (
    <span className={base} onClick={onClick} title={onClick ? 'Clic para cambiar estado' : undefined}>
      <span className={`w-1.5 h-1.5 rounded-full ${activo ? 'bg-success' : 'bg-error'}`} />
      {activo ? 'Activo' : 'Inactivo'}
    </span>
  )
}