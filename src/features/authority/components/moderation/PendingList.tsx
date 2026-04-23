import { Calendar, Clock3, MapPin, ShieldAlert } from 'lucide-react'
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
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

const AVATAR_PALETTES = [
  { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-600' },
  { bg: 'bg-sky-400/12', border: 'border-sky-400/20', text: 'text-sky-500' },
  { bg: 'bg-emerald-400/12', border: 'border-emerald-400/20', text: 'text-emerald-500' },
  { bg: 'bg-violet-400/12', border: 'border-violet-400/20', text: 'text-violet-500' },
  { bg: 'bg-rose-400/12', border: 'border-rose-400/20', text: 'text-rose-500' },
]

function getAvatarPalette(name: string) {
  const code = name.charCodeAt(0) || 0
  return AVATAR_PALETTES[code % AVATAR_PALETTES.length]
}

export function PendingList({ cases, selectedCaseId, onSelectCase }: PendingListProps) {
  if (cases.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-6 py-14">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-success/20 bg-success/8">
          <Clock3 size={18} className="text-success" />
        </div>
        <p className="text-sm font-semibold text-text-primary">Cola vacia</p>
        <p className="text-center text-xs leading-relaxed text-text-secondary">
          No hay casos pendientes de revision en este momento.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {cases.map((item) => {
        const isSelected = item.id === selectedCaseId
        const palette = getAvatarPalette(item.name)
        const initials = getInitials(item.name)

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelectCase(item.id)}
            className={`group relative w-full overflow-hidden rounded-2xl border p-4 text-left shadow-sm transition-all ${
              isSelected
                ? 'border-primary/25 bg-primary-soft/55 shadow-primary/10'
                : 'border-border bg-card hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-md hover:shadow-slate-200/60'
            }`}
          >
            {isSelected ? (
              <span className="absolute inset-y-4 left-0 w-1 rounded-r-full bg-primary" />
            ) : null}

            <div className="flex items-start gap-3">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border text-xs font-bold ${palette.bg} ${palette.border} ${palette.text}`}
              >
                {initials}
              </div>

              <div className="min-w-0 flex-1">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className={`truncate text-sm font-semibold leading-snug ${isSelected ? 'text-text-primary' : 'text-slate-800'}`}>
                      {item.name}
                    </p>
                    <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.18em] text-primary/80">
                      {item.caseNumber}
                    </p>
                  </div>

                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-warning/20 bg-warning/8 px-2.5 py-1 text-[11px] font-semibold text-warning">
                    <ShieldAlert size={11} />
                    Pendiente
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2 text-[12px] text-text-secondary">
                  <p className="flex items-center gap-2">
                    <MapPin size={13} className="shrink-0 text-text-secondary" />
                    <span className="truncate">{item.location}</span>
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="inline-flex items-center gap-1.5">
                      <Calendar size={12} className="shrink-0 text-text-secondary" />
                      {item.createdAt}
                    </p>
                    <p className="inline-flex items-center gap-1.5">
                      <Clock3 size={12} className="shrink-0 text-text-secondary" />
                      {item.missingDate}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-text-secondary">
                    {item.gender || 'Genero no indicado'}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-text-secondary">
                    {item.age} anos
                  </span>
                </div>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
