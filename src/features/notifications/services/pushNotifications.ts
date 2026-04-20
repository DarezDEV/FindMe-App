import { supabase } from '../../../lib/supabase/client'

const PUSH_SUBSCRIPTIONS_TABLE = 'push_subscriptions'

const SUPABASE_FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`

const VAPID_KEY_CACHE_DURATION_MS = 1000 * 60 * 60 * 1 // 1 hora

export interface PushSubscriptionData {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

interface VapidCache {
  key: string | null
  expiresAt: number
}

let vapidCache: VapidCache = {
  key: null,
  expiresAt: 0,
}

export function clearVapidCache(): void {
  vapidCache = { key: null, expiresAt: 0 }
}

async function getVapidKeyFromEdgeFunction(): Promise<string | null> {
  const now = Date.now()
  
  if (vapidCache.key && now < vapidCache.expiresAt) {
    return vapidCache.key
  }

  try {
    const { data: { session } } = await supabase.auth.getSession()
    const authHeader = session?.access_token ? `Bearer ${session.access_token}` : undefined

    const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/send-push/public-key`, {
      headers: {
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY as string,
        ...(authHeader ? { 'Authorization': authHeader } : {}),
      },
    })

    if (!response.ok) {
      console.warn('[PushService] Failed to get VAPID key from edge function:', response.status)
      if (vapidCache.key) {
        console.warn('[PushService] Using stale VAPID key')
        return vapidCache.key
      }
      return null
    }

    const data = await response.json() as { publicKey?: string }
    if (data.publicKey && data.publicKey.length > 0) {
      vapidCache = {
        key: data.publicKey,
        expiresAt: now + VAPID_KEY_CACHE_DURATION_MS,
      }
      return vapidCache.key
    }

    console.warn('[PushService] Empty VAPID key returned')
    return null
  } catch (err) {
    console.error('[PushService] Error fetching VAPID key:', err)
    if (vapidCache.key) {
      console.warn('[PushService] Using stale VAPID key due to network error')
      return vapidCache.key
    }
    return null
  }
}

export async function savePushSubscription(
  userId: string,
  subscription: PushSubscriptionData
): Promise<void> {
  try {
    const { error } = await supabase.from(PUSH_SUBSCRIPTIONS_TABLE).upsert(
      {
        user_id: userId,
        endpoint: subscription.endpoint,
        p256dh_key: subscription.keys.p256dh,
        auth_key: subscription.keys.auth,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id, endpoint' }
    )

    if (error) throw error
    console.log('[PushService] Subscription saved successfully')
  } catch (err) {
    console.error('[PushService] Error saving subscription:', err)
    throw err
  }
}

export async function removePushSubscription(userId: string, endpoint: string): Promise<void> {
  try {
    const { error } = await supabase
      .from(PUSH_SUBSCRIPTIONS_TABLE)
      .delete()
      .eq('user_id', userId)
      .eq('endpoint', endpoint)

    if (error) throw error
    console.log('[PushService] Subscription removed successfully')
  } catch (err) {
    console.error('[PushService] Error removing subscription:', err)
  }
}

export async function getUserPushSubscriptions(userId: string): Promise<PushSubscriptionData[]> {
  try {
    const { data, error } = await supabase
      .from(PUSH_SUBSCRIPTIONS_TABLE)
      .select('endpoint, p256dh_key, auth_key')
      .eq('user_id', userId)

    if (error) throw error

    return (data ?? []).map((row) => ({
      endpoint: row.endpoint,
      keys: {
        p256dh: row.p256dh_key,
        auth: row.auth_key,
      },
    }))
  } catch (err) {
    console.error('[PushService] Error getting subscriptions:', err)
    return []
  }
}

export async function requestPushPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied'
  }

  if (Notification.permission === 'granted' || Notification.permission === 'denied') {
    return Notification.permission
  }

  try {
    const permission = await Notification.requestPermission()
    return permission
  } catch (err) {
    console.error('[PushService] Error requesting permission:', err)
    return 'denied'
  }
}

function convertVapidBase64(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const normalized = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')

  const binaryString = atob(normalized)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes
}

interface SubscribeOptions {
  maxRetries?: number
  retryDelay?: number
}

const DEFAULT_RETRY_OPTIONS = {
  maxRetries: 3,
  retryDelay: 1000,
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function subscribeToPush(
  userId: string,
  options: SubscribeOptions = DEFAULT_RETRY_OPTIONS
): Promise<PushSubscriptionData | null> {
  if (typeof window === 'undefined') {
    console.warn('[PushService] Not in browser environment')
    return null
  }

  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('[PushService] Push not supported in this browser')
    return null
  }

  const { maxRetries, retryDelay } = { ...DEFAULT_RETRY_OPTIONS, ...options }

  console.log('[PushService] subscribeToPush called, maxRetries:', maxRetries)
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log('[PushService] Attempt:', attempt + 1)
      const permission = await requestPushPermission()
      console.log('[PushService] Permission result:', permission)
      if (permission !== 'granted') {
        console.warn('[PushService] Push permission not granted:', permission)
        return null
      }

      console.log('[PushService] Getting VAPID key...')
      const vapidKeyBase64 = await getVapidKeyFromEdgeFunction()
      console.log('[PushService] VAPID key result:', vapidKeyBase64 ? 'received' : 'null')
      if (!vapidKeyBase64) {
        console.warn('[PushService] VAPID key not available from server')
        return null
      }

      let vapidKey
      try {
        console.log('[PushService] Converting VAPID key...')
        vapidKey = convertVapidBase64(vapidKeyBase64)
        console.log('[PushService] Convert successful, length:', vapidKey?.length)
      } catch (err) {
        console.error('[PushService] Error converting VAPID:', err)
        return null
      }

      console.log('[PushService] Checking service workers count...')
      const regs = await navigator.serviceWorker.getRegistrations()
      console.log('[PushService] Service worker registrations:', regs.length)
      
      let registration
      if (regs.length > 0) {
        registration = regs[0]
        console.log('[PushService] Using existing registration')
      } else {
        console.log('[PushService] No existing registration, registering new...')
        await navigator.serviceWorker.register('/sw.js', { scope: '/' })
        console.log('[PushService] Service worker registered, waiting for ready...')
        
        // Wait for the service worker to be ready
        let counter = 0
        while (counter < 50 && !navigator.serviceWorker.ready) {
          await sleep(100)
          counter++
        }
        registration = await navigator.serviceWorker.ready
        console.log('[PushService] Service worker ready')
      }
      console.log('[PushService] Registration ready')
      
      const existingSubscription = await registration.pushManager.getSubscription()
      if (existingSubscription) {
        console.log('[PushService] Found existing subscription, checking if valid')
        const subscriptionData: PushSubscriptionData = {
          endpoint: existingSubscription.endpoint,
          keys: {
            p256dh: (existingSubscription as unknown as { keys: { p256dh: string; auth: string } }).keys?.p256dh || '',
            auth: (existingSubscription as unknown as { keys: { p256dh: string; auth: string } }).keys?.auth || '',
          },
        }
        
        try {
          await savePushSubscription(userId, subscriptionData)
          console.log('[PushService] Existing subscription synced')
          return subscriptionData
        } catch {
          console.log('[PushService] Existing subscription invalid, creating new one')
          await existingSubscription.unsubscribe()
        }
      }

      console.log('[PushService] About to subscribe to push manager')
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey as unknown as BufferSource,
      })
      console.log('[PushService] Push subscription created, endpoint:', subscription.endpoint)

      const subscriptionData: PushSubscriptionData = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: (subscription as unknown as { keys: { p256dh: string; auth: string } }).keys?.p256dh || '',
          auth: (subscription as unknown as { keys: { p256dh: string; auth: string } }).keys?.auth || '',
        },
      }
      console.log('[PushService] Subscription data prepared')

      await savePushSubscription(userId, subscriptionData)
      console.log('[PushService] Push subscription successful')
      return subscriptionData
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      console.error(`[PushService] Attempt ${attempt + 1} failed:`, lastError.message)
      
      if (attempt < maxRetries - 1) {
        const delay = retryDelay * Math.pow(2, attempt)
        console.log(`[PushService] Retrying in ${delay}ms...`)
        await sleep(delay)
      }
    }
  }

  console.error('[PushService] All retry attempts failed:', lastError?.message)
  return null
}

export async function unsubscribeFromPush(userId: string): Promise<void> {
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (subscription) {
      const endpoint = subscription.endpoint
      await subscription.unsubscribe()
      await removePushSubscription(userId, endpoint)
      console.log('[PushService] Unsubscribed from push')
    } else {
      console.log('[PushService] No active subscription to unsubscribe')
      await removePushSubscription(userId, '')
    }
  } catch (err) {
    console.error('[PushService] Error unsubscribing from push:', err)
  }
}

export function isPushSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window
}

export function isPermissionGranted(): boolean {
  return typeof window !== 'undefined' && Notification.permission === 'granted'
}

export async function setupInAppNotifications(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false
  }

  if (Notification.permission === 'granted') {
    console.log('[PushService] In-app notifications ready')
    return true
  }

  if (Notification.permission !== 'denied') {
    try {
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        console.log('[PushService] In-app notifications permission granted')
        return true
      }
    } catch (err) {
      console.error('[PushService] Error requesting notification permission:', err)
    }
  }

  return false
}

export function showInAppNotification(title: string, body?: string): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return

  if (Notification.permission === 'granted') {
    try {
      new Notification(title, {
        icon: '/findMeLogo.svg',
        badge: '/findMeLogo.svg',
        body: body,
        tag: 'findme-notification',
        requireInteraction: false,
      })
    } catch (err) {
      console.error('[PushService] Error showing notification:', err)
    }
  }
}