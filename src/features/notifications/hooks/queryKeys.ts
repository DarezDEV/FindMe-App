export const NOTIFICATIONS_LIST_QUERY_KEY = (userId: string, limit: number) =>
  ['notifications', userId, limit] as const

export const NOTIFICATIONS_UNREAD_COUNT_QUERY_KEY = (userId: string) =>
  ['notifications-unread-count', userId] as const

export const NOTIFICATIONS_QUERY_STALE_TIME = 1000 * 10
export const NOTIFICATIONS_QUERY_GC_TIME = 1000 * 60 * 10

