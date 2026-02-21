export const ROLES = {
  ADMIN: 'admin',
  USER: 'user',
  AUTHORITY: 'authority',
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]
