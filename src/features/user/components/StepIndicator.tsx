import { Check } from 'lucide-react'
import { STEPS } from '../types/constants'

interface StepIndicatorProps {
  current: number
}

export function StepIndicator({ current }: StepIndicatorProps) {
  return (
    <div className="mb-8">

      {/* Desktop stepper */}
      <div className="hidden sm:flex items-start">
        {STEPS.map((step, i) => {
          const done   = current > step.id
          const active = current === step.id
          const { Icon } = step

          return (
            <div key={step.id} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1.5 shrink-0">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-300
                  ${done   ? 'bg-primary border-primary'
                  : active ? 'bg-white border-primary shadow-md shadow-primary/20'
                           : 'bg-white border-border'}`}
                >
                  {done
                    ? <Check size={16} className="text-white" strokeWidth={2.5} />
                    : <Icon  size={16} className={active ? 'text-primary' : 'text-text-secondary'} />
                  }
                </div>
                <span className={`text-[11px] font-medium whitespace-nowrap text-center
                  ${active ? 'text-primary' : done ? 'text-text-primary' : 'text-text-secondary'}`}>
                  {step.label}
                </span>
              </div>

              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 mb-5 rounded transition-colors duration-300
                  ${done ? 'bg-primary' : 'bg-border'}`}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Mobile progress bar */}
      <div className="sm:hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            Paso {current} de {STEPS.length}
          </span>
          <span className="text-xs font-bold text-primary">
            {STEPS[current - 1].label}
          </span>
        </div>
        <div className="w-full bg-border rounded-full h-1.5">
          <div
            className="bg-primary h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${(current / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

    </div>
  )
}