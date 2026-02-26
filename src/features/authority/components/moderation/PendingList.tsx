import { Calendar, MapPin } from 'lucide-react'
import { StatusBadge } from '../../../../shared/components/ui'
import type { PendingCaseItem } from './types'

interface PendingListProps {
  cases: PendingCaseItem[]
  selectedCaseId: string | null
  onSelectCase: (caseId: string) => void
}

export function PendingList({ cases, selectedCaseId, onSelectCase }: PendingListProps) {
  if (cases.length === 0) {
    return (
      <div className="card p-6">
        <h2 className="text-base font-semibold text-text-primary mb-2">Casos pendientes</h2>
        <p className="text-sm text-text-secondary">No hay casos pendientes para revisar.</p>
      </div>
    )
  }

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-base font-semibold text-text-primary">Casos pendientes</h2>
        <p className="text-xs text-text-secondary mt-1">Selecciona un caso para revisar su detalle.</p>
      </div>

      <div className="max-h-[70vh] overflow-y-auto divide-y divide-border/80">
        {cases.map((item) => {
          const isSelected = item.id === selectedCaseId

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectCase(item.id)}
              className={`w-full text-left p-4 transition-colors ${
                isSelected ? 'bg-primary-soft/60' : 'hover:bg-primary-soft/30'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-soft text-primary flex items-center justify-center text-sm font-semibold shrink-0">
                  {item.name.charAt(0).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-text-primary truncate">{item.name}</p>
                    <StatusBadge status={item.status} />
                  </div>
                  <p className="text-xs text-text-secondary mt-1 inline-flex items-center gap-1">
                    <Calendar size={11} />
                    {item.createdAt}
                  </p>
                  <p className="text-xs text-text-secondary mt-1 inline-flex items-center gap-1">
                    <MapPin size={11} />
                    {item.location}
                  </p>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
