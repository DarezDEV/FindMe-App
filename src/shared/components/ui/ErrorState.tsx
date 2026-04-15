import { AlertTriangle, RefreshCw } from 'lucide-react'

interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
  retryLabel?: string
}

export function ErrorState({
  title = 'Error al cargar datos',
  message = 'Inténtalo nuevamente.',
  onRetry,
  retryLabel = 'Intentar nuevamente',
}: ErrorStateProps) {
  return (
    <div className="card p-6 flex items-start gap-4">
      <div className="w-10 h-10 rounded-xl bg-error/10 text-error flex items-center justify-center shrink-0">
        <AlertTriangle size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text-primary">{title}</p>
        <p className="text-sm text-text-secondary mt-1">{message}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="btn-secondary mt-4 inline-flex items-center gap-2"
          >
            <RefreshCw size={16} />
            {retryLabel}
          </button>
        )}
      </div>
    </div>
  )
}

