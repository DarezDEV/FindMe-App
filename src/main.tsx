import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element not found.')
}

const root = createRoot(rootElement)

async function bootstrap() {
  try {
    const { default: App } = await import('./app/App')
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected initialization error.'
    console.error('[Bootstrap] Application failed to start:', err)

    root.render(
      <StrictMode>
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="card p-6 max-w-lg w-full space-y-3">
            <h1 className="text-lg font-semibold text-error">Error al iniciar la aplicacion</h1>
            <p className="text-sm text-text-secondary">{message}</p>
            <p className="text-sm text-text-secondary">
              Verifica tu archivo <code>.env</code> con <code>VITE_SUPABASE_URL</code> y
              <code> VITE_SUPABASE_ANON_KEY</code>.
            </p>
          </div>
        </div>
      </StrictMode>,
    )
  }
}

void bootstrap()
