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
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold border border-emerald-400/25 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/15 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        onClick={onApprove}
        disabled={disabled}
      >
        <CheckCircle2 size={15} />
        Aprobar caso
      </button>
      <button
        type="button"
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold border border-amber-400/30 bg-amber-400/10 text-amber-300 hover:bg-amber-400/15 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        onClick={onReject}
        disabled={disabled}
      >
        <XCircle size={15} />
        Rechazar caso
      </button>
      <button
        type="button"
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold border border-sky-400/25 bg-sky-400/10 text-sky-300 hover:bg-sky-400/15 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        onClick={onAddComment}
        disabled={disabled}
      >
        <MessageSquareText size={15} />
        Comentar {commentsCount > 0 ? `(${commentsCount})` : ''}
      </button>
      <button
        type="button"
        className="ml-auto inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold border border-rose-400/30 bg-rose-400/10 text-rose-300 hover:bg-rose-400/15 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        onClick={onMarkFalse}
        disabled={disabled}
      >
        <ShieldAlert size={15} />
        Marcar como falso
      </button>
    </div>
  )
}
