// supabase/functions/send-push/index.ts
// Edge Function para enviar notificaciones push de prueba

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webPush from 'https://esm.sh/web-push@3.6.7?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const jsonResponse = (status: number, payload: Record<string, unknown>) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

const VAPID_SUBJECT = 'mailto:findme@example.com'

function getVapidKeys(): { publicKey: string; privateKey: string } | null {
  const publicKey = Deno.env.get('VAPID_PUBLIC_KEY')
  const privateKey = Deno.env.get('VAPID_PRIVATE_KEY')
  if (!publicKey || !privateKey) return null
  return { publicKey, privateKey }
}

function setVapidKeys(publicKey: string, privateKey: string) {
  webPush.setVapidDetails(VAPID_SUBJECT, publicKey, privateKey)
}

async function getPushSubscriptions(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<Array<{ endpoint: string; p256dh_key: string; auth_key: string }>> {
  const { data } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh_key, auth_key')
    .eq('user_id', userId)
  return data || []
}

async function sendWebPushNotification(endpoint: string, p256dhKey: string, authKey: string, title: string, body: string) {
  const vapidKeys = getVapidKeys()
  if (!vapidKeys) return { success: false, error: 'VAPID not configured' }

  setVapidKeys(vapidKeys.publicKey, vapidKeys.privateKey)

  try {
    await webPush.sendNotification(
      { endpoint, keys: { p256dh: p256dhKey, auth: authKey } },
      JSON.stringify({ title, body }),
      { TTL: 60 * 60 * 24 }
    )
    return { success: true }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !supabaseServiceKey) {
    return jsonResponse(500, { error: 'Config error' })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const url = new URL(req.url)
  const action = url.pathname.split('/').pop()

  try {
    // GET /public-key - returns VAPID public key
    if (action === 'public-key') {
      const vapidKeys = getVapidKeys()
      if (!vapidKeys) {
        return jsonResponse(503, { error: 'Push not configured' })
      }
      return jsonResponse(200, { publicKey: vapidKeys.publicKey })
    }

    // Endpoint de prueba: /send-push/test
    if (action === 'test' && req.method === 'POST') {
      const { userId, title, body } = await req.json().catch(() => ({}))

      console.log('[test] Received test request for userId:', userId, 'title:', title)

      if (!userId) {
        return jsonResponse(400, { error: 'userId is required' })
      }

      const subscriptions = await getPushSubscriptions(supabase, userId)
      console.log('[test] Found subscriptions:', subscriptions.length)

      if (subscriptions.length === 0) {
        return jsonResponse(404, { error: 'No push subscriptions for this user' })
      }

      const results = await Promise.all(
        subscriptions.map((sub) =>
          sendWebPushNotification(
            sub.endpoint,
            sub.p256dh_key,
            sub.auth_key,
            title || 'Test Push',
            body || 'This is a test notification from FindMe!'
          )
        )
      )

      const successful = results.filter((r) => r.success).length
      console.log('[test] Sent:', successful, 'results:', results)

      return jsonResponse(200, { sent: successful, failed: results.length - successful })
    }

    return jsonResponse(404, { error: 'Not found' })
  } catch (error) {
    return jsonResponse(500, { error: String(error) })
  }
})