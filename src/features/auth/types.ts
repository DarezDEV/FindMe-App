export type Role = 'user' | 'authority' | 'admin'

export interface UserProfile {
  id: string
  name: string
  last_nmae: string   // typo del schema original — no cambiar
  email: string
  activo: boolean
  created_at: string
  avatar_url?: string | null
  roles: Role[]
}

export interface LoginFormData {
  email: string
  password: string
}

export interface RegisterFormData {
  name: string
  last_name: string
  email: string
  password: string
  confirm: string
}