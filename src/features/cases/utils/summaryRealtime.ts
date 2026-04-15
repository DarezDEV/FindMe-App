import {
  normalizeAuthorityCaseRow,
  type AuthorityCaseRow,
  type AuthorityDashboardSummary,
  type CaseRealtimePayload,
} from '../../../lib/supabase/db'

function updateSummaryCounters(summary: AuthorityDashboardSummary, row: AuthorityCaseRow, direction: 1 | -1) {
  summary.total += direction
  if (row.status === 'activo') summary.active += direction
  if (row.status === 'en_proceso') summary.inProgress += direction
  if (row.status === 'resuelto') summary.resolved += direction

  if (row.workflow_status === 'approved') summary.approved += direction
  else if (row.workflow_status === 'rejected') summary.rejected += direction
  else if (row.workflow_status === 'found') summary.found += direction
  else if (row.workflow_status === 'closed') summary.closed += direction
  else summary.pending += direction
}

function clampSummary(summary: AuthorityDashboardSummary) {
  summary.total = Math.max(0, summary.total)
  summary.active = Math.max(0, summary.active)
  summary.inProgress = Math.max(0, summary.inProgress)
  summary.resolved = Math.max(0, summary.resolved)
  summary.pending = Math.max(0, summary.pending)
  summary.approved = Math.max(0, summary.approved)
  summary.rejected = Math.max(0, summary.rejected)
  summary.found = Math.max(0, summary.found)
  summary.closed = Math.max(0, summary.closed)

  return summary
}

export function shouldReloadCaseSummary(payload: CaseRealtimePayload) {
  const needsOldSnapshot =
    payload.eventType === 'UPDATE' ||
    payload.eventType === 'DELETE' ||
    payload.new.eliminado === true

  if (needsOldSnapshot && !normalizeAuthorityCaseRow(payload.old)) {
    return true
  }

  if (payload.eventType !== 'DELETE' && payload.new.eliminado !== true && !normalizeAuthorityCaseRow(payload.new)) {
    return true
  }

  return false
}

export function applyCaseSummaryRealtime(summary: AuthorityDashboardSummary, payload: CaseRealtimePayload) {
  const nextSummary: AuthorityDashboardSummary = {
    ...summary,
    recentCases: [...summary.recentCases],
  }

  const oldRow = normalizeAuthorityCaseRow(payload.old)
  if (oldRow && payload.old.eliminado !== true) {
    updateSummaryCounters(nextSummary, oldRow, -1)
    nextSummary.recentCases = nextSummary.recentCases.filter((item) => item.id !== oldRow.id)
  }

  if (payload.eventType !== 'DELETE' && payload.new.eliminado !== true) {
    const newRow = normalizeAuthorityCaseRow(payload.new)
    if (newRow) {
      updateSummaryCounters(nextSummary, newRow, 1)
      nextSummary.recentCases = [...nextSummary.recentCases.filter((item) => item.id !== newRow.id), newRow]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5)
    }
  }

  return clampSummary(nextSummary)
}
