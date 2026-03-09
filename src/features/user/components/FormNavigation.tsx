import { ChevronLeft, ChevronRight, Check, Loader2 } from 'lucide-react'
import { STEPS } from '../types/constants'

interface Props {
  step: number
  canNext: boolean
  loading?: boolean
  onPrev: () => void
  onNext: () => void
  onSubmit: () => void
}

export function FormNavigation({ step, canNext, loading = false, onPrev, onNext, onSubmit }: Props) {
  const isLast = step === STEPS.length

  return (
    <div className="flex items-center justify-between mt-8 pt-5 border-t border-border">

      <button
        type="button"
        onClick={onPrev}
        disabled={step === 1 || loading}
        className="btn-secondary flex items-center gap-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <ChevronLeft size={16} /> Anterior
      </button>

      <span className="text-xs text-text-secondary tabular-nums">
        {step} / {STEPS.length}
      </span>

      {!isLast ? (
        <button
          type="button"
          onClick={onNext}
          disabled={!canNext || loading}
          className="btn-primary flex items-center gap-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Siguiente <ChevronRight size={16} />
        </button>
      ) : (
        <button
          type="button"
          onClick={onSubmit}
          disabled={!canNext || loading}
          className="btn-primary flex items-center gap-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed min-w-[140px] justify-center"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Publicando...
            </>
          ) : (
            <>
              <Check size={16} /> Publicar caso
            </>
          )}
        </button>
      )}

    </div>
  )
}
