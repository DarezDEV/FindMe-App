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
  { bg: 'bg-blue-500/10',  border: 'border-blue-500/20',  text: 'text-blue-600'  },
  { bg: 'bg-sky-400/12',    border: 'border-sky-400/20',    text: 'text-sky-400'    },
  { bg: 'bg-emerald-400/12',border: 'border-emerald-400/20',text: 'text-emerald-400'},
  { bg: 'bg-violet-400/12', border: 'border-violet-400/20', text: 'text-violet-400' },
  { bg: 'bg-rose-400/12',   border: 'border-rose-400/20',   text: 'text-rose-400'   },
]

function getAvatarPalette(name: string) {
  const code = name.charCodeAt(0) || 0
  return AVATAR_PALETTES[code % AVATAR_PALETTES.length]
}

export function PendingList({ cases, selectedCaseId, onSelectCase }: PendingListProps) {
  if (cases.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-14 px-6 gap-3 font-['Syne',sans-serif]">
        <div className="w-12 h-12 rounded-2xl bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center">
          <Clock size={18} className="text-emerald-400" />
        </div>
        <p className="text-sm font-semibold text-slate-600">Cola vacía</p>
        <p className="text-xs text-slate-700 text-center leading-relaxed">
          No hay casos pendientes de revisión en este momento.
        </p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-slate-200 font-['Syne',sans-serif]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700&family=DM+Mono:wght@300;400;500&display=swap');
        .pending-item { transition: background 0.13s ease; }
        .pending-item-active { background: linear-gradient(90deg, rgba(251,191,36,0.06) 0%, rgba(251,191,36,0.02) 100%); }
        .pending-item-inactive:hover { background: rgba(255,255,255,0.02); }
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
              <span className="absolute left-0 top-4 bottom-4 w-0.5 rounded-full bg-blue-600" />
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
                  <p className={`text-sm font-semibold truncate leading-snug ${isSelected ? 'text-slate-900' : 'text-slate-600'}`}>
                    {item.name}
                  </p>
                  <span className="shrink-0 text-[10px] font-mono text-blue-600/60 mt-0.5 whitespace-nowrap">
                    {item.caseNumber}
                  </span>
                </div>

                {/* Meta */}
                <div className="space-y-1">
                  <p className="flex items-center gap-1.5 text-[11px] text-slate-700">
                    <MapPin size={10} className="shrink-0 text-slate-800" />
                    <span className="truncate">{item.location}</span>
                  </p>
                  <p className="flex items-center gap-1.5 text-[11px] text-slate-700">
                    <Calendar size={10} className="shrink-0 text-slate-800" />
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
