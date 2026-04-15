import { Component, type ReactNode } from 'react'
import { getErrorMessage, logError } from '../../shared/utils/errors'

interface AppErrorBoundaryProps {
  children: ReactNode
}

interface AppErrorBoundaryState {
  hasError: boolean
  message: string
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    hasError: false,
    message: '',
  }

  static getDerivedStateFromError(error: unknown): AppErrorBoundaryState {
    return {
      hasError: true,
      message: getErrorMessage(error, 'Ocurrió un error inesperado. Intenta recargar la página.'),
    }
  }

  componentDidCatch(error: unknown, info: unknown) {
    logError('AppErrorBoundary', error, { info })
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <div className="card p-8 max-w-lg w-full space-y-4">
          <h1 className="text-lg font-bold text-text-primary">Ocurrió un error</h1>
          <p className="text-sm text-text-secondary">{this.state.message}</p>
          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="btn-primary"
            >
              Recargar
            </button>
            <a href="/" className="btn-secondary">
              Ir al inicio
            </a>
          </div>
        </div>
      </div>
    )
  }
}

