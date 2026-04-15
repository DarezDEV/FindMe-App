import { useEffect, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../auth/hooks'
import { subscribeToNotificationsRealtime } from '../services/notifications'
import { normalizeNotificationRow, type NotificationRow } from '../types'
import { NOTIFICATIONS_UNREAD_COUNT_QUERY_KEY } from '../hooks/queryKeys'

type NotificationsListKey = readonly ['notifications', string, number]

type ReadAtValue = string | null | undefined

function isNotificationsListKey(value: unknown): value is NotificationsListKey {
  if (!Array.isArray(value)) return false
  if (value.length !== 3) return false
  if (value[0] !== 'notifications') return false
  if (typeof value[1] !== 'string') return false
  if (typeof value[2] !== 'number') return false
  return true
}

function normalizeReadAt(value: unknown): ReadAtValue {
  if (typeof value === 'string') return value
  if (value === null) return null
  return undefined
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!userId) return

    const countKey = NOTIFICATIONS_UNREAD_COUNT_QUERY_KEY(userId)

    const getListEntries = () => queryClient.getQueriesData({ queryKey: ['notifications', userId] })

    const findCached = (notificationId: string): NotificationRow | null => {
      const entries = getListEntries()

      for (const [key, data] of entries) {
        if (!isNotificationsListKey(key)) continue
        if (!Array.isArray(data)) continue

        const list = data as NotificationRow[]
        const item = list.find((candidate) => candidate.id === notificationId)
        if (item) return item
      }

      return null
    }

    const updateLists = (updater: (list: NotificationRow[], limit: number) => NotificationRow[]) => {
      const entries = getListEntries()
      entries.forEach(([key, data]) => {
        if (!isNotificationsListKey(key)) return

        const limit = key[2]
        const list = Array.isArray(data) ? (data as NotificationRow[]) : []
        queryClient.setQueryData(key, updater(list, limit))
      })
    }

    const updateCount = (delta: number) => {
      if (!delta) return

      queryClient.setQueryData(countKey, (current: unknown) => {
        const value = typeof current === 'number' ? current : 0
        return Math.max(0, value + delta)
      })
    }

    const invalidateCount = () => {
      void queryClient.invalidateQueries({ queryKey: countKey })
    }

    const unsubscribe = subscribeToNotificationsRealtime(userId, (payload) => {
      try {
        if (payload.eventType === 'INSERT') {
          const next = normalizeNotificationRow(payload.new)
          if (!next) return

          const cached = findCached(next.id)

          updateLists((list, limit) => {
            const withoutDup = list.filter((item) => item.id !== next.id)
            return [next, ...withoutDup].slice(0, limit)
          })

          if (!cached && !next.read_at) {
            updateCount(1)
          }

          return
        }

        if (payload.eventType === 'UPDATE') {
          const next = normalizeNotificationRow(payload.new)
          if (!next) return

          const cached = findCached(next.id)
          const oldReadAtFromPayload = normalizeReadAt(payload.old.read_at)
          const oldReadAt = oldReadAtFromPayload === undefined ? (cached ? cached.read_at : null) : oldReadAtFromPayload

          updateLists((list, limit) => {
            const nextList = list.map((item) => (item.id === next.id ? next : item))
            return nextList.slice(0, limit)
          })

          if (oldReadAtFromPayload === undefined && !cached) {
            invalidateCount()
            return
          }

          if (oldReadAt === null && next.read_at) updateCount(-1)
          if (oldReadAt && !next.read_at) updateCount(1)

          return
        }

        if (payload.eventType === 'DELETE') {
          const id = typeof payload.old.id === 'string' ? payload.old.id : ''
          if (!id) return

          const cached = findCached(id)
          const oldReadAtFromPayload = normalizeReadAt(payload.old.read_at)
          const oldReadAt = oldReadAtFromPayload === undefined ? (cached ? cached.read_at : null) : oldReadAtFromPayload

          updateLists((list, limit) => list.filter((item) => item.id !== id).slice(0, limit))

          if (oldReadAtFromPayload === undefined && !cached) {
            invalidateCount()
            return
          }

          if (oldReadAt === null) updateCount(-1)
        }
      } catch (err) {
        console.error('[NotificationsProvider] Realtime error:', err)
      }
    })

    return () => {
      unsubscribe()
    }
  }, [queryClient, userId])

  return <>{children}</>
}

