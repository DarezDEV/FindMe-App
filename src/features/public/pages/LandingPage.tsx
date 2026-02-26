import { Link } from 'react-router-dom'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-text-primary">
      <header className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
          <div className="inline-flex items-center gap-2">
            <img src="/findMeLogo.svg" alt="FindMe" className="h-8 w-8" />
            <span className="font-semibold">FindMe</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/login" className="btn-secondary !px-4 !py-2">Iniciar sesion</Link>
            <Link to="/register" className="btn-primary !px-4 !py-2">Crear cuenta</Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 md:px-6 py-16 space-y-16">
        <section className="grid gap-8 lg:grid-cols-2 items-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight">
              Conectamos personas para encontrar a quienes mas importan.
            </h1>
            <p className="mt-4 text-text-secondary text-lg">
              Plataforma para reportar casos, activar apoyo comunitario y facilitar seguimiento seguro.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/register" className="btn-primary">Publicar un caso</Link>
              <Link to="/login" className="btn-secondary">Ver casos activos</Link>
            </div>
          </div>
          <div className="card p-8">
            <img src="/findMeLogo.svg" alt="Ilustracion institucional FindMe" className="h-20 w-20" />
            <p className="mt-4 text-text-secondary">
              Una plataforma humana, moderada y profesional para apoyar la busqueda de personas desaparecidas.
            </p>
          </div>
        </section>
      </main>
    </div>
  )
}
