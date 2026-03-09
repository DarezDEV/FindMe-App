// src/features/admin/components/users/RoleBadge.tsx
import { ROLE_META, type Role } from './role-meta'

export function RoleBadge({ role }: { role: Role }) {
  const { label, className, Icon } = ROLE_META[role]
  return (
    <span className={className}>
      <Icon size={11} />
      {label}
    </span>
  )
}
