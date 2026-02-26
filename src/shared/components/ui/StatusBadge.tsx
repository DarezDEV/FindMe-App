export type WorkflowStatus = 'pending' | 'approved' | 'rejected' | 'found' | 'closed'

interface StatusBadgeProps {
  status: WorkflowStatus
}

const STATUS_LABEL: Record<WorkflowStatus, string> = {
  pending: 'Pendiente',
  approved: 'Aprobado',
  rejected: 'Rechazado',
  found: 'Encontrado',
  closed: 'Cerrado',
}

const STATUS_CLASS: Record<WorkflowStatus, string> = {
  pending: 'bg-warning/10 text-warning',
  approved: 'bg-success/10 text-success',
  rejected: 'bg-error/10 text-error',
  found: 'bg-info/10 text-info',
  closed: 'bg-text-secondary/10 text-text-secondary',
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_CLASS[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  )
}
