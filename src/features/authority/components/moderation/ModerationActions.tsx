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
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <button
        type="button"
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-emerald-400/25 bg-emerald-400/10 px-3 py-2 text-sm font-semibold text-emerald-300 transition-colors hover:bg-emerald-400/15 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
        onClick={onApprove}
        disabled={disabled}
      >
        <CheckCircle2 size={15} />
        Aprobar caso
      </button>
      <button
        type="button"
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-sm font-semibold text-blue-600 transition-colors hover:bg-blue-500/15 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
        onClick={onReject}
        disabled={disabled}
      >
        <XCircle size={15} />
        Rechazar caso
      </button>
      <button
        type="button"
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-sky-400/25 bg-sky-400/10 px-3 py-2 text-sm font-semibold text-sky-300 transition-colors hover:bg-sky-400/15 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
        onClick={onAddComment}
        disabled={disabled}
      >
        <MessageSquareText size={15} />
        Comentar {commentsCount > 0 ? `(${commentsCount})` : ''}
      </button>
      <button
        type="button"
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm font-semibold text-rose-300 transition-colors hover:bg-rose-400/15 disabled:cursor-not-allowed disabled:opacity-40 sm:ml-auto sm:w-auto"
        onClick={onMarkFalse}
        disabled={disabled}
      >
        <ShieldAlert size={15} />
        Marcar como falso
      </button>
    </div>
  )
}

