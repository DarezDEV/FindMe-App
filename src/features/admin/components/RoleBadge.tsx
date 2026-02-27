// src/features/admin/components/users/RoleBadge.tsx
import { User, Shield } from 'lucide-react'

export type Role = 'user' | 'authority' | 'admin'

const config: Record<Role, { label: string; className: string; Icon: React.ElementType }> = {
  user: {
    label: 'Usuario',
    className: 'badge-user',
    Icon: User,
  },
  authority: {
    label: 'Autoridad',
    className: 'badge-authority',
    Icon: Shield,
  },
  admin: {
    label: 'Admin',
    className: 'badge-admin',
    Icon: Shield,
  },
}

export function RoleBadge({ role }: { role: Role }) {
  const { label, className, Icon } = config[role]
  return (
    <span className={className}>
      <Icon size={11} />
      {label}
    </span>
  )
}

export const ROLE_OPTIONS: Role[] = ['user', 'authority', 'admin']
export const roleLabel = (role: Role) => config[role].label