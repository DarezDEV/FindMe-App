import { ChevronLeft, ChevronRight, Check } from 'lucide-react'
import { STEPS } from '../types/constants'

interface Props {
  step: number
  canNext: boolean
  onPrev: () => void
  onNext: () => void
  onSubmit: () => void
  isSubmitting?: boolean
}

export function FormNavigation({ step, canNext, onPrev, onNext, onSubmit, isSubmitting = false }: Props) {
  const isLast = step === STEPS.length

  return (
    <div className="flex items-center justify-between mt-8 pt-5 border-t border-border">

      <button
        onClick={onPrev}
        disabled={step === 1 || isSubmitting}
        className="btn-secondary flex items-center gap-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <ChevronLeft size={16} /> Anterior
      </button>

      <span className="text-xs text-text-secondary tabular-nums">
        {step} / {STEPS.length}
      </span>

      {!isLast ? (
        <button
          onClick={onNext}
          disabled={!canNext || isSubmitting}
          className="btn-primary flex items-center gap-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Siguiente <ChevronRight size={16} />
        </button>
      ) : (
        <button
          onClick={onSubmit}
          disabled={!canNext || isSubmitting}
          className="btn-primary flex items-center gap-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Check size={16} /> {isSubmitting ? 'Publicando...' : 'Publicar caso'}
        </button>
      )}

    </div>
  )
}
