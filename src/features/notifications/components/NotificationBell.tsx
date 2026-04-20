import { useCallback, useState, useRef, useEffect } from 'react'
import { Bell, Trash2, X, Clock, AlertCircle, CheckCircle2, Info } from 'lucide-react'
import { useRealtimeNotifications } from '../hooks/useRealtimeNotifications'
import { appToast } from '../../../shared/components/ui'

const NOTIFICATION_ICONS: Record<string, React.ReactNode> = {
  info: <Info size={14} className="text-info" />,
  case_approved: <CheckCircle2 size={14} className="text-success" />,
  case_rejected: <X size={14} className="text-error" />,
  case_found: <CheckCircle2 size={14} className="text-success" />,
  case_closed: <Clock size={14} className="text-text-secondary" />,
  case_deleted: <Trash2 size={14} className="text-error" />,
  default: <AlertCircle size={14} className="text-warning" />,
}

function getNotificationIcon(type: string) {
  return NOTIFICATION_ICONS[type] || NOTIFICATION_ICONS.default
}

function formatTimeAgo(dateIso: string): string {
  const date = new Date(dateIso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Ahora'
  if (diffMins < 60) return `${diffMins}m`
  if (diffHours < 24) return `${diffHours}h`
  if (diffDays < 7) return `${diffDays}d`
  return date.toLocaleDateString('es-DO', { day: 'numeric', month: 'short' })
}

interface NotificationBellProps {
  className?: string
  iconClassName?: string
}

export function NotificationBell({ className = '', iconClassName = '' }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const handleNewNotification = useCallback((notification: { title: string; message: string }) => {
    appToast.info(notification.title, { title: notification.message })
  }, [])

  const {
    notifications,
    unreadCount,
    isLoading,
    isConnected,
    connectionError,
    markAsRead,
    markAllAsRead,
    removeOne,
  } = useRealtimeNotifications({
    limit: 20,
    onNewNotification: handleNewNotification,
  })

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleNotificationClick = useCallback(
    async (notification: { id: string; read_at: string | null }) => {
      if (!notification.read_at) {
        await markAsRead(notification.id)
      }
      setIsOpen(false)
    },
    [markAsRead]
  )

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-background transition-colors"
        aria-label="Notificaciones"
      >
        <Bell size={20} className={iconClassName || 'text-text-secondary'} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-error text-white text-[10px] font-bold rounded-full px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
        {(!isConnected && !isLoading) || connectionError ? (
          <span className="absolute bottom-0 right-0 w-2 h-2 bg-warning rounded-full" title={connectionError || "Reconectando..."} />
        ) : null}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background">
              <div className="flex items-center gap-2">
                <Bell size={16} className="text-text-secondary" />
                <h3 className="text-sm font-semibold text-text-primary">Notificaciones</h3>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] font-medium bg-error/10 text-error rounded">
                    {unreadCount} nuevas
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => markAllAsRead()}
                  className="text-xs text-primary hover:text-primary-hover font-medium"
                >
                  Marcar todo leído
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Bell size={32} className="text-text-secondary/30 mb-2" />
                  <p className="text-sm text-text-secondary">Sin notificaciones</p>
                  <p className="text-xs text-text-secondary/60 mt-1">
                    Te avisaremos cuando lleguen
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {notifications.map((notification) => (
                    <li key={notification.id}>
                      <button
                        type="button"
                        onClick={() => handleNotificationClick(notification)}
                        className={`w-full px-4 py-3 text-left hover:bg-background transition-colors ${
                          !notification.read_at ? 'bg-primary/5' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span className="shrink-0 mt-0.5">
                            {getNotificationIcon(notification.type)}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-text-primary truncate">
                                {notification.title}
                              </p>
                              {!notification.read_at && (
                                <span className="w-2 h-2 bg-primary rounded-full shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-text-secondary line-clamp-2 mt-0.5">
                              {notification.message}
                            </p>
                            <p className="text-[10px] text-text-secondary/60 mt-1">
                              {formatTimeAgo(notification.created_at)}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              removeOne(notification.id)
                            }}
                            className="shrink-0 p-1 text-text-secondary hover:text-error transition-colors"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {notifications.length > 0 && (
              <div className="px-4 py-2 border-t border-border bg-background">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-full text-center text-xs text-primary hover:text-primary-hover font-medium"
                >
                  Ver todas las notificaciones
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}