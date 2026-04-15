import { Link } from 'react-router-dom'
import { useState } from 'react'
import { Spinner } from '../../../shared/components/ui'
import { useNotifications } from '../hooks/useNotifications'
import { NotificationItem } from './NotificationItem'

export function NotificationsDropdown({
  toAll = '/notificaciones',
  onNavigate,
}: {
  toAll?: string
  onNavigate?: () => void
}) {
  const { notifications, unreadCount, isLoading, error, refetch, markAllAsRead, markAsRead } = useNotifications({ limit: 6 })
  const [busy, setBusy] = useState(false)

  const handleMarkAll = async () => {
    if (busy) return
    setBusy(true)
    try {
      await markAllAsRead()
    } catch {
      return
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="font-semibold text-sm text-text-primary">Notificaciones</span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => void handleMarkAll()}
            disabled={unreadCount === 0 || busy}
            className="text-xs text-text-secondary hover:text-primary font-medium transition-colors disabled:opacity-50"
          >
            Marcar todo
          </button>
          <Link
            to={toAll}
            onClick={onNavigate}
            className="text-xs text-primary hover:text-primary-hover font-medium transition-colors"
          >
            Ver todas
          </Link>
        </div>
      </div>

      <div className="max-h-72 overflow-y-auto p-3 space-y-2">
        {isLoading && (
          <div className="flex items-center gap-2 text-text-secondary text-xs px-1 py-2">
            <Spinner />
            <span>Cargando...</span>
          </div>
        )}

        {!isLoading && error && (
          <div className="flex items-center justify-between gap-2 text-xs px-1 py-2 text-error">
            <span>No se pudieron cargar las notificaciones.</span>
            <button
              type="button"
              onClick={() => void refetch()}
              className="text-xs text-primary hover:text-primary-hover font-medium transition-colors"
            >
              Reintentar
            </button>
          </div>
        )}

        {!isLoading && !error && notifications.length === 0 && (
          <p className="text-xs text-text-secondary px-1 py-2">No hay notificaciones recientes.</p>
        )}

        {!isLoading &&
          notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              dense
              showDelete={false}
              onRead={markAsRead}
              onNavigate={onNavigate}
            />
          ))}
      </div>
    </div>
  )
}
