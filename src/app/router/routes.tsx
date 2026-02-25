import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import { RoleRoute } from './RoleRoute'
import { GuestRoute } from './GuestRoute'
import { useAuth } from '../providers/AuthProvider'
import { Spinner } from '../../shared/components/ui'
import { ROLES } from '../../shared/constants/roles'

import LoginPage from '../../features/auth/pages/LoginPage'
import RegisterPage from '../../features/auth/pages/RegisterPage'
import UserHome from '../../features/user/pages/UserHome'
import PublicarPersonaPerdidaPage from '../../features/user/pages/PublicarPersonaPerdidaPage'
import CasoDetallePage from '../../features/user/pages/CasoDetallePage'
import AdminHome from '../../features/admin/pages/AdminHome'
import AuthorityHome from '../../features/authority/pages/AuthorityHome'

function HomeRedirect() {
  const { user, loading } = useAuth()

  if (loading) return <Spinner fullScreen />
  if (!user) return <Navigate to="/login" replace />
  if (user.roles.includes(ROLES.ADMIN)) return <Navigate to="/admin" replace />
  if (user.roles.includes(ROLES.AUTHORITY)) return <Navigate to="/authority" replace />
  return <Navigate to="/user" replace />
}

function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="card p-10 text-center max-w-sm w-full space-y-4">
        <div className="w-14 h-14 bg-error/10 rounded-2xl flex items-center justify-center mx-auto">
          <svg className="w-7 h-7 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-text-primary">Acceso no autorizado</h2>
        <p className="text-text-secondary text-sm">No tienes permisos para ver esta pagina.</p>
        <a href="/" className="inline-block text-primary hover:text-primary-hover text-sm font-medium transition-colors">
          Volver al inicio
        </a>
      </div>
    </div>
  )
}

const router = createBrowserRouter([
  {
    element: <GuestRoute />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
    ],
  },
  { path: '/unauthorized', element: <UnauthorizedPage /> },

  {
    element: <RoleRoute allowedRoles={[ROLES.USER]} />,
    children: [
      { path: '/user', element: <UserHome /> },
      { path: '/publicar', element: <PublicarPersonaPerdidaPage /> },
      { path: '/reportar', element: <Navigate to="/publicar" replace /> },
      { path: '/mis-casos', element: <Navigate to="/user" replace /> },
      { path: '/notificaciones', element: <Navigate to="/user" replace /> },
      { path: '/mensajes', element: <Navigate to="/user" replace /> },
      { path: '/mapa', element: <Navigate to="/user" replace /> },
      { path: '/donar', element: <Navigate to="/user" replace /> },
      { path: '/perfil', element: <Navigate to="/user" replace /> },
      { path: '/configuracion', element: <Navigate to="/user" replace /> },
      { path: '/caso/:id', element: <CasoDetallePage /> },
    ],
  },

  {
    element: <RoleRoute allowedRoles={[ROLES.ADMIN]} />,
    children: [{ path: '/admin', element: <AdminHome /> }],
  },

  {
    element: <RoleRoute allowedRoles={[ROLES.AUTHORITY, ROLES.ADMIN]} />,
    children: [{ path: '/authority', element: <AuthorityHome /> }],
  },

  { path: '/', element: <HomeRedirect /> },
  { path: '*', element: <HomeRedirect /> },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
