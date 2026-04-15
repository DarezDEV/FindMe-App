import { AlertTriangle, Bell, CheckCircle2, Eye, Trash2, UserCog } from 'lucide-react'
import { useMemo, useState, type KeyboardEvent, type MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/hooks'
import type { NotificationRow } from '../types'

function formatTime(value: string | null) {
  if (!value) return 'Reciente'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Reciente'

  const diff = Date.now() - date.getTime()
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour

  if (diff < minute) return 'Hace un momento'
  if (diff < hour) return `Hace ${Math.max(1, Math.floor(diff / minute))} min`
  if (diff < day) return `Hace ${Math.max(1, Math.floor(diff / hour))} h`
  return date.toLocaleDateString()
}

function pickMetadataString(metadata: Record<string, unknown> | null, key: string): string | null {
  if (!metadata) return null
  const value = metadata[key]
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function buildTargetPath(notification: NotificationRow, roles: string[]): string | null {
  const caseId = pickMetadataString(notification.metadata, 'case_id')

  if (caseId) {
    if (roles.includes('admin') || roles.includes('authority')) {
      return `/authority/cases/${caseId}`
    }

    return `/caso/${caseId}`
  }

  if (notification.type === 'sighting_created') {
    if (roles.includes('admin') || roles.includes('authority')) return '/authority/sightings'
  }

  if (notification.type === 'account_status_changed') {
    if (roles.includes('admin')) return '/admin/perfil'
    if (roles.includes('authority')) return '/authority/perfil'
    return '/perfil'
  }

  return null
}

function NotificationIcon({ type }: { type: string }) {
  if (type === 'case_approved') return <CheckCircle2 size={16} className="text-success" />
  if (type === 'case_rejected') return <AlertTriangle size={16} className="text-error" />
  if (type === 'case_found') return <CheckCircle2 size={16} className="text-info" />
  if (type === 'case_deleted') return <AlertTriangle size={16} className="text-error" />
  if (type === 'sighting_created') return <Eye size={16} className="text-warning" />
  if (type === 'account_status_changed') return <UserCog size={16} className="text-primary" />
  return <Bell size={16} className="text-primary" />
}

export function NotificationItem({
  notification,
  dense = false,
  showDelete = true,
  onRead,
  onDelete,
  onNavigate,
}: {
  notification: NotificationRow
  dense?: boolean
  showDelete?: boolean
  onRead?: (notificationId: string) => Promise<void> | void
  onDelete?: (notificationId: string) => Promise<void> | void
  onNavigate?: () => void
}) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [busy, setBusy] = useState(false)

  const roles = useMemo(() => user?.roles ?? [], [user?.roles])
  const isUnread = !notification.read_at
  const targetPath = useMemo(() => buildTargetPath(notification, roles), [notification, roles])

  const handleClick = async () => {
    if (busy) return

    if (isUnread && onRead) {
      setBusy(true)
      try {
        await onRead(notification.id)
      } catch {
        return
      } finally {
        setBusy(false)
      }
    }

    if (targetPath) {
      navigate(targetPath)
      onNavigate?.()
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      void handleClick()
    }
  }

  const handleDelete = async (event: MouseEvent) => {
    event.stopPropagation()
    if (busy) return
    if (!onDelete) return

    setBusy(true)
    try {
      await onDelete(notification.id)
    } catch {
      return
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-disabled={busy}
      onClick={() => void handleClick()}
      onKeyDown={handleKeyDown}
      className={`w-full text-left flex items-start gap-3 rounded-xl border border-border bg-card hover:bg-background transition-colors cursor-pointer ${
        dense ? 'px-3 py-2.5' : 'px-4 py-3'
      } ${isUnread ? 'ring-1 ring-primary/20' : ''} ${busy ? 'opacity-70' : ''}`}
    >
      <div className="mt-0.5 shrink-0">
        <NotificationIcon type={notification.type} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          <p className={`text-sm leading-snug ${isUnread ? 'font-semibold text-text-primary' : 'text-text-primary'}`}>
            {notification.title}
          </p>
          {isUnread && <span className="mt-1 w-2 h-2 rounded-full bg-primary shrink-0" />}
        </div>
        <p className="text-xs text-text-secondary mt-1 leading-snug line-clamp-2">{notification.message}</p>
        <p className="text-[11px] text-text-secondary mt-1">{formatTime(notification.created_at)}</p>
      </div>
      {showDelete && onDelete && (
        <span className="shrink-0">
          <button
            type="button"
            onClick={(event) => void handleDelete(event)}
            className="p-2 rounded-lg text-text-secondary hover:text-error hover:bg-error/5 transition-colors"
            aria-label="Eliminar notificación"
            disabled={busy}
          >
            <Trash2 size={16} />
          </button>
        </span>
      )}
    </div>
  )
}
