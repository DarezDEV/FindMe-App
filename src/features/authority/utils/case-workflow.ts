import type { WorkflowStatus } from '../../../shared/components/ui'

export type CaseWorkflowState = WorkflowStatus

export interface CaseStatusSource {
  workflow_status: WorkflowStatus | null | undefined
  status: string | null | undefined
}

export function deriveWorkflowStatus(row: CaseStatusSource): CaseWorkflowState {
  if (row.workflow_status) return row.workflow_status
  if (row.status === 'resuelto') return 'found'
  if (row.status === 'cerrado') return 'closed'
  return 'pending'
}

export function getCaseActionAvailability(status: CaseWorkflowState) {
  const canApprove = status === 'pending'
  const canReject = status === 'pending'
  const canMarkFound = status === 'approved'
  const canReopen = status === 'rejected'

  return {
    canApprove,
    canReject,
    canMarkFound,
    canReopen,
  }
}
