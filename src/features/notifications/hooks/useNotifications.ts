import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'
import { useAuth } from '../../auth/hooks'
import { appToast } from '../../../shared/components/ui'
import { handleError } from '../../../shared/utils/handleError'
import {
  clearNotifications,
  deleteNotification,
  fetchNotifications,
  fetchUnreadNotificationsCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '../services/notifications'
import {
  NOTIFICATIONS_LIST_QUERY_KEY,
  NOTIFICATIONS_QUERY_GC_TIME,
  NOTIFICATIONS_QUERY_STALE_TIME,
  NOTIFICATIONS_UNREAD_COUNT_QUERY_KEY,
} from './queryKeys'
import type { NotificationRow } from '../types'

export function useNotifications(options: { limit?: number; includeList?: boolean; includeCount?: boolean } = {}) {
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const limit = options.limit ?? 50
  const includeList = options.includeList ?? true
  const includeCount = options.includeCount ?? true
  const queryClient = useQueryClient()

  const listQueryKey = useMemo(() => NOTIFICATIONS_LIST_QUERY_KEY(userId, limit), [userId, limit])
  const countQueryKey = useMemo(() => NOTIFICATIONS_UNREAD_COUNT_QUERY_KEY(userId), [userId])

  const listQuery = useQuery({
    queryKey: listQueryKey,
    queryFn: () => fetchNotifications(userId, { limit }),
    enabled: includeList && !!userId,
    staleTime: NOTIFICATIONS_QUERY_STALE_TIME,
    gcTime: NOTIFICATIONS_QUERY_GC_TIME,
    refetchOnWindowFocus: false,
  })

  const countQuery = useQuery({
    queryKey: countQueryKey,
    queryFn: () => fetchUnreadNotificationsCount(userId),
    enabled: includeCount && !!userId,
    staleTime: NOTIFICATIONS_QUERY_STALE_TIME,
    gcTime: NOTIFICATIONS_QUERY_GC_TIME,
    refetchOnWindowFocus: false,
  })

  const syncListQueries = useCallback(async () => {
    if (!userId) return
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['notifications', userId] }),
      queryClient.invalidateQueries({ queryKey: countQueryKey }),
    ])
  }, [countQueryKey, queryClient, userId])

  const markAsRead = useCallback(
    async (notificationId: string) => {
      try {
        await markNotificationAsRead(notificationId)
        await syncListQueries()
      } catch (err) {
        handleError('useNotifications.markAsRead', err, {
          fallbackMessage: 'No se pudo marcar la notificación como leída.',
        })
        throw err
      }
    },
    [syncListQueries],
  )

  const markAllAsRead = useCallback(async () => {
    if (!userId) return
    try {
      await markAllNotificationsAsRead(userId)
      await syncListQueries()
      appToast.success('Notificaciones marcadas como leídas.')
    } catch (err) {
      handleError('useNotifications.markAllAsRead', err, {
        fallbackMessage: 'No se pudieron marcar las notificaciones como leídas.',
      })
      throw err
    }
  }, [syncListQueries, userId])

  const clearAll = useCallback(async () => {
    if (!userId) return
    try {
      await clearNotifications(userId)
      await syncListQueries()
      appToast.success('Notificaciones vaciadas.')
    } catch (err) {
      handleError('useNotifications.clearAll', err, {
        fallbackMessage: 'No se pudieron vaciar las notificaciones.',
      })
      throw err
    }
  }, [syncListQueries, userId])

  const removeOne = useCallback(
    async (notificationId: string) => {
      try {
        await deleteNotification(notificationId)
        await syncListQueries()
      } catch (err) {
        handleError('useNotifications.removeOne', err, { fallbackMessage: 'No se pudo eliminar la notificación.' })
        throw err
      }
    },
    [syncListQueries],
  )

  const notifications = includeList ? ((listQuery.data ?? []) as NotificationRow[]) : []
  const unreadCount = includeCount && typeof countQuery.data === 'number' ? countQuery.data : 0

  return {
    userId,
    limit,
    notifications,
    unreadCount,
    isLoading: (includeList ? listQuery.isLoading : false) || (includeCount ? countQuery.isLoading : false),
    isFetching: (includeList ? listQuery.isFetching : false) || (includeCount ? countQuery.isFetching : false),
    error: (includeList ? listQuery.error : null) ?? (includeCount ? countQuery.error : null) ?? null,
    refetch: async () => {
      const tasks: Array<Promise<unknown>> = []
      if (includeList) tasks.push(listQuery.refetch())
      if (includeCount) tasks.push(countQuery.refetch())
      await Promise.all(tasks)
    },
    markAsRead,
    markAllAsRead,
    clearAll,
    removeOne,
  }
}
