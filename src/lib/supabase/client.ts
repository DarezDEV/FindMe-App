import { createClient } from '@supabase/supabase-js'

const DEFAULT_SUPABASE_URL = 'https://your-project.supabase.co'
const DEFAULT_SUPABASE_ANON_KEY = 'your-anon-key'

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ?? ''
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? ''

const hasMissingEnv = !supabaseUrl || !supabaseAnonKey
const hasPlaceholderEnv =
  supabaseUrl === DEFAULT_SUPABASE_URL || supabaseAnonKey === DEFAULT_SUPABASE_ANON_KEY

if (hasMissingEnv || hasPlaceholderEnv) {
  throw new Error(
    'Invalid Supabase environment variables. Set real values in .env for VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then restart the Vite dev server.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
