import { Calendar, MapPin, Clock } from 'lucide-react'
import type { PendingCaseItem } from './types'

interface PendingListProps {
  cases: PendingCaseItem[]
  selectedCaseId: string | null
  onSelectCase: (caseId: string) => void
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n.charAt(0).toUpperCase())
    .join('')
}

// Deterministic soft color per name initial — no random flicker on re-renders
const AVATAR_PALETTES = [
  { bg: 'bg-primary/10', border: 'border-primary/20', text: 'text-primary' },
  { bg: 'bg-info/10', border: 'border-info/20', text: 'text-info' },
  { bg: 'bg-success/10', border: 'border-success/20', text: 'text-success' },
  { bg: 'bg-warning/10', border: 'border-warning/20', text: 'text-warning' },
  { bg: 'bg-error/10', border: 'border-error/20', text: 'text-error' },
]

function getAvatarPalette(name: string) {
  const code = name.charCodeAt(0) || 0
  return AVATAR_PALETTES[code % AVATAR_PALETTES.length]
}

export function PendingList({ cases, selectedCaseId, onSelectCase }: PendingListProps) {
  if (cases.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-14 px-6 gap-3 font-['Syne',sans-serif]">
        <div className="w-12 h-12 rounded-2xl bg-success/10 border border-success/20 flex items-center justify-center">
          <Clock size={18} className="text-success" />
        </div>
        <p className="text-sm font-semibold text-text-secondary">Cola vacía</p>
        <p className="text-xs text-text-secondary text-center leading-relaxed">
          No hay casos pendientes de revisión en este momento.
        </p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-border font-['Syne',sans-serif]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700&family=DM+Mono:wght@300;400;500&display=swap');
        .pending-item { transition: background 0.13s ease; }
        .pending-item-active { background: linear-gradient(90deg, rgba(245,158,11,0.08) 0%, rgba(245,158,11,0.02) 100%); }
        .pending-item-inactive:hover { background: #f9fafb; }
      `}</style>

      {cases.map((item) => {
        const isSelected = item.id === selectedCaseId
        const palette = getAvatarPalette(item.name)
        const initials = getInitials(item.name)

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelectCase(item.id)}
            className={`pending-item w-full text-left px-4 py-4 relative ${
              isSelected ? 'pending-item-active' : 'pending-item-inactive'
            }`}
          >
            {/* Selected indicator line */}
            {isSelected && (
              <span className="absolute left-0 top-4 bottom-4 w-0.5 rounded-full bg-primary" />
            )}

            <div className="flex items-start gap-3 pl-1">
              {/* Avatar */}
              <div
                className={`w-9 h-9 rounded-xl border flex items-center justify-center text-xs font-bold shrink-0 ${palette.bg} ${palette.border} ${palette.text}`}
              >
                {initials}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                {/* Name + case number */}
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <p className={`text-sm font-semibold truncate leading-snug ${isSelected ? 'text-text-primary' : 'text-text-secondary'}`}>
                    {item.name}
                  </p>
                  <span className="shrink-0 text-[10px] font-mono text-primary/70 mt-0.5 whitespace-nowrap">
                    {item.caseNumber}
                  </span>
                </div>

                {/* Meta */}
                <div className="space-y-1">
                  <p className="flex items-center gap-1.5 text-[11px] text-text-secondary">
                    <MapPin size={10} className="shrink-0 text-text-secondary" />
                    <span className="truncate">{item.location}</span>
                  </p>
                  <p className="flex items-center gap-1.5 text-[11px] text-text-secondary">
                    <Calendar size={10} className="shrink-0 text-text-secondary" />
                    <span>{item.createdAt}</span>
                  </p>
                </div>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
