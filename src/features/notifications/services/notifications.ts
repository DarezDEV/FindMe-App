import { supabase } from '../../../lib/supabase/client'
import {
  normalizeNotificationRow,
  type NotificationRow,
  type NotificationsRealtimePayload,
  type NotificationsRealtimeRow,
} from '../types'

const NOTIFICATIONS_TABLE = 'notifications'

function mapDbErrorMessage(message: string) {
  const lower = message.toLowerCase()

  if (lower.includes('row-level security') || lower.includes('permission denied')) {
    return 'No tienes permisos para acceder a las notificaciones.'
  }

  if ((lower.includes('relation') || lower.includes('does not exist')) && lower.includes('notifications')) {
    return 'El sistema de notificaciones no está configurado. Ejecuta la migración de la tabla notifications.'
  }

  return message
}

function mapUnknownError(error: unknown, fallback: string) {
  if (error instanceof Error) return mapDbErrorMessage(error.message)
  if (typeof error === 'string') return mapDbErrorMessage(error)

  if (error && typeof error === 'object') {
    const candidate = error as { message?: unknown }
    if (typeof candidate.message === 'string') return mapDbErrorMessage(candidate.message)
  }

  return fallback
}

export async function fetchNotifications(
  userId: string,
  options: { limit?: number } = {},
): Promise<NotificationRow[]> {
  const limit = options.limit ?? 50

  try {
    const { data, error } = await supabase
      .from(NOTIFICATIONS_TABLE)
      .select('id, user_id, type, title, message, metadata, read_at, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    const rows = (data ?? []) as Array<Partial<NotificationsRealtimeRow>>
    return rows.map(normalizeNotificationRow).filter((row): row is NotificationRow => Boolean(row))
  } catch (err) {
    throw new Error(mapUnknownError(err, 'No se pudieron cargar las notificaciones.'))
  }
}

export async function fetchUnreadNotificationsCount(userId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from(NOTIFICATIONS_TABLE)
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('read_at', null)

    if (error) throw error

    return typeof count === 'number' ? count : 0
  } catch (err) {
    throw new Error(mapUnknownError(err, 'No se pudo cargar el contador de notificaciones.'))
  }
}

export async function createNotificationForSelf(input: {
  type: string
  title: string
  message: string
  metadata?: Record<string, unknown>
}): Promise<string> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) {
    throw new Error('No se pudo validar la sesión del usuario.')
  }

  const userId = sessionData.session?.user?.id
  if (!userId) {
    throw new Error('Debes iniciar sesión para crear una notificación.')
  }

  const payload = {
    user_id: userId,
    type: input.type,
    title: input.title,
    message: input.message,
    metadata: input.metadata ?? {},
  }

  const { data, error } = await supabase
    .from(NOTIFICATIONS_TABLE)
    .insert(payload)
    .select('id')
    .single()

  if (error) {
    throw new Error(mapDbErrorMessage(error.message))
  }

  const id = typeof (data as { id?: unknown } | null)?.id === 'string' ? String((data as { id: string }).id) : ''
  if (!id) {
    throw new Error('No se pudo crear la notificación.')
  }

  return id
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from(NOTIFICATIONS_TABLE)
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId)

    if (error) throw error
  } catch (err) {
    throw new Error(mapUnknownError(err, 'No se pudo marcar la notificación como leída.'))
  }
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from(NOTIFICATIONS_TABLE)
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('read_at', null)

    if (error) throw error
  } catch (err) {
    throw new Error(mapUnknownError(err, 'No se pudieron marcar las notificaciones como leídas.'))
  }
}

export async function clearNotifications(userId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from(NOTIFICATIONS_TABLE)
      .delete()
      .eq('user_id', userId)

    if (error) throw error
  } catch (err) {
    throw new Error(mapUnknownError(err, 'No se pudieron vaciar las notificaciones.'))
  }
}

export async function deleteNotification(notificationId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from(NOTIFICATIONS_TABLE)
      .delete()
      .eq('id', notificationId)

    if (error) throw error
  } catch (err) {
    throw new Error(mapUnknownError(err, 'No se pudo eliminar la notificación.'))
  }
}

export function subscribeToNotificationsRealtime(
  userId: string,
  onChange: (payload: NotificationsRealtimePayload) => void,
): () => void {
  const channel = supabase
    .channel(`notifications-${userId}-${crypto.randomUUID()}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: NOTIFICATIONS_TABLE, filter: `user_id=eq.${userId}` },
      (payload) => {
        const newRowRaw = (payload.new ?? {}) as Record<string, unknown>
        const oldRowRaw = (payload.old ?? {}) as Record<string, unknown>

        try {
          onChange({
            eventType: payload.eventType as NotificationsRealtimePayload['eventType'],
            new: {
              id: typeof newRowRaw.id === 'string' ? newRowRaw.id : String(newRowRaw.id ?? ''),
              user_id: typeof newRowRaw.user_id === 'string' ? newRowRaw.user_id : String(newRowRaw.user_id ?? ''),
              type: typeof newRowRaw.type === 'string' ? newRowRaw.type : String(newRowRaw.type ?? ''),
              title: typeof newRowRaw.title === 'string' ? newRowRaw.title : String(newRowRaw.title ?? ''),
              message: typeof newRowRaw.message === 'string' ? newRowRaw.message : String(newRowRaw.message ?? ''),
              metadata: newRowRaw.metadata,
              read_at: newRowRaw.read_at,
              created_at: newRowRaw.created_at,
            },
            old: {
              id: typeof oldRowRaw.id === 'string' ? oldRowRaw.id : String(oldRowRaw.id ?? ''),
              user_id: typeof oldRowRaw.user_id === 'string' ? oldRowRaw.user_id : String(oldRowRaw.user_id ?? ''),
              type: typeof oldRowRaw.type === 'string' ? oldRowRaw.type : String(oldRowRaw.type ?? ''),
              title: typeof oldRowRaw.title === 'string' ? oldRowRaw.title : String(oldRowRaw.title ?? ''),
              message: typeof oldRowRaw.message === 'string' ? oldRowRaw.message : String(oldRowRaw.message ?? ''),
              metadata: oldRowRaw.metadata,
              read_at: oldRowRaw.read_at,
              created_at: oldRowRaw.created_at,
            },
          })
        } catch (err) {
          console.error('[subscribeToNotificationsRealtime] onChange error:', err)
        }
      },
    )
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR') {
        console.error('[subscribeToNotificationsRealtime] Error en canal realtime de notificaciones.')
      }
    })

  return () => {
    void supabase.removeChannel(channel)
  }
}
