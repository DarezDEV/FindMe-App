import { StrictMode } from 'react'
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRoot } from 'react-dom/client'
import 'sileo/styles.css'
import './index.css'
import { logError } from './shared/utils/errors'

const rootElement = document.getElementById('root')
const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      logError('ReactQuery.query', error, { queryKey: query.queryKey })
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      logError('ReactQuery.mutation', error, { mutationKey: mutation.options.mutationKey ?? null })
    },
  }),
})

if (!rootElement) {
  throw new Error('Root element not found.')
}

const root = createRoot(rootElement)

async function bootstrap() {
  try {
    const { default: App } = await import('./app/App')
    root.render(
      <StrictMode>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
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
