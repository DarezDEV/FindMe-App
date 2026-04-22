export type NotificationType =
  | 'info'
  | 'case_approved'
  | 'case_rejected'
  | 'case_found'
  | 'case_closed'
  | 'case_deleted'
  | 'sighting_created'
  | 'account_status_changed'
  | (string & {})

export interface NotificationRow {
  id: string
  user_id: string
  type: NotificationType
  title: string
  message: string
  metadata: Record<string, unknown> | null
  read_at: string | null
  created_at: string
}

export interface NotificationsRealtimeRow {
  id: string
  user_id: string
  type: string
  title: string
  message: string
  metadata?: unknown
  read_at?: unknown
  created_at?: unknown
}

export interface NotificationsRealtimePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: Partial<NotificationsRealtimeRow>
  old: Partial<NotificationsRealtimeRow>
}

export function normalizeNotificationRow(row: Partial<NotificationsRealtimeRow>): NotificationRow | null {
  const id = typeof row.id === 'string' ? row.id : ''
  const userId = typeof row.user_id === 'string' ? row.user_id : ''
  const type = typeof row.type === 'string' ? (row.type as NotificationType) : ('info' as NotificationType)
  const title = typeof row.title === 'string' ? row.title : ''
  const message = typeof row.message === 'string' ? row.message : ''

  if (!id || !userId || !title || !message) return null

  const metadata =
    row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
      ? (row.metadata as Record<string, unknown>)
      : null

  const readAt = typeof row.read_at === 'string' ? row.read_at : null
  const createdAt = typeof row.created_at === 'string' ? row.created_at : new Date().toISOString()

  return {
    id,
    user_id: userId,
    type,
    title,
    message,
    metadata,
    read_at: readAt,
    created_at: createdAt,
  }
}

