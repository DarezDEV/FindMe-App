import { useEffect, useRef } from 'react'
import { sileo } from 'sileo'

interface AlertProps {
  type: 'error' | 'success' | 'warning' | 'info'
  message: string
  mode?: 'toast' | 'inline'
  title?: string
  duration?: number | null
}

const DEFAULT_TITLES = {
  error: 'Error',
  success: 'Exito',
  warning: 'Advertencia',
  info: 'Informacion',
} as const

const DEFAULT_DURATIONS = {
  error: 5500,
  warning: 8500,
  info: 7500,
  success: 7000,
} as const

const MIN_READING_BUFFER_MS = 2500
const MAX_AUTO_DURATION_MS = 15000
const MS_PER_WORD = 320

const getAutoDuration = (
  type: AlertProps['type'],
  message: string,
  customDuration?: number | null,
) => {
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

const INLINE_STYLES = {
  error: 'bg-error/8 border-error/25 text-error',
  success: 'bg-success/8 border-success/25 text-success',
  warning: 'bg-warning/8 border-warning/25 text-warning',
  info: 'bg-info/8 border-info/25 text-info',
} as const

export function Alert({ type, message, mode = 'toast', title, duration }: AlertProps) {
  const dismissTimerRef = useRef<number | null>(null)

  useEffect(() => {
    if (mode !== 'toast' || !message) {
      return
    }

    const resolvedTitle = title ?? DEFAULT_TITLES[type]
    const resolvedDuration = getAutoDuration(type, message, duration)

    const showToast = {
      error: sileo.error,
      success: sileo.success,
      warning: sileo.warning,
      info: sileo.info,
    }[type]

    const toastId = showToast({
      title: resolvedTitle,
      description: message,
      duration: resolvedDuration,
    })

    if (dismissTimerRef.current !== null) {
      window.clearTimeout(dismissTimerRef.current)
    }

    dismissTimerRef.current = window.setTimeout(() => {
      sileo.dismiss(toastId)
      dismissTimerRef.current = null
    }, resolvedDuration)

    return () => {
      if (dismissTimerRef.current !== null) {
        window.clearTimeout(dismissTimerRef.current)
        dismissTimerRef.current = null
      }
    }
  }, [mode, type, message, title, duration])

  if (mode === 'toast') {
    return null
  }

  return (
    <div className={`border text-sm px-4 py-3 rounded-lg ${INLINE_STYLES[type]}`}>
      {message}
    </div>
  )
}
