export const ROLES = {
  USER: 'user',
  AUTHORITY: 'authority',
  ADMIN: 'admin',
} as const

export type RoleName = (typeof ROLES)[keyof typeof ROLES]

export const ROLE_LABELS: Record<RoleName, string> = {
  user: 'Usuario',
  authority: 'Autoridad',
  admin: 'Administrador',
}