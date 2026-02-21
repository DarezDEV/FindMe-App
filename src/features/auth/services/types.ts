import type { Role } from '../../../shared/constants/roles'

export interface AuthUser {
  id: string
  email: string
  role: Role
}
