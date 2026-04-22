import { useEffect, useCallback, useRef, useState } from 'react'
import { useAuth } from '../../auth/hooks'
import { appToast } from '../../../shared/components/ui'
import {
  deleteNotification,
  fetchNotifications,
  fetchUnreadNotificationsCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  subscribeToNotificationsRealtime,
} from '../services/notifications'
import { normalizeNotificationRow, type NotificationRow, type NotificationsRealtimePayload } from '../types'

const MAX_TOAST_IDS = 100
const TOAST_ID_CLEANUP_INTERVAL = 60000

interface UseRealtimeNotificationsOptions {
  limit?: number
  onNewNotification?: (notification: NotificationRow) => void
  enabled?: boolean
}

export function useRealtimeNotifications(options: UseRealtimeNotificationsOptions = {}) {
  const { limit = 50, onNewNotification, enabled = true } = options
  const { user } = useAuth()
  const userId = user?.id ?? ''

  const [notifications, setNotifications] = useState<NotificationRow[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  
  const unsubscribeRef = useRef<(() => void) | null>(null)
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const toastShownIds = useRef<Set<string>>(new Set())
  const reconnectAttempts = useRef(0)
  const isMountedRef = useRef(true)
  const isReconnecting = useRef(false)

  const MAX_RECONNECT_ATTEMPTS = 5
  const RECONNECT_DELAY_BASE = 1000

  const loadNotifications = useCallback(async () => {
    if (!userId || !enabled || !isMountedRef.current) return
    
    setIsLoading(true)
    setConnectionError(null)
    
    try {
      const [list, count] = await Promise.all([
        fetchNotifications(userId, { limit }),
        fetchUnreadNotificationsCount(userId),
      ])
      
      if (!isMountedRef.current) return
      
      setNotifications(list)
      setUnreadCount(count)
      reconnectAttempts.current = 0
    } catch (err) {
      console.error('Error loading notifications:', err)
      if (isMountedRef.current) {
        setConnectionError('Error al cargar notificaciones')
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false)
      }
    }
  }, [userId, limit, enabled])

  const handleRealtimeEvent = useCallback(
    (payload: NotificationsRealtimePayload) => {
      if (!enabled || !userId || !isMountedRef.current) return

      if (payload.eventType === 'INSERT' && payload.new) {
        const normalized = normalizeNotificationRow(payload.new)
        if (!normalized || normalized.user_id !== userId) return

        setNotifications((prev) => [normalized, ...prev].slice(0, limit))
        
        if (!normalized.read_at) {
          setUnreadCount((prev) => prev + 1)
        }

        if (onNewNotification && normalized.id && !toastShownIds.current.has(normalized.id)) {
          if (toastShownIds.current.size >= MAX_TOAST_IDS) {
            const firstKey = toastShownIds.current.values().next().value
            if (firstKey) toastShownIds.current.delete(firstKey)
          }
          toastShownIds.current.add(normalized.id)
          onNewNotification(normalized)
        }
      }

if (payload.eventType === 'UPDATE' && payload.new && payload.old) {
        const prevId = typeof payload.old.id === 'string' ? payload.old.id : ''
        const prevReadAt = payload.old.read_at
        const newReadAt = typeof payload.new.read_at === 'string' ? payload.new.read_at : null

        if (prevReadAt === null && newReadAt !== null && prevId) {
          setUnreadCount((prev) => Math.max(0, prev - 1))
          setNotifications((prev) =>
            prev.map((n) => (n.id === prevId ? { ...n, read_at: newReadAt } : n))
          )
        }
      }

      if (payload.eventType === 'DELETE' && payload.old) {
        const deletedId = typeof payload.old.id === 'string' ? payload.old.id : ''
        const wasUnread = payload.old.read_at === null
        if (deletedId) {
          setNotifications((prev) => prev.filter((n) => n.id !== deletedId))
          if (wasUnread) {
            setUnreadCount((prev) => Math.max(0, prev - 1))
          }
        }
      }
    },
    [userId, limit, enabled, onNewNotification]
  )

  const cleanupToastIds = useCallback(() => {
    if (toastShownIds.current.size > MAX_TOAST_IDS / 2) {
      const idsArray = Array.from(toastShownIds.current)
      const toKeep = idsArray.slice(-MAX_TOAST_IDS / 2)
      toastShownIds.current = new Set(toKeep)
    }
  }, [])

  const setupRealtime = useCallback(() => {
    if (!userId || !enabled || !isMountedRef.current || isReconnecting.current) return

    if (unsubscribeRef.current) {
      unsubscribeRef.current()
      unsubscribeRef.current = null
    }

    const unsubscribe = subscribeToNotificationsRealtime(userId, (payload) => {
      if (isReconnecting.current) return
      handleRealtimeEvent(payload)
    })
    
    unsubscribeRef.current = () => {
      try {
        unsubscribe()
      } catch (e) {
        console.warn('[Notifications] Error on unsubscribe:', e)
      }
    }
    
    setIsConnected(true)
    setConnectionError(null)
    reconnectAttempts.current = 0
  }, [userId, enabled, handleRealtimeEvent])

  const handleReconnect = useCallback(() => {
    if (!isMountedRef.current || isReconnecting.current) return
    
    isReconnecting.current = true
    setIsConnected(false)
    
    if (unsubscribeRef.current) {
      try {
        unsubscribeRef.current()
      } catch (e) {
        console.warn('[Notifications] Error disconnecting:', e)
      }
      unsubscribeRef.current = null
    }

    if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
      const delay = RECONNECT_DELAY_BASE * Math.pow(2, reconnectAttempts.current)
      reconnectAttempts.current++
      
      console.log(`[Notifications] Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current})`)
      
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
      
      retryTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current && enabled && userId) {
          isReconnecting.current = false
          loadNotifications()
          setupRealtime()
        }
      }, delay)
    } else {
      isReconnecting.current = false
      console.error('[Notifications] Max reconnection attempts reached')
      setConnectionError('Conexión perdida. Por favor, recarga la página.')
    }
  }, [enabled, userId, loadNotifications, setupRealtime])

  useEffect(() => {
    isMountedRef.current = true
    
    const cleanupInterval = setInterval(cleanupToastIds, TOAST_ID_CLEANUP_INTERVAL)

    if (!userId || !enabled) {
      setIsLoading(false)
      return
    }

    void loadNotifications()
    setupRealtime()

return () => {
      clearInterval(cleanupInterval)
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
      if (unsubscribeRef.current) {
        try {
          unsubscribeRef.current()
        } catch (e) {
          console.warn('[Notifications] Error on cleanup unsubscribe:', e)
        }
      }
      unsubscribeRef.current = null
      setIsConnected(false)
    }
  }, [userId, enabled, loadNotifications, setupRealtime, cleanupToastIds])

  useEffect(() => {
    if (!isConnected || connectionError) {
      const timer = setTimeout(() => {
        if (isMountedRef.current && enabled && userId && !isReconnecting.current) {
          handleReconnect()
        }
      }, 10000)
      
      return () => clearTimeout(timer)
    }
  }, [isConnected, connectionError, enabled, userId, handleReconnect])

  useEffect(() => {
    const interval = setInterval(() => {
      if (isMountedRef.current && enabled && userId && !isConnected && !isReconnecting.current) {
        console.log('[Notifications] Periodic reconnection check')
        loadNotifications()
        setupRealtime()
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [enabled, userId, isConnected, loadNotifications, setupRealtime])

  const markAsRead = useCallback(
    async (notificationId: string) => {
      try {
        await markNotificationAsRead(notificationId)
        
        setNotifications((prev) =>
          prev.map((n) => {
            if (n.id === notificationId && !n.read_at) {
              return { ...n, read_at: new Date().toISOString() }
            }
            return n
          })
        )
        
        setUnreadCount((prev) => Math.max(0, prev - 1))
      } catch (err) {
        appToast.error('No se pudo marcar como leída')
        throw err
      }
    },
    []
  )

  const markAllAsRead = useCallback(async () => {
    if (!userId) return
    try {
      await markAllNotificationsAsRead(userId)
      
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
      )
      
      setUnreadCount(0)
      appToast.success('Notificaciones leídas')
    } catch (err) {
      appToast.error('No se pudieron marcar como leídas')
      throw err
    }
  }, [userId])

  const removeOne = useCallback(
    async (notificationId: string) => {
      const notification = notifications.find((n) => n.id === notificationId)
      try {
        await deleteNotification(notificationId)
        
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
        
        if (notification?.read_at === null) {
          setUnreadCount((prev) => Math.max(0, prev - 1))
        }
      } catch (err) {
        appToast.error('No se pudo eliminar')
        throw err
      }
    },
    [notifications]
  )

  const refresh = useCallback(async () => {
    await loadNotifications()
    setupRealtime()
  }, [loadNotifications, setupRealtime])

  return {
    notifications,
    unreadCount,
    isLoading,
    isConnected,
    connectionError,
    markAsRead,
    markAllAsRead,
    removeOne,
    refresh,
  }
}