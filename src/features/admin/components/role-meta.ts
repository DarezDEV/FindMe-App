import { Shield, User, type LucideIcon } from 'lucide-react'

export type Role = 'user' | 'authority' | 'admin'

export const ROLE_META: Record<Role, { label: string; className: string; Icon: LucideIcon }> = {
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

export const ROLE_OPTIONS: Role[] = ['user', 'authority', 'admin']

export function roleLabel(role: Role) {
  return ROLE_META[role].label
}
