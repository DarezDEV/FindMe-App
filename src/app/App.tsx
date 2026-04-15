import { Toaster } from 'sileo'
import { AuthProvider } from './providers/AuthProvider'
import { AppRouter } from './router/routes'
import { CasesRealtimeProvider } from '../features/cases/components/CasesRealtimeProvider'
import { NotificationsProvider } from '../features/notifications/components/NotificationsProvider'
import { AppErrorBoundary } from './components/AppErrorBoundary'
import { GlobalErrorListener } from './components/GlobalErrorListener'

function App() {
  return (
    <AppErrorBoundary>
      <AuthProvider>
        <GlobalErrorListener />
        <CasesRealtimeProvider>
          <NotificationsProvider>
            <AppRouter />
          </NotificationsProvider>
        </CasesRealtimeProvider>
        <Toaster
          position="top-right"
          offset={{ top: 20, right: 20 }}
          theme="light"
          options={{
            duration: 5500,
            // Radio consistente con rounded-2xl del card del sistema (16px)
            roundness: 16,
            // Fondo blanco limpio — igual que --color-card
            fill: '#ffffff',
            autopilot: {
              expand: 0,
              collapse: 999999,
            },
          }}
        />
      </AuthProvider>
    </AppErrorBoundary>
  )
}

export default App
