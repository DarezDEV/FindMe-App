import { Bell, RefreshCw, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Alert, Spinner } from '../../../shared/components/ui'
import { handleError } from '../../../shared/utils/handleError'
import { useNotifications } from '../hooks/useNotifications'
import { NotificationItem } from './NotificationItem'
import { markAllNotificationsAsReadForCurrentUser } from '../services/notifications'

export function NotificationsCenter({ limit = 200 }: { limit?: number }) {
  const {
    notifications,
    unreadCount,
    isLoading,
    isFetching,
    error,
    refetch,
    clearAll,
    markAsRead,
    removeOne,
  } = useNotifications({ limit })

  const [actionBusy, setActionBusy] = useState(false)
  const [hasAutoRead, setHasAutoRead] = useState(false)

  useEffect(() => {
    if (!hasAutoRead && !isLoading && unreadCount > 0) {
      setHasAutoRead(true)
      markAllNotificationsAsReadForCurrentUser().catch(() => {})
    }
  }, [isLoading, unreadCount, hasAutoRead])

  const handleRefetch = async () => {
    if (actionBusy) return
    try {
      await refetch()
    } catch (error) {
      handleError('NotificationsCenter.refetch', error, {
        fallbackMessage: 'No se pudieron actualizar las notificaciones.',
      })
    }
  }

  const handleClear = async () => {
    if (actionBusy) return
    if (notifications.length === 0) return

    const ok = window.confirm('¿Vaciar todas las notificaciones?')
    if (!ok) return

    setActionBusy(true)
    try {
      await clearAll()
    } catch {
      return
    } finally {
      setActionBusy(false)
    }
  }

  return (
    <div className="w-full">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-text-secondary">
            Centro
          </p>
          <h1 className="text-3xl font-bold text-text-primary mt-1 flex items-center gap-2">
            <Bell className="text-primary" size={22} />
            Notificaciones
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Mantente al tanto de cambios y eventos importantes en la plataforma.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void handleRefetch()}
            disabled={isFetching || actionBusy}
            className="btn-secondary flex items-center gap-2 py-2"
          >
            <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
            {isFetching ? 'Actualizando...' : 'Recargar'}
          </button>
          <button
            type="button"
            onClick={() => void handleClear()}
            disabled={notifications.length === 0 || actionBusy}
            className="btn-secondary flex items-center gap-2 py-2 text-error border-error/20 hover:bg-error/5"
          >
            <Trash2 size={16} />
            Vaciar
          </button>
        </div>
      </div>

      <div className="mt-6">
        {error && (
          <Alert
            type="error"
            message={error instanceof Error ? error.message : 'No se pudieron cargar las notificaciones.'}
          />
        )}

        {isLoading && (
          <div className="flex items-center gap-3 text-text-secondary mt-6">
            <Spinner />
            <span className="text-sm">Cargando notificaciones...</span>
          </div>
        )}

        {!isLoading && notifications.length === 0 && (
          <div className="card p-10 text-center">
            <p className="text-text-primary font-semibold">Sin notificaciones</p>
            <p className="text-sm text-text-secondary mt-1">
              Cuando ocurra algo importante (aprobaciones, avistamientos, acciones del sistema) lo verás aquí.
            </p>
          </div>
        )}

        {!isLoading && notifications.length > 0 && (
          <div className="grid gap-3">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onRead={markAsRead}
                onDelete={removeOne}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
