// src/features/admin/components/users/RoleBadge.tsx
import { User, Shield } from 'lucide-react'
import { roleLabel, type Role } from './roles'

const config: Record<Role, { className: string; Icon: React.ElementType }> = {
  user: {
    className: 'badge-user',
    Icon: User,
  },
  authority: {
    className: 'badge-authority',
    Icon: Shield,
  },
  admin: {
    className: 'badge-admin',
    Icon: Shield,
  },
}

export function RoleBadge({ role }: { role: Role }) {
  const { className, Icon } = config[role]
  return (
    <span className={className}>
      <Icon size={11} />
      {roleLabel(role)}
    </span>
  )
}
