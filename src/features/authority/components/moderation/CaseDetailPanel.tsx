import { useState, type ReactNode } from 'react'
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock4,
  Copy,
  Mail,
  FileText,
  MapPin,
  Phone,
  UserCircle2,
  X,
  ZoomIn,
} from 'lucide-react'
import type { PendingCaseItem } from './types'

interface CaseDetailPanelProps {
  selectedCase: PendingCaseItem | null
}

type UrgencyInfo = {
  days: number
  label: string
  toneClass: string
  icon: ReactNode
}

function getUrgency(missingDateIso?: string | null): UrgencyInfo {
  if (!missingDateIso) {
    return {
      days: 0,
      label: 'Sin fecha confirmada',
      toneClass: 'bg-primary-soft/50 border-border text-text-secondary',
      icon: <Clock4 size={13} />,
    }
  }

  const parsed = new Date(missingDateIso)
  if (Number.isNaN(parsed.getTime())) {
    return {
      days: 0,
      label: 'Fecha invalida',
      toneClass: 'bg-primary-soft/50 border-border text-text-secondary',
      icon: <Clock4 size={13} />,
    }
  }

  const now = new Date()
  const diffDays = Math.max(0, Math.floor((now.getTime() - parsed.getTime()) / (1000 * 60 * 60 * 24)))

  if (diffDays <= 2) {
    return {
      days: diffDays,
      label: 'Maxima prioridad',
      toneClass: 'bg-error/10 border-error/30 text-error',
      icon: <AlertCircle size={13} />,
    }
  }

  if (diffDays <= 10) {
    return {
      days: diffDays,
      label: 'Alta prioridad',
      toneClass: 'bg-warning/10 border-warning/30 text-warning',
      icon: <AlertCircle size={13} />,
    }
  }

  return {
    days: diffDays,
    label: 'Seguimiento activo',
    toneClass: 'bg-info/10 border-info/30 text-info',
    icon: <CheckCircle2 size={13} />,
  }
}

function buildPrompt(caseData: PendingCaseItem, urgency: UrgencyInfo): string {
  const phone = caseData.contactPhone ?? 'No disponible'
  const email = caseData.contactEmail ?? 'No disponible'
  const since =
    urgency.days === 0 ? 'hoy' : urgency.days === 1 ? 'hace 1 dia' : `hace ${urgency.days} dias`

  return `Telefono de contacto: ${phone}. Correo de contacto: ${email}. Urgencia: ${urgency.label} (${since}).`
}

export function CaseDetailPanel({ selectedCase }: CaseDetailPanelProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  if (!selectedCase) {
    return (
      <div className="min-h-[460px] flex flex-col items-center justify-center gap-3 p-8 text-center rounded-xl border border-slate-200 bg-slate-50">
        <div className="w-12 h-12 rounded-full bg-sky-400/10 border border-sky-400/20 flex items-center justify-center">
          <FileText size={20} className="text-sky-300/80" />
        </div>
        <p className="text-sm text-slate-500">Selecciona un caso para ver su informacion completa.</p>
      </div>
    )
  }

  const urgency = getUrgency(selectedCase.missingDateIso)
  const promptText = buildPrompt(selectedCase, urgency)

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(promptText)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch {
      setCopied(false)
    }
  }

  return (
    <>
      {lightboxOpen && selectedCase.photoUrl && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm p-4" onClick={() => setLightboxOpen(false)}>
          <button
            type="button"
            aria-label="Cerrar visor"
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            <X size={18} className="mx-auto" />
          </button>
          <div className="w-full h-full flex items-center justify-center">
            <img
              src={selectedCase.photoUrl}
              alt={selectedCase.name}
              className="max-w-full max-h-[92vh] object-contain rounded-xl shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            />
          </div>
        </div>
      )}

      <div className="min-h-[460px] overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
        <button
          type="button"
          className="w-full relative group bg-white border-b border-slate-200"
          style={{ aspectRatio: '16/10' }}
          onClick={() => selectedCase.photoUrl && setLightboxOpen(true)}
          disabled={!selectedCase.photoUrl}
          aria-label="Abrir foto completa"
        >
          {selectedCase.photoUrl ? (
            <>
              <img
                src={selectedCase.photoUrl}
                alt={selectedCase.name}
                className="absolute inset-0 w-full h-full object-contain p-3 transition-all duration-300 group-hover:scale-[1.01]"
              />
              <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1.5 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <ZoomIn size={12} />
                Ver mejor
              </span>
            </>
          ) : (
            <span className="absolute inset-0 flex items-center justify-center text-sm text-slate-500">
              Foto pendiente
            </span>
          )}
        </button>

        <div className="p-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{selectedCase.name}</h2>
              <p className="text-sm text-slate-500 mt-1">
                Caso {selectedCase.caseNumber} Â· {selectedCase.age} anos
              </p>
            </div>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${urgency.toneClass}`}>
              {urgency.icon}
              {urgency.label}
            </span>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-2 text-sm">
            <MetaRow icon={<Clock4 size={13} />} label="Tiempo" value={urgency.days === 0 ? 'Hoy' : `Hace ${urgency.days} dias`} />
            <MetaRow icon={<UserCircle2 size={13} />} label="Genero" value={selectedCase.gender || 'No especificado'} />
            <MetaRow icon={<Calendar size={13} />} label="Fecha nacimiento" value={selectedCase.birthDate || 'No disponible'} />
            <MetaRow icon={<MapPin size={13} />} label="Ubicacion" value={selectedCase.location} />
            <MetaRow icon={<MapPin size={13} />} label="Ultima vez visto" value={selectedCase.lastSeenPlace} />
            <MetaRow icon={<Calendar size={13} />} label="Fecha desaparicion" value={selectedCase.missingDate} />
            <MetaRow icon={<Calendar size={13} />} label="Publicado" value={selectedCase.createdAt} />
            <MetaRow icon={<UserCircle2 size={13} />} label="Publicado por" value={selectedCase.createdBy} />
            <MetaRow icon={<Phone size={13} />} label="Telefono contacto" value={selectedCase.contactPhone ?? 'No disponible'} />
            <MetaRow icon={<Mail size={13} />} label="Correo contacto" value={selectedCase.contactEmail ?? 'No disponible'} />
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500"> Contacto</h3>
              <button
                type="button"
                onClick={() => void handleCopyPrompt()}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border border-slate-200 bg-white text-slate-700 hover:text-blue-600 transition-colors"
              >
                <Copy size={12} />
                {copied ? 'Copiado' : 'Copiar'}
              </button>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">{promptText}</p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Descripcion</h3>
            <p className="text-sm text-slate-700 leading-relaxed">{selectedCase.description}</p>
          </div>
        </div>
      </div>
    </>
  )
}

function MetaRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 text-slate-500">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-sm text-slate-700 break-words">{value}</p>
      </div>
    </div>
  )
}


