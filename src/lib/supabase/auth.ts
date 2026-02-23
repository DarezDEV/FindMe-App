import { supabase } from './client'

export interface RegisterData {
  name: string
  last_name: string
  email: string
  password: string
}

export interface LoginData {
  email: string
  password: string
}

// ─── Mapeo de errores de Supabase → español ───────────────────────────────────
function mapAuthError(message: string): string {
  const msg = message.toLowerCase()

  if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
    return 'Correo electrónico o contraseña incorrectos.'
  }
  if (msg.includes('email not confirmed')) {
    return 'Debes confirmar tu correo antes de iniciar sesión.'
  }
  if (msg.includes('user already registered') || msg.includes('already been registered')) {
    return 'Ya existe una cuenta con ese correo electrónico.'
  }
  if (msg.includes('password should be at least')) {
    return 'La contraseña debe tener al menos 6 caracteres.'
  }
  if (msg.includes('unable to validate email address')) {
    return 'El correo electrónico ingresado no es válido.'
  }
  if (msg.includes('too many requests') || msg.includes('rate limit')) {
    return 'Demasiados intentos fallidos. Espera unos minutos e intenta de nuevo.'
  }
  if (msg === 'timeout') {
    return 'El servidor tardó demasiado en responder. Verifica tu conexión e intenta de nuevo.'
  }

  return message || 'Ocurrió un error inesperado. Intenta de nuevo.'
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function withTimeout<T>(promise: Promise<T>, ms = 8000): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Timeout')), ms)
  )
  return Promise.race([promise, timeout])
}

// ─── Auth functions ───────────────────────────────────────────────────────────

/**
 * Registra un nuevo usuario.
 * El perfil y el rol se crean automáticamente via trigger en Supabase.
 */
export async function registerUser({ name, last_name, email, password }: RegisterData) {
  const { data, error } = await withTimeout(
    supabase.auth.signUp({
      email,
      password,
      options: { data: { name, last_name } },
    })
  )

  if (error) throw new Error(mapAuthError(error.message))
  return data
}

/** Inicia sesión con email y contraseña */
export async function loginUser({ email, password }: LoginData) {
  const { data, error } = await withTimeout(
    supabase.auth.signInWithPassword({ email, password })
  )

  if (error) throw new Error(mapAuthError(error.message))
  return data
}

/** Cierra la sesión actual */
export async function logoutUser() {
  const { error } = await supabase.auth.signOut()
  if (error) throw new Error(mapAuthError(error.message))
}

/** Obtiene la sesión activa (puede ser null) */
export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw new Error(mapAuthError(error.message))
  return data.session
}