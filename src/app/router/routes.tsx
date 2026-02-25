import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { RoleRoute } from './RoleRoute'
import { GuestRoute } from './GuestRoute'
import { ROLES } from '../../shared/constants/roles'

import LoginPage from '../../features/auth/pages/LoginPage'
import RegisterPage from '../../features/auth/pages/RegisterPage'
import UserHome from '../../features/user/pages/UserHome'
import AdminHome from '../../features/admin/pages/AdminHome'
import AuthorityHome from '../../features/authority/pages/AuthorityHome'
import AuthorityCases from '../../features/authority/pages/AuthorityCases'

function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="card p-10 text-center max-w-sm w-full space-y-4">
        <div className="w-14 h-14 bg-error/10 rounded-2xl flex items-center justify-center mx-auto">
          <svg className="w-7 h-7 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-text-primary">Acceso no autorizado</h2>
        <p className="text-text-secondary text-sm">No tienes permisos para ver esta pÃ¡gina.</p>
        <a href="/" className="inline-block text-primary hover:text-primary-hover text-sm font-medium transition-colors">
          â† Volver al inicio
        </a>
      </div>
    </div>
  )
}

const router = createBrowserRouter([
  // PÃºblicas (solo usuarios NO autenticados)
  {
    element: <GuestRoute />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
    ],
  },
  { path: '/unauthorized', element: <UnauthorizedPage /> },

  // Usuario comÃºn
  {
    element: <RoleRoute allowedRoles={[ROLES.USER]} />,
    children: [
      { path: '/dashboard', element: <UserHome /> },
    ],
  },

  // Solo admin
  {
    element: <RoleRoute allowedRoles={[ROLES.ADMIN]} />,
    children: [
      { path: '/admin', element: <AdminHome /> },
    ],
  },

  // Autoridad o admin
  {
    element: <RoleRoute allowedRoles={[ROLES.AUTHORITY, ROLES.ADMIN]} />,
    children: [
      { path: '/authority', element: <AuthorityHome /> },
      { path: '/authority/cases', element: <AuthorityCases /> },
    ],
  },

  // RaÃ­z y fallback van al login
  { path: '/', element: <Navigate to="/login" replace /> },
  { path: '*', element: <Navigate to="/login" replace /> },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}

