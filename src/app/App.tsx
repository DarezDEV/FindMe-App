import { AuthProvider } from './providers/AuthProvider' 
import { AppRouter } from './router/Routes' 

function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  )
}

export default App