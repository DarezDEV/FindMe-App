import { useState, type ReactNode } from 'react'
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock3,
  Copy,
  FileText,
  Mail,
  MapPin,
  Phone,
  UserCircle2,
  X,
  ZoomIn,
} from 'lucide-react'
import type { PendingCaseItem } from './types'
import { handleError } from '../../../../shared/utils/handleError'

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
      toneClass: 'border-border bg-primary-soft/60 text-text-secondary',
      icon: <Clock3 size={13} />,
    }
  }

  const parsed = new Date(missingDateIso)
  if (Number.isNaN(parsed.getTime())) {
    return {
      days: 0,
      label: 'Fecha invalida',
      toneClass: 'border-border bg-primary-soft/60 text-text-secondary',
      icon: <Clock3 size={13} />,
    }
  }

  const now = new Date()
  const diffDays = Math.max(0, Math.floor((now.getTime() - parsed.getTime()) / (1000 * 60 * 60 * 24)))

  if (diffDays <= 2) {
    return {
      days: diffDays,
      label: 'Maxima prioridad',
      toneClass: 'border-error/20 bg-error/8 text-error',
      icon: <AlertCircle size={13} />,
    }
  }

  if (diffDays <= 10) {
    return {
      days: diffDays,
      label: 'Alta prioridad',
      toneClass: 'border-warning/20 bg-warning/8 text-warning',
      icon: <AlertCircle size={13} />,
    }
  }

  return {
    days: diffDays,
    label: 'Seguimiento activo',
    toneClass: 'border-info/20 bg-info/8 text-info',
    icon: <CheckCircle2 size={13} />,
  }
}

function buildPrompt(caseData: PendingCaseItem, urgency: UrgencyInfo): string {
  const phone = caseData.contactPhone ?? 'No disponible'
  const email = caseData.contactEmail ?? 'No disponible'
  const since = urgency.days === 0 ? 'hoy' : urgency.days === 1 ? 'hace 1 dia' : `hace ${urgency.days} dias`

  return `Telefono de contacto: ${phone}. Correo de contacto: ${email}. Urgencia: ${urgency.label} (${since}).`
}

export function CaseDetailPanel({ selectedCase }: CaseDetailPanelProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  if (!selectedCase) {
    return (
      <div className="flex min-h-[460px] flex-col items-center justify-center rounded-[24px] border border-dashed border-border bg-slate-50 px-8 py-10 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-info/20 bg-info/8">
          <FileText size={22} className="text-info" />
        </div>
        <p className="mt-4 text-base font-semibold text-text-primary">Selecciona un caso</p>
        <p className="mt-2 max-w-sm text-sm leading-6 text-text-secondary">
          Aqui aparecera la ficha completa del caso con datos clave, contacto y contexto para la decision.
        </p>
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
    } catch (error) {
      handleError('CaseDetailPanel.copyPrompt', error, {
        fallbackMessage: 'No se pudo copiar al portapapeles. Intenta nuevamente.',
        toastType: 'warning',
      })
      setCopied(false)
    }
  }

  return (
    <>
      {lightboxOpen && selectedCase.photoUrl ? (
        <div className="fixed inset-0 z-50 bg-black/85 p-4 backdrop-blur-sm" onClick={() => setLightboxOpen(false)}>
          <button
            type="button"
            aria-label="Cerrar visor"
            onClick={() => setLightboxOpen(false)}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
          >
            <X size={18} />
          </button>
          <div className="flex h-full w-full items-center justify-center">
            <img
              src={selectedCase.photoUrl}
              alt={selectedCase.name}
              className="max-h-[92vh] max-w-full rounded-2xl object-contain shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            />
          </div>
        </div>
      ) : null}

      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
          <div className="overflow-hidden rounded-[24px] border border-border bg-slate-50">
            <button
              type="button"
              className="group relative block w-full overflow-hidden border-b border-border bg-card"
              style={{ aspectRatio: '16 / 13' }}
              onClick={() => selectedCase.photoUrl && setLightboxOpen(true)}
              disabled={!selectedCase.photoUrl}
              aria-label="Abrir foto completa"
            >
              {selectedCase.photoUrl ? (
                <>
                  <img
                    src={selectedCase.photoUrl}
                    alt={selectedCase.name}
                    className="absolute inset-0 h-full w-full object-contain p-4 transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                  <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-xs font-medium text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    <ZoomIn size={12} />
                    Ampliar
                  </span>
                </>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-text-secondary">
                  Foto pendiente
                </div>
              )}
            </button>

            <div className="space-y-4 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl font-semibold text-text-primary">{selectedCase.name}</h3>
                  <p className="mt-1 text-sm text-text-secondary">
                    Caso {selectedCase.caseNumber} · {selectedCase.age} anos
                  </p>
                </div>
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${urgency.toneClass}`}>
                  {urgency.icon}
                  {urgency.label}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <SummaryCard label="Publicado" value={selectedCase.createdAt} />
                <SummaryCard label="Desaparicion" value={selectedCase.missingDate} />
                <SummaryCard label="Genero" value={selectedCase.gender || 'No indicado'} />
                <SummaryCard label="Estado" value={selectedCase.caseStatusLabel} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <InfoGroup
              title="Informacion principal"
              items={[
                { icon: <Clock3 size={14} />, label: 'Tiempo transcurrido', value: urgency.days === 0 ? 'Hoy' : `Hace ${urgency.days} dias` },
                { icon: <UserCircle2 size={14} />, label: 'Publicado por', value: selectedCase.createdBy },
                { icon: <Calendar size={14} />, label: 'Fecha de nacimiento', value: selectedCase.birthDate || 'No disponible' },
                { icon: <MapPin size={14} />, label: 'Ubicacion general', value: selectedCase.location },
                { icon: <MapPin size={14} />, label: 'Ultima vez visto', value: selectedCase.lastSeenPlace },
                { icon: <Calendar size={14} />, label: 'Fecha de desaparicion', value: selectedCase.missingDate },
              ]}
            />

            <InfoGroup
              title="Canales de contacto"
              items={[
                { icon: <Phone size={14} />, label: 'Telefono', value: selectedCase.contactPhone ?? 'No disponible' },
                { icon: <Mail size={14} />, label: 'Correo', value: selectedCase.contactEmail ?? 'No disponible' },
                { icon: <FileText size={14} />, label: 'Flujo', value: selectedCase.workflowStatusLabel },
                { icon: <UserCircle2 size={14} />, label: 'Numero de caso', value: selectedCase.caseNumber },
              ]}
              footer={
                <div className="rounded-2xl border border-border bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">Resumen util</p>
                      <p className="mt-1 text-sm text-text-secondary">Copia un texto corto con el contexto de contacto.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleCopyPrompt()}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-text-primary transition-all hover:border-primary/25 hover:text-primary"
                    >
                      <Copy size={13} />
                      {copied ? 'Copiado' : 'Copiar'}
                    </button>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-text-primary">{promptText}</p>
                </div>
              }
            />
          </div>
        </div>

        <div className="rounded-[24px] border border-border bg-slate-50 p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-text-secondary">Descripcion</p>
          <p className="mt-3 text-sm leading-7 text-text-primary">{selectedCase.description}</p>
        </div>
      </div>
    </>
  )
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-secondary">{label}</p>
      <p className="mt-1 text-sm font-medium text-text-primary">{value}</p>
    </div>
  )
}

function InfoGroup({
  title,
  items,
  footer,
}: {
  title: string
  items: Array<{ icon: ReactNode; label: string; value: string }>
  footer?: ReactNode
}) {
  return (
    <div className="rounded-[24px] border border-border bg-slate-50 p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-text-secondary">{title}</p>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div key={item.label} className="rounded-2xl border border-border bg-card px-4 py-3">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-text-secondary">{item.icon}</span>
              <div className="min-w-0">
                <p className="text-xs text-text-secondary">{item.label}</p>
                <p className="mt-0.5 break-words text-sm font-medium text-text-primary">{item.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      {footer ? <div className="mt-4">{footer}</div> : null}
    </div>
  )
}
