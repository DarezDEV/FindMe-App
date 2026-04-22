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

export type PasswordSetupTokenType = 'recovery' | 'invite'

// ─── Mapeo de errores de Supabase → español ───────────────────────────────────
const mapAuthError = (message: string): string => {
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
  if (
    msg.includes('over_email_send_rate_limit') ||
    msg.includes('email rate limit exceeded') ||
    msg.includes('for security purposes')
  ) {
    return 'Ya enviamos un correo hace poco. Espera 60 segundos antes de intentar de nuevo.'
  }
  if (msg.includes('invalid grant')) {
    return 'Correo electrónico o contraseña incorrectos.'
  }
  if (msg.includes('otp') || msg.includes('token') || msg.includes('expired')) {
    return 'El código es inválido o ha expirado. Solicita uno nuevo.'
  }
  if (msg === 'timeout') {
    return 'El servidor tardó demasiado en responder. Verifica tu conexión e intenta de nuevo.'
  }

  return message || 'Ocurrió un error inesperado. Intenta de nuevo.'
}

const mapUnexpectedAuthError = (err: unknown): string => {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return 'No hay conexión a internet. Verifica tu red e intenta de nuevo.'
  }

  if (err instanceof Error) {
    const msg = err.message.toLowerCase()
    if (
      msg.includes('failed to fetch') ||
      msg.includes('networkerror') ||
      msg.includes('internet_disconnected')
    ) {
      return 'No se pudo conectar con el servidor. Verifica tu conexión a internet.'
    }

    return mapAuthError(err.message)
  }

  return 'Ocurrió un error inesperado. Intenta de nuevo.'
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const withTimeout = async <T>(promise: Promise<T>, ms = 8000): Promise<T> => {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Timeout')), ms)
  )
  return Promise.race([promise, timeout])
}

// ─── Auth functions ───────────────────────────────────────────────────────────

/**
 * Registra un nuevo usuario y cierra la sesión automática.
 * El perfil y el rol se crean automáticamente via trigger en Supabase.
 * El usuario deberá verificar su correo con OTP antes de iniciar sesión.
 */
export async function registerUser({ name, last_name, email, password }: RegisterData) {
  try {
    const { data, error } = await withTimeout(
      supabase.auth.signUp({
        email,
        password,
        options: { data: { name, last_name } },
      }),
    )

    if (error) throw error

    // Cerrar sesión inmediatamente — el usuario debe verificar su correo primero
    const { error: signOutError } = await supabase.auth.signOut()
    if (signOutError) throw signOutError

    return data
  } catch (err) {
    throw new Error(mapUnexpectedAuthError(err))
  }
}

/**
 * Verifica el código OTP de 6 dígitos enviado al correo del usuario.
 * Si es correcto, Supabase confirma la cuenta y crea la sesión automáticamente.
 */
export async function verifyEmailOtp(email: string, token: string) {
  try {
    const { data, error } = await withTimeout(
      supabase.auth.verifyOtp({
        email,
        token,
        type: 'signup',
      }),
    )

    if (error) throw error

    return data
  } catch (err) {
    throw new Error(mapUnexpectedAuthError(err))
  }
}

/**
 * Reenvía el código OTP al correo del usuario.
 */
export async function resendVerificationOtp(email: string) {
  try {
    const { error } = await withTimeout(
      supabase.auth.resend({
        type: 'signup',
        email,
      }),
    )

    if (error) throw error
  } catch (err) {
    throw new Error(mapUnexpectedAuthError(err))
  }
}

/** Envía un enlace de recuperación de contraseña al correo del usuario */
export async function sendPasswordResetEmail(email: string) {
  try {
    const redirectTo = `${window.location.origin}/reset-password`
    const { error } = await withTimeout(
      supabase.auth.resetPasswordForEmail(email, { redirectTo }),
      12000,
    )

    if (error) throw error
  } catch (err) {
    throw new Error(mapUnexpectedAuthError(err))
  }
}

/** Intercambia el `code` del enlace por una sesión válida (flujo PKCE) */
export async function exchangeRecoveryCode(code: string) {
  try {
    const { data, error } = await withTimeout(
      supabase.auth.exchangeCodeForSession(code),
    )

    if (error) throw error
    return data
  } catch (err) {
    throw new Error(mapUnexpectedAuthError(err))
  }
}

/** Verifica token_hash de recuperacion/invitacion y crea sesion temporal */
export async function verifyPasswordSetupToken(
  tokenHash: string,
  type: PasswordSetupTokenType
) {
  try {
    const { data, error } = await withTimeout(
      supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type,
      }),
    )

    if (error) throw error
    return data
  } catch (err) {
    throw new Error(mapUnexpectedAuthError(err))
  }
}

/** Actualiza la contraseña del usuario autenticado */
export async function setSessionFromTokens(accessToken: string, refreshToken: string) {
  try {
    const { data, error } = await withTimeout(
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      }),
      12000,
    )

    if (error) throw error
    return data
  } catch (err) {
    throw new Error(mapUnexpectedAuthError(err))
  }
}
export async function updateUserPassword(password: string) {
  try {
    const { data, error } = await withTimeout(
      supabase.auth.updateUser({ password }),
    )

    if (error) throw error
    return data
  } catch (err) {
    throw new Error(mapUnexpectedAuthError(err))
  }
}

/** Inicia sesión con email y contraseña */
export async function loginUser({ email, password }: LoginData) {
  try {
    const { data, error } = await withTimeout(
      supabase.auth.signInWithPassword({ email, password })
    )

    if (error) throw error
    return data
  } catch (err) {
    throw new Error(mapUnexpectedAuthError(err))
  }
}

/** Cierra la sesión actual */
export async function logoutUser() {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  } catch (err) {
    throw new Error(mapUnexpectedAuthError(err))
  }
}

/** Obtiene la sesión activa (puede ser null) */
export async function getCurrentSession() {
  try {
    const { data, error } = await supabase.auth.getSession()
    if (error) throw error
    return data.session
  } catch (err) {
    throw new Error(mapUnexpectedAuthError(err))
  }
}

