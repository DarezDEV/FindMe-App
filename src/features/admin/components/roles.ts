export type Role = 'user' | 'authority' | 'admin'

export const ROLE_OPTIONS: Role[] = ['user', 'authority', 'admin']

const ROLE_LABELS: Record<Role, string> = {
  user: 'Usuario',
  authority: 'Autoridad',
  admin: 'Admin',
}

export function roleLabel(role: Role): string {
  return ROLE_LABELS[role]
}

