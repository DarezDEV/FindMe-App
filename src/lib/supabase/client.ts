import { createClient, processLock } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check your .env file.')
}

const createSupabaseClient = () =>
  createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      // Avoid flaky Web Locks deadlocks (NavigatorLockAcquireTimeoutError) in browser dev sessions.
      lock: processLock,
    },
  })

type SupabaseClientInstance = ReturnType<typeof createSupabaseClient>

declare global {
  var __findme_supabase__: SupabaseClientInstance | undefined
}

export const supabase = globalThis.__findme_supabase__ ?? createSupabaseClient()

if (import.meta.env.DEV) {
  globalThis.__findme_supabase__ = supabase
}
