export type ErrorKind =
  | 'network'
  | 'timeout'
  | 'auth'
  | 'permission'
  | 'not_found'
  | 'conflict'
  | 'validation'
  | 'unknown'

type ErrorLike = {
  message?: unknown
  code?: unknown
  details?: unknown
  hint?: unknown
  status?: unknown
  name?: unknown
}

function getString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function getNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  return null
}

function readErrorLikeFields(error: unknown) {
  if (!error || typeof error !== 'object') {
    return { message: null, code: null, status: null, details: null, hint: null, name: null }
  }

  const candidate = error as ErrorLike
  return {
    message: getString(candidate.message),
    code: getString(candidate.code),
    status: getNumber(candidate.status),
    details: getString(candidate.details),
    hint: getString(candidate.hint),
    name: getString(candidate.name),
  }
}

function isOffline() {
  return typeof navigator !== 'undefined' && navigator.onLine === false
}

function isNetworkErrorMessage(message: string) {
  const lower = message.toLowerCase()
  return (
    lower.includes('failed to fetch') ||
    lower.includes('fetch failed') ||
    lower.includes('network request failed') ||
    lower.includes('networkerror') ||
    lower.includes('err_network') ||
    lower.includes('internet_disconnected') ||
    lower.includes('econnrefused') ||
    lower.includes('enotfound') ||
    lower.includes('etimedout') ||
    lower.includes('socket') ||
    lower.includes('connection') && lower.includes('closed')
  )
}

function isTimeoutMessage(message: string) {
  const lower = message.toLowerCase()
  return (
    lower === 'timeout' ||
    lower.startsWith('timeout:') ||
    lower.includes('timed out') ||
    lower.includes('aborterror') ||
    lower.includes('the user aborted a request') ||
    lower.includes('el servidor tardó demasiado')
  )
}

function mapPostgresLikeError(code: string | null, message: string) {
  const lower = message.toLowerCase()

  if (
    code === '42501' ||
    lower.includes('row-level security') ||
    lower.includes('row level security') ||
    lower.includes('permission denied')
  ) {
    return { kind: 'permission' as const, message: 'No tienes permisos para realizar esta acción.' }
  }

  if (
    lower.includes('jwt expired') ||
    lower.includes('invalid jwt') ||
    lower.includes('session expired') ||
    lower.includes('not authenticated')
  ) {
    return { kind: 'auth' as const, message: 'Tu sesión expiró. Inicia sesión nuevamente.' }
  }

  if (code === '23505' || lower.includes('duplicate key') || lower.includes('unique constraint')) {
    return { kind: 'conflict' as const, message: 'Ya existe un registro con esa información.' }
  }

  if (code === '23503' || lower.includes('foreign key')) {
    return {
      kind: 'validation' as const,
      message: 'No se pudo vincular la información. Verifica los datos e intenta nuevamente.',
    }
  }

  if (lower.includes('no rows') || lower.includes('not found')) {
    return { kind: 'not_found' as const, message: 'No se encontró la información solicitada.' }
  }

  if (code === '42P01' || (lower.includes('relation') && lower.includes('does not exist'))) {
    return {
      kind: 'unknown' as const,
      message: 'El servidor no tiene configurada esta funcionalidad. Contacta al administrador.',
    }
  }

  if (code === '42703' || (lower.includes('column') && lower.includes('does not exist'))) {
    return {
      kind: 'unknown' as const,
      message: 'La aplicación está desactualizada. Recarga la página e intenta nuevamente.',
    }
  }

  return null
}

function isSafeUserMessage(message: string) {
  const lower = message.toLowerCase()
  const technicalTokens = [
    'postgrest',
    'supabase',
    'sql',
    'relation',
    'column',
    'constraint',
    'violates',
    'schema',
    'jwt',
    'row-level security',
    'permission denied',
    'foreign key',
    'duplicate key',
  ]

  return !technicalTokens.some((token) => lower.includes(token))
}

export class AppError extends Error {
  readonly kind: ErrorKind
  readonly context: string | null
  readonly code: string | null
  readonly status: number | null
  readonly details: string | null

  constructor(
    message: string,
    options: {
      kind?: ErrorKind
      context?: string | null
      code?: string | null
      status?: number | null
      details?: string | null
      cause?: unknown
    } = {},
  ) {
    super(message, options.cause ? { cause: options.cause } : undefined)
    this.name = 'AppError'
    this.kind = options.kind ?? 'unknown'
    this.context = options.context ?? null
    this.code = options.code ?? null
    this.status = options.status ?? null
    this.details = options.details ?? null
  }
}

export function normalizeError(
  error: unknown,
  fallbackMessage = 'Ocurrió un error inesperado. Inténtalo nuevamente.',
): { kind: ErrorKind; message: string; code: string | null; status: number | null; details: string | null } {
  if (error instanceof AppError) {
    return {
      kind: error.kind,
      message: error.message,
      code: error.code,
      status: error.status,
      details: error.details,
    }
  }

  if (isOffline()) {
    return {
      kind: 'network',
      message: 'No hay conexión a internet. Verifica tu red e inténtalo nuevamente.',
      code: null,
      status: null,
      details: null,
    }
  }

  const errorMessage = error instanceof Error ? getString(error.message) : null
  const fields = readErrorLikeFields(error)
  const message = errorMessage ?? fields.message ?? (typeof error === 'string' ? error : null)
  const code = fields.code
  const status = fields.status
  const details = fields.details ?? fields.hint

  if (!message) {
    return { kind: 'unknown', message: fallbackMessage, code, status, details }
  }

  if (isTimeoutMessage(message)) {
    return {
      kind: 'timeout',
      message: 'El servidor tardó demasiado en responder. Inténtalo nuevamente.',
      code,
      status,
      details,
    }
  }

  if (isNetworkErrorMessage(message)) {
    return {
      kind: 'network',
      message: 'No se pudo conectar con el servidor. Verifica tu conexión e inténtalo nuevamente.',
      code,
      status,
      details,
    }
  }

  if (status === 401) {
    return { kind: 'auth', message: 'Tu sesión expiró. Inicia sesión nuevamente.', code, status, details }
  }

  if (status === 403) {
    return { kind: 'permission', message: 'No tienes permisos para realizar esta acción.', code, status, details }
  }

  const mapped = mapPostgresLikeError(code, message)
  if (mapped) {
    return { kind: mapped.kind, message: mapped.message, code, status, details }
  }

  if (isSafeUserMessage(message)) {
    return { kind: 'unknown', message, code, status, details }
  }

  return { kind: 'unknown', message: fallbackMessage, code, status, details }
}

export function getErrorMessage(error: unknown, fallbackMessage?: string) {
  return normalizeError(error, fallbackMessage).message
}

export function toAppError(error: unknown, fallbackMessage: string, context?: string): AppError {
  if (error instanceof AppError) return error

  const normalized = normalizeError(error, fallbackMessage)
  return new AppError(normalized.message, {
    kind: normalized.kind,
    context: context ?? null,
    code: normalized.code,
    status: normalized.status,
    details: normalized.details,
    cause: error,
  })
}

export function logError(context: string, error: unknown, extras: Record<string, unknown> = {}) {
  const normalized = normalizeError(error)
  const payload = {
    context,
    kind: normalized.kind,
    message: normalized.message,
    code: normalized.code,
    status: normalized.status,
    details: normalized.details,
    ...extras,
  }

  console.error(`[${context}]`, payload, error)
}
