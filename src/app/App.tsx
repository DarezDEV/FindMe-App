import { AuthProvider } from './providers/AuthProvider' 
import { AppRouter } from './router/routes' 

function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  )
}

export default App
