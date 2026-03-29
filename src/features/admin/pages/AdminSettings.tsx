import AdminSidebar from '../components/Adminsidebar'

export default function AdminSettings() {
  return (
    <AdminSidebar>
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="card p-6">
            <h1 className="text-2xl font-bold text-text-primary">Configuración</h1>
            <p className="text-sm text-text-secondary mt-1">
              Ajustes generales del sistema. Este apartado esta en desarrollo.
            </p>
          </div>
        </div>
      </div>
    </AdminSidebar>
  )
}
