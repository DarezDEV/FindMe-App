import { useAuth } from '../../auth/hooks'
import AdminSidebar from '../components/Adminsidebar'

export default function AdminPage() {
  const { user } = useAuth()

  return (
    <>
    <AdminSidebar />
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <div className="card p-8 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 bg-primary rounded-xl flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text-primary">Panel de Administrador</h1>
              <p className="text-text-secondary">Bienvenido, {user?.name} {user?.last_nmae}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-primary-soft p-6 rounded-xl">
              <p className="text-3xl font-bold text-primary">124</p>
              <p className="text-sm text-text-secondary">Usuarios registrados</p>
            </div>
            <div className="bg-warning/10 p-6 rounded-xl">
              <p className="text-3xl font-bold text-warning">8</p>
              <p className="text-sm text-text-secondary">Autoridades</p>
            </div>
            <div className="bg-success/10 p-6 rounded-xl">
              <p className="text-3xl font-bold text-success">45</p>
              <p className="text-sm text-text-secondary">Casos resueltos</p>
            </div>
          </div>
        </div>
        
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Administración</h3>
          <p className="text-text-secondary">Aquí podrás gestionar usuarios, roles y configuraciones del sistema.</p>
        </div>
      </div>
    </div>
    </>
  )
}
