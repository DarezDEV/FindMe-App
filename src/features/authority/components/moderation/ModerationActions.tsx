import { CheckCircle2, MessageSquareText, ShieldAlert, XCircle } from 'lucide-react'

interface ModerationActionsProps {
  disabled?: boolean
  commentsCount?: number
  onApprove: () => void
  onReject: () => void
  onAddComment: () => void
  onMarkFalse: () => void
}

export function ModerationActions({
  disabled = false,
  commentsCount = 0,
  onApprove,
  onReject,
  onAddComment,
  onMarkFalse,
}: ModerationActionsProps) {
  return (
    <div className="card p-4 flex flex-wrap items-center gap-2">
      <button
        type="button"
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold border border-success/25 bg-success/10 text-success hover:bg-success/15 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={onApprove}
        disabled={disabled}
      >
        <CheckCircle2 size={15} />
        Aprobar caso
      </button>
      <button
        type="button"
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold border border-warning/30 bg-warning/10 text-warning hover:bg-warning/15 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={onReject}
        disabled={disabled}
      >
        <XCircle size={15} />
        Rechazar caso
      </button>
      <button
        type="button"
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold border border-primary/20 bg-primary-soft text-primary hover:bg-primary-soft/70 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={onAddComment}
        disabled={disabled}
      >
        <MessageSquareText size={15} />
        Comentar {commentsCount > 0 ? `(${commentsCount})` : ''}
      </button>
      <button
        type="button"
        className="ml-auto inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold border border-error/30 bg-error/10 text-error hover:bg-error/15 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={onMarkFalse}
        disabled={disabled}
      >
        <ShieldAlert size={15} />
        Marcar como falso
      </button>
    </div>
  )
}
