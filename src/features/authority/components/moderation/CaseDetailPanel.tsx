import { Calendar, MapPin, UserCircle2 } from 'lucide-react'
import type { PendingCaseItem } from './types'

interface CaseDetailPanelProps {
  selectedCase: PendingCaseItem | null
}

export function CaseDetailPanel({ selectedCase }: CaseDetailPanelProps) {
  if (!selectedCase) {
    return (
      <div className="card p-6 min-h-[420px] flex items-center justify-center">
        <p className="text-sm text-text-secondary">Selecciona un caso para ver su informacion completa.</p>
      </div>
    )
  }

  return (
    <div className="card p-6 space-y-5 min-h-[420px]">
      <div className="w-full min-h-[220px] max-h-[420px] rounded-xl bg-primary-soft/50 border border-border overflow-hidden p-3 flex items-center justify-center">
        {selectedCase.photoUrl ? (
          <img
            src={selectedCase.photoUrl}
            alt={selectedCase.name}
            className="w-full max-h-[390px] object-contain rounded-lg"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-text-secondary text-sm">
            Foto pendiente
          </div>
        )}
      </div>

      <div>
        <h2 className="text-xl font-semibold text-text-primary">{selectedCase.name}</h2>
        <p className="text-sm text-text-secondary mt-1">
          Caso {selectedCase.caseNumber} - {selectedCase.age} anos
        </p>
      </div>

      <div className="space-y-2 text-sm text-text-secondary">
        <p className="inline-flex items-center gap-2">
          <MapPin size={14} />
          {selectedCase.location}
        </p>
        <p className="text-sm text-text-secondary">Ultima vez visto: {selectedCase.lastSeenPlace}</p>
        <p className="text-sm text-text-secondary">Fecha de desaparicion: {selectedCase.missingDate}</p>
        <p className="inline-flex items-center gap-2">
          <Calendar size={14} />
          Publicado: {selectedCase.createdAt}
        </p>
        <p className="inline-flex items-center gap-2">
          <UserCircle2 size={14} />
          Publicado por {selectedCase.createdBy}
        </p>
        <p className="text-sm text-text-secondary">
          Estado del caso: {selectedCase.caseStatusLabel} - Revision: {selectedCase.workflowStatusLabel}
        </p>
      </div>

      <div className="pt-1">
        <h3 className="text-sm font-semibold text-text-primary mb-2">Descripcion</h3>
        <p className="text-sm text-text-secondary leading-relaxed">{selectedCase.description}</p>
      </div>
    </div>
  )
}
