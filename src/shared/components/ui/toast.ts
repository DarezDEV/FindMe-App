import { sileo } from 'sileo'

export type AppToastType = 'error' | 'success' | 'warning' | 'info'

interface AppToastOptions {
  title?: string
  duration?: number | null
}

const DEFAULT_TITLES: Record<AppToastType, string> = {
  error: 'Error',
  success: 'Exito',
  warning: 'Advertencia',
  info: 'Informacion',
}

const DEFAULT_DURATIONS: Record<AppToastType, number> = {
  error: 5500,
  warning: 8500,
  info: 7500,
  success: 7000,
}

const MIN_READING_BUFFER_MS = 2500
const MAX_AUTO_DURATION_MS = 15000
const MS_PER_WORD = 320

function getAutoDuration(type: AppToastType, message: string, customDuration?: number | null) {
  if (typeof customDuration === 'number') {
    return customDuration
  }

  const words = message.trim().split(/\s+/).filter(Boolean).length
  const estimatedReadingMs = words * MS_PER_WORD + MIN_READING_BUFFER_MS

  return Math.min(
    MAX_AUTO_DURATION_MS,
    Math.max(DEFAULT_DURATIONS[type], estimatedReadingMs),
  )
}

export function showAppToast(type: AppToastType, message: string, options: AppToastOptions = {}) {
  if (!message.trim()) return null

  const showToast = {
    error: sileo.error,
    success: sileo.success,
    warning: sileo.warning,
    info: sileo.info,
  }[type]

  return showToast({
    title: options.title ?? DEFAULT_TITLES[type],
    description: message,
    duration: getAutoDuration(type, message, options.duration),
  })
}

export const appToast = {
  error(message: string, options?: AppToastOptions) {
    return showAppToast('error', message, options)
  },
  success(message: string, options?: AppToastOptions) {
    return showAppToast('success', message, options)
  },
  warning(message: string, options?: AppToastOptions) {
    return showAppToast('warning', message, options)
  },
  info(message: string, options?: AppToastOptions) {
    return showAppToast('info', message, options)
  },
}
