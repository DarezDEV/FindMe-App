import type { Role } from '../../../features/auth/types'
import { ROLE_LABELS } from '../../constants/Roles'

export function RoleBadge({ role }: { role: Role }) {
  const styles: Record<Role, string> = {
    user:      'bg-info/10 text-info',
    authority: 'bg-warning/10 text-warning',
    admin:     'bg-primary-soft text-primary',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[role]}`}>
      {ROLE_LABELS[role]}
    </span>
  )
}