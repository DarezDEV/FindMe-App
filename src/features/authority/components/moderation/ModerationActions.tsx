interface ModerationActionsProps {
  disabled?: boolean
  onApprove: () => void
  onReject: () => void
  onAddComment: () => void
  onMarkFalse: () => void
}

export function ModerationActions({
  disabled = false,
  onApprove,
  onReject,
  onAddComment,
  onMarkFalse,
}: ModerationActionsProps) {
  return (
    <div className="card p-4 flex flex-wrap items-center gap-2">
      <button type="button" className="btn-primary bg-success hover:bg-success/90" onClick={onApprove} disabled={disabled}>
        Aprobar caso
      </button>
      <button type="button" className="btn-primary bg-warning hover:bg-warning/90" onClick={onReject} disabled={disabled}>
        Rechazar caso
      </button>
      <button type="button" className="btn-secondary" onClick={onAddComment} disabled={disabled}>
        Agregar comentario
      </button>
      <button type="button" className="btn-primary bg-error hover:bg-error/90 ml-auto" onClick={onMarkFalse} disabled={disabled}>
        Marcar como falso
      </button>
    </div>
  )
}
