/**
 * Traduce errores de Supabase Auth al español para mostrarlos al usuario.
 */
export function translateAuthError(message: string): string {
  const map: Record<string, string> = {
    'Invalid login credentials': 'Correo o contraseña incorrectos.',
    'Email not confirmed': 'Debes confirmar tu correo antes de iniciar sesión.',
    'User already registered': 'Ya existe una cuenta con este correo.',
    'Password should be at least 6 characters': 'La contraseña debe tener al menos 6 caracteres.',
    'Unable to validate email address: invalid format':
      'El formato del correo electrónico no es válido.',
    'Email rate limit exceeded':
      'Demasiados intentos. Por favor espera unos minutos.',
    'Too many requests': 'Demasiadas solicitudes. Intenta más tarde.',
  }

  for (const [key, value] of Object.entries(map)) {
    if (message.includes(key)) return value
  }

  return message
}