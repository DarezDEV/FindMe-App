import type { ReactNode } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  MessageSquareText,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from 'lucide-react'

type FeedbackType = 'success' | 'warning' | 'info' | 'error'

interface ModerationWorkspaceProps {
  title: string
  subtitle: string
  sectionLabel: string
  queueTitle: string
  queueSubtitle: string
  pendingCount: number
  commentsCount: number
  selectedCaseNumber?: string | null
  feedback: string | null
  feedbackType: FeedbackType
  loading: boolean
  hasSelection: boolean
  onRefresh: () => void
  queue: ReactNode
  detail: ReactNode
  notes?: ReactNode
  actions: ReactNode
  loadingState: ReactNode
  emptyState: ReactNode
}

const feedbackStyles: Record<FeedbackType, string> = {
  success: 'border-success/20 bg-success/10 text-success',
  warning: 'border-warning/20 bg-warning/10 text-warning',
  error: 'border-error/20 bg-error/10 text-error',
  info: 'border-info/20 bg-info/10 text-info',
}

const FeedbackIcon = {
  success: CheckCircle2,
  warning: AlertCircle,
  error: XCircle,
  info: MessageSquareText,
} satisfies Record<FeedbackType, typeof CheckCircle2>

function StatCard({
  label,
  value,
  tone,
  icon,
}: {
  label: string
  value: string
  tone: 'primary' | 'warning' | 'info'
  icon: ReactNode
}) {
  const toneClass = {
    primary: 'border-primary/15 bg-primary-soft/70 text-primary',
    warning: 'border-warning/20 bg-warning/10 text-warning',
    info: 'border-info/20 bg-info/10 text-info',
  }[tone]

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm shadow-slate-200/40">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-text-secondary">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-text-primary">{value}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-2xl border ${toneClass}`}>
          {icon}
        </div>
      </div>
    </div>
  )
}

function SectionCard({
  eyebrow,
  title,
  meta,
  children,
  aside,
}: {
  eyebrow: string
  title: string
  meta?: string
  children: ReactNode
  aside?: ReactNode
}) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-border bg-card shadow-sm shadow-slate-200/40">
      <div className="border-b border-border/80 bg-slate-50/80 px-5 py-4 sm:px-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-text-secondary">{eyebrow}</p>
            <h2 className="mt-1 text-lg font-semibold text-text-primary">{title}</h2>
            {meta ? <p className="mt-1 text-sm text-text-secondary">{meta}</p> : null}
          </div>
          {aside}
        </div>
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  )
}

export function ModerationWorkspace({
  title,
  subtitle,
  sectionLabel,
  queueTitle,
  queueSubtitle,
  pendingCount,
  commentsCount,
  selectedCaseNumber,
  feedback,
  feedbackType,
  loading,
  hasSelection,
  onRefresh,
  queue,
  detail,
  notes,
  actions,
  loadingState,
  emptyState,
}: ModerationWorkspaceProps) {
  const Feedback = FeedbackIcon[feedbackType]

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto flex max-w-[1480px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <section className="overflow-hidden rounded-[32px] border border-border bg-card shadow-sm shadow-slate-200/40">
          <div className="relative overflow-hidden px-5 py-6 sm:px-7 lg:px-8 lg:py-7">
            <div className="absolute inset-x-0 top-0 h-28 bg-[linear-gradient(135deg,rgba(50,102,219,0.10),rgba(50,102,219,0.03)_45%,transparent_70%)]" />
            <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-primary/6 blur-3xl" />
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-primary">{sectionLabel}</p>
                <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-text-primary sm:text-[2.1rem]">
                  {title}
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary sm:text-[0.95rem]">
                  {subtitle}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={onRefresh}
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-text-secondary transition-all hover:border-primary/30 hover:text-primary"
                >
                  <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                  Actualizar
                </button>
              </div>
            </div>

            <div className="relative mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
              <StatCard
                label="Pendientes"
                value={String(pendingCount)}
                tone="warning"
                icon={<ClipboardList size={18} />}
              />
              <StatCard
                label="Notas"
                value={String(commentsCount)}
                tone="info"
                icon={<MessageSquareText size={18} />}
              />
              <StatCard
                label="Caso activo"
                value={hasSelection ? selectedCaseNumber ?? 'Seleccionado' : 'Sin seleccion'}
                tone="primary"
                icon={<ShieldCheck size={18} />}
              />
            </div>
          </div>
        </section>

        {feedback ? (
          <div className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm shadow-sm ${feedbackStyles[feedbackType]}`}>
            <div className="mt-0.5 shrink-0">
              <Feedback size={16} />
            </div>
            <p className="leading-6">{feedback}</p>
          </div>
        ) : null}

        {loading ? (
          loadingState
        ) : pendingCount === 0 ? (
          emptyState
        ) : (
          <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
            <SectionCard
              eyebrow="Bandeja"
              title={queueTitle}
              meta={queueSubtitle}
              aside={
                  <span className="inline-flex items-center rounded-full border border-warning/20 bg-warning/10 px-3 py-1 text-xs font-semibold text-warning">
                  {pendingCount} en espera
                </span>
              }
            >
              <div className="max-h-[calc(100dvh-22rem)] overflow-y-auto pr-1">{queue}</div>
            </SectionCard>

            <div className="flex min-w-0 flex-col gap-5">
              <SectionCard
                eyebrow="Ficha"
                title="Detalle del caso"
                meta={hasSelection ? 'Informacion principal para validar la publicacion.' : 'Selecciona un caso para revisar.'}
                aside={
                  hasSelection ? (
                    <span className="inline-flex items-center rounded-full border border-primary/15 bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
                      {selectedCaseNumber}
                    </span>
                  ) : null
                }
              >
                {detail}
              </SectionCard>

              {notes ? (
                <SectionCard
                  eyebrow="Seguimiento"
                  title="Notas de revision"
                  meta="Comentarios internos del equipo de moderacion."
                  aside={
                    <span className="inline-flex items-center rounded-full border border-info/20 bg-info/10 px-3 py-1 text-xs font-semibold text-info">
                      {commentsCount} nota{commentsCount === 1 ? '' : 's'}
                    </span>
                  }
                >
                  {notes}
                </SectionCard>
              ) : null}

              <SectionCard
                eyebrow="Decision"
                title="Acciones de revision"
                meta="Confirma el resultado del caso manteniendo un flujo claro y consistente."
              >
                {actions}
              </SectionCard>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
