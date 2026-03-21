import { createCaseComment } from '../../../lib/supabase/db'

export type CaseActionType = 'approved' | 'rejected' | 'found' | 'reopened'

const ACTION_LABEL: Record<CaseActionType, string> = {
  approved: 'Aprobado',
  rejected: 'Rechazado',
  found: 'Encontrado',
  reopened: 'Reabierto',
}

export function buildCaseActionComment(action: CaseActionType, detail?: string | null) {
  const header = `Actualizacion del caso: ${ACTION_LABEL[action]}`
  const normalized = detail?.trim()
  if (!normalized) return header
  return `${header}\n${normalized}`
}

export async function logCaseAction(
  caseId: string,
  userId: string,
  action: CaseActionType,
  detail?: string | null,
): Promise<void> {
  const comment = buildCaseActionComment(action, detail)
  await createCaseComment(caseId, userId, comment)
}
