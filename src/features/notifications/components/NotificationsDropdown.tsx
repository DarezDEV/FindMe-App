import { Link } from 'react-router-dom'
import { useEffect } from 'react'
import { Spinner } from '../../../shared/components/ui'
import { useNotifications } from '../hooks/useNotifications'
import { NotificationItem } from './NotificationItem'
import { markAllNotificationsAsReadForCurrentUser } from '../services/notifications'

export function NotificationsDropdown({
  toAll = '/notificaciones',
  onNavigate,
}: {
  toAll?: string
  onNavigate?: () => void
}) {
  const { notifications, unreadCount, isLoading, error, refetch, markAsRead } = useNotifications({ limit: 6 })

  useEffect(() => {
    if (!isLoading && unreadCount > 0) {
      markAllNotificationsAsReadForCurrentUser().catch(() => {})
    }
  }, [isLoading, unreadCount])

  return (
    <div>
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="font-semibold text-sm text-text-primary">Notificaciones</span>
        <Link
          to={toAll}
          onClick={onNavigate}
          className="text-xs text-primary hover:text-primary-hover font-medium transition-colors"
        >
          Ver todas
        </Link>
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
