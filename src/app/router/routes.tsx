import { Link, Navigate, createBrowserRouter, RouterProvider } from 'react-router-dom'
import { GuestRoute } from './GuestRoute'
import { RoleRoute } from './RoleRoute'
import { ROLES } from '../../shared/constants/roles'
import LoginPage from '../../features/auth/pages/LoginPage'
import RegisterPage from '../../features/auth/pages/RegisterPage'
import ForgotPasswordPage from '../../features/auth/pages/ForgotPasswordPage'
import ResetPasswordPage from '../../features/auth/pages/ResetPasswordPage'
import UserHome from '../../features/user/pages/UserHome'
import PublicarPersonaPerdidaPage from '../../features/user/pages/PublicarPersonaPerdidaPage'
import CasoDetallePage from '../../features/user/pages/CasoDetallePage'
import ReportarAvistamientoPage from '../../features/user/pages/ReportarAvistamientoPage'
import ReportarContenidoPage from '../../features/user/pages/ReportarContenidoPage'
import MisCasosPage from '../../features/user/pages/MisCasosPage'
import MiPerfilPage from '../../features/user/pages/MiPerfilPage'
import AdminHome from '../../features/admin/pages/AdminHome'
import AuthorityHome from '../../features/authority/pages/AuthorityHome'
import AdminUsers from '../../features/admin/pages/AdminUsers'
import AdminCases from '../../features/admin/pages/AdminCases'
import AdminSightings from '../../features/admin/pages/AdminSightings'
import AdminReview from '../../features/admin/pages/AdminReview'
import AdminSettings from '../../features/admin/pages/AdminSettings'
import AuthorityCases from '../../features/authority/pages/AuthorityCases'
import AuthorityCaseDetailPage from '../../features/authority/pages/AuthorityCaseDetailPage'
import AuthorityCreateCasePage from '../../features/authority/pages/AuthorityCreateCasePage'
import PendingCasesPage from '../../features/authority/pages/PendingCasesPage'
import AuthoritySightings from '../../features/authority/pages/AuthoritySightings'
import AuthorityProfilePage from '../../features/authority/pages/AuthorityProfilePage'
import LandingPage from '../../features/public/pages/LandingPage'
import PublicCasesPage from '../../features/public/pages/PublicCasesPage'
import PublishCaseGatePage from '../../features/public/pages/PublishCaseGatePage'

function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
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
        <Link to="/" className="inline-block text-primary hover:text-primary-hover text-sm font-medium transition-colors">
          Volver al inicio
        </Link>
      </div>
    </div>
  )
}

const router = createBrowserRouter([
  // Publicas
  { path: '/', element: <LandingPage /> },
  { path: '/cases', element: <PublicCasesPage /> },
  { path: '/publish-case', element: <PublishCaseGatePage /> },
  { path: '/unauthorized', element: <UnauthorizedPage /> },

  // Solo usuarios no autenticados
  {
    element: <GuestRoute />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
      { path: '/reset-password', element: <ResetPasswordPage /> },
    ],
  },

  // Usuario comun
  {
    element: <RoleRoute allowedRoles={[ROLES.USER]} />,
    children: [
      { path: '/dashboard', element: <UserHome /> },
      { path: '/user', element: <UserHome /> },
      { path: '/publicar', element: <PublicarPersonaPerdidaPage /> },
      { path: '/perfil', element: <MiPerfilPage /> },
      { path: '/mis-casos', element: <MisCasosPage /> },
      { path: '/caso/:id', element: <CasoDetallePage /> },
      { path: '/avistamiento', element: <ReportarAvistamientoPage /> },
      { path: '/caso/:id/avistamiento', element: <ReportarAvistamientoPage /> },
      { path: '/reportar', element: <ReportarContenidoPage /> },
      { path: '/caso/:id/reportar', element: <ReportarContenidoPage /> },
    ],
  },

  // Solo admin
  {
    element: <RoleRoute allowedRoles={[ROLES.ADMIN]} />,
    children: [
      { path: '/admin/dashboard', element: <AdminHome /> },
      { path: '/admin/users', element: <AdminUsers /> },
      { path: '/admin/cases', element: <AdminCases /> },
      { path: '/admin/sightings', element: <AdminSightings /> },
      { path: '/admin/revision', element: <AdminReview /> },
      { path: '/admin/settings', element: <AdminSettings /> },
    ],
  },

  // Autoridad o admin
  {
    element: <RoleRoute allowedRoles={[ROLES.AUTHORITY, ROLES.ADMIN]} />,
    children: [
      { path: '/authority', element: <AuthorityHome /> },
      { path: '/authority/cases', element: <AuthorityCases /> },
      { path: '/authority/cases/new', element: <AuthorityCreateCasePage /> },
      { path: '/authority/cases/:id', element: <AuthorityCaseDetailPage /> },
      { path: '/authority/sightings', element: <AuthoritySightings /> },
      { path: '/authority/cases/pending', element: <PendingCasesPage /> },
      { path: '/authority/perfil', element: <AuthorityProfilePage /> },
    ],
  },

  // Fallback
  { path: '*', element: <Navigate to="/" replace /> },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
