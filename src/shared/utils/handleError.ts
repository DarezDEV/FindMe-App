import { appToast, type AppToastType } from '../components/ui'
import { getErrorMessage, logError } from './errors'

export function handleError(
  context: string,
  error: unknown,
  options: {
    fallbackMessage: string
    toast?: boolean
    toastType?: AppToastType
    toastTitle?: string
    extra?: Record<string, unknown>
  },
): string {
  const message = getErrorMessage(error, options.fallbackMessage)

  logError(context, error, options.extra ?? {})

  if (options.toast !== false) {
    const type: AppToastType = options.toastType ?? 'error'
    appToast[type](message, options.toastTitle ? { title: options.toastTitle } : undefined)
  }

  return message
}

