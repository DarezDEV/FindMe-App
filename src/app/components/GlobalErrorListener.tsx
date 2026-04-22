import { useEffect, useRef } from 'react'
import { handleError } from '../../shared/utils/handleError'

const TOAST_COOLDOWN_MS = 7000

function shouldToast(lastToastAt: number) {
  return Date.now() - lastToastAt >= TOAST_COOLDOWN_MS
}

export function GlobalErrorListener() {
  const lastToastAt = useRef(0)

  useEffect(() => {
    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const toast = import.meta.env.PROD && shouldToast(lastToastAt.current)
      if (toast) lastToastAt.current = Date.now()

      handleError('Global.unhandledrejection', event.reason, {
        fallbackMessage: 'Ocurrió un error inesperado. Intenta recargar la página.',
        toast,
      })
    }

    const onError = (event: ErrorEvent) => {
      const toast = import.meta.env.PROD && shouldToast(lastToastAt.current)
      if (toast) lastToastAt.current = Date.now()

      handleError('Global.error', event.error ?? event.message, {
        fallbackMessage: 'Ocurrió un error inesperado. Intenta recargar la página.',
        toast,
      })
    }

    window.addEventListener('unhandledrejection', onUnhandledRejection)
    window.addEventListener('error', onError)

    return () => {
      window.removeEventListener('unhandledrejection', onUnhandledRejection)
      window.removeEventListener('error', onError)
    }
  }, [])

  return null
}

