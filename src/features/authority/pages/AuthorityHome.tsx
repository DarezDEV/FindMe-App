import { useAuth } from '../../auth/hooks'

export default function AuthorityPage() {
  const { user } = useAuth()

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6">
        <div className="card p-8 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 bg-warning rounded-xl flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text-primary">Panel de Autoridad</h1>
              <p className="text-text-secondary">
                Bienvenido, {user?.name} {user?.last_nmae}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-error/10 p-6 rounded-xl">
              <p className="text-3xl font-bold text-error">12</p>
              <p className="text-sm text-text-secondary">Casos activos</p>
            </div>
            <div className="bg-info/10 p-6 rounded-xl">
              <p className="text-3xl font-bold text-info">28</p>
              <p className="text-sm text-text-secondary">Casos en proceso</p>
            </div>
            <div className="bg-success/10 p-6 rounded-xl">
              <p className="text-3xl font-bold text-success">156</p>
              <p className="text-sm text-text-secondary">Casos resueltos</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Gestion de Casos</h3>
          <p className="text-text-secondary">
            Aqui podras gestionar y dar seguimiento a los casos de personas desaparecidas.
          </p>
        </div>
      </div>
  )
}

