function requiredEnv(name: 'VITE_SUPABASE_URL' | 'VITE_SUPABASE_ANON_KEY') {
  const value = import.meta.env[name]

  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

export const supabaseConfig = {
  url: requiredEnv('VITE_SUPABASE_URL'),
  anonKey: requiredEnv('VITE_SUPABASE_ANON_KEY'),
} as const
