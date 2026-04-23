import type { ReactNode } from 'react'
import { CheckCircle2, MessageSquareText, ShieldAlert, XCircle } from 'lucide-react'

interface ModerationActionsProps {
  disabled?: boolean
  commentsCount?: number
  onApprove: () => void
  onReject: () => void
  onAddComment: () => void
  onMarkFalse: () => void
}

function ActionButton({
  icon,
  title,
  description,
  onClick,
  disabled,
  className,
}: {
  icon: ReactNode
  title: string
  description: string
  onClick: () => void
  disabled: boolean
  className: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-start gap-3 rounded-[22px] border px-4 py-4 text-left transition-all disabled:cursor-not-allowed disabled:opacity-45 ${className}`}
    >
      <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-current/15 bg-white/60">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-1 text-sm leading-6 opacity-80">{description}</p>
      </div>
    </button>
  )
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
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <ActionButton
          icon={<CheckCircle2 size={18} />}
          title="Aprobar caso"
          description="Publica el caso y lo mueve al flujo regular de seguimiento."
          onClick={onApprove}
          disabled={disabled}
          className="border-success/20 bg-success/10 text-success hover:bg-success/15"
        />
        <ActionButton
          icon={<XCircle size={18} />}
          title="Rechazar caso"
          description="Detiene la publicacion cuando faltan datos o existen inconsistencias."
          onClick={onReject}
          disabled={disabled}
          className="border-primary/20 bg-primary-soft text-primary hover:bg-primary-soft/80"
        />
        <ActionButton
          icon={<MessageSquareText size={18} />}
          title={`Agregar nota${commentsCount > 0 ? ` (${commentsCount})` : ''}`}
          description="Deja contexto interno para que el equipo entienda la decision tomada."
          onClick={onAddComment}
          disabled={disabled}
          className="border-info/20 bg-info/10 text-info hover:bg-info/15"
        />
        <ActionButton
          icon={<ShieldAlert size={18} />}
          title="Marcar como falso"
          description="Usa esta opcion solo cuando el caso deba retirarse del sistema."
          onClick={onMarkFalse}
          disabled={disabled}
          className="border-error/20 bg-error/10 text-error hover:bg-error/15"
        />
      </div>

      <div className="rounded-[22px] border border-border bg-slate-50 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-secondary">Recomendacion</p>
        <p className="mt-2 text-sm leading-6 text-text-secondary">
          Antes de decidir, valida la imagen, la coherencia de las fechas y que el contacto del caso sea util para una respuesta rapida.
        </p>
      </div>
    </div>
  )
}
