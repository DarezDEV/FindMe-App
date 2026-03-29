import { useEffect } from 'react'
import { showAppToast } from './toast'

interface AlertProps {
  type: 'error' | 'success' | 'warning' | 'info'
  message: string
  mode?: 'toast' | 'inline'
  title?: string
  duration?: number | null
}

const INLINE_STYLES = {
  error: 'bg-error/8 border-error/25 text-error',
  success: 'bg-success/8 border-success/25 text-success',
  warning: 'bg-warning/8 border-warning/25 text-warning',
  info: 'bg-info/8 border-info/25 text-info',
} as const

export function Alert({ type, message, mode = 'toast', title, duration }: AlertProps) {
  useEffect(() => {
    if (mode !== 'toast' || !message) {
      return
    }

    showAppToast(type, message, { title, duration })
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
