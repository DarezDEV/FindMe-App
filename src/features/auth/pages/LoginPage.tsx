import { useState, type FormEvent } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { loginUser } from '../services'
import { useAuth } from '../hooks'
import { Alert } from '../../../shared/components/ui'
import { ROLES } from '../../../shared/constants/roles'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { refreshUser } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const justRegistered = params.get('registered') === 'true'

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await loginUser({ email, password })
      const profile = await refreshUser()

      if (profile?.roles.includes(ROLES.ADMIN)) {
        navigate('/admin', { replace: true })
      } else if (profile?.roles.includes(ROLES.AUTHORITY)) {
        navigate('/authority', { replace: true })
      } else {
        navigate('/dashboard', { replace: true })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al iniciar sesión.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Panel izquierdo — decorativo */}
      <div className="hidden lg:flex lg:w-[45%] bg-primary flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-white/5 rounded-full" />
        <div className="absolute -bottom-32 -right-16 w-80 h-80 bg-white/5 rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white/5 rounded-full" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <img
            src="/findMeLogo.svg"
            alt="FindMe System"
            className="w-14 h-14 object-contain brightness-0 invert drop-shadow-lg"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
              e.currentTarget.nextElementSibling?.classList.remove('hidden')
            }}
          />
          <svg
            className="w-8 h-8 text-white hidden"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
              d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <span className="text-white font-bold text-xl tracking-tight">FindMe System</span>
        </div>

        <div className="relative z-10 space-y-4">
          <h2 className="text-white text-4xl font-bold leading-tight">
            Cada persona<br />merece ser<br />encontrada.
          </h2>
          <p className="text-white/70 text-base leading-relaxed max-w-sm">
            Plataforma integrada para el reporte, seguimiento y gestión de personas desaparecidas.
          </p>
        </div>

        <div className="relative z-10 grid grid-cols-3 gap-4">
          {[
            { label: 'Casos activos', value: '248' },
            { label: 'Resueltos', value: '1,430' },
            { label: 'Autoridades', value: '62' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white/10 rounded-xl p-4">
              <p className="text-white font-bold text-2xl">{stat.value}</p>
              <p className="text-white/60 text-xs mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Panel derecho — formulario */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md space-y-8">

          {/* Logo móvil */}
          <div className="lg:hidden flex items-center gap-3 mb-2">
            <img
              src="/findMeLogo.svg"
              alt="FindMe System"
              className="w-10 h-10 object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
                e.currentTarget.nextElementSibling?.classList.remove('hidden')
              }}
            />
            <svg
              className="w-7 h-7 text-primary hidden"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <span className="font-bold text-text-primary text-lg">FindMe System</span>
          </div>

          <div>
            <h1 className="text-3xl font-bold text-text-primary tracking-tight">
              Bienvenido de vuelta
            </h1>
            <p className="text-text-secondary mt-2 text-sm">
              Ingresa tus credenciales para acceder al sistema
            </p>
          </div>

          {justRegistered && (
            <Alert type="success" message="? Cuenta creada exitosamente. Ya puedes iniciar sesión." />
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && <Alert type="error" message={error} />}

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Correo electrónico
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none">
                  <Mail size={16} />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@correo.com"
                  className="input-field pl-9"
                />
              </div>
            </div>

            {/* Contraseña */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-text-primary">
                  Contraseña
                </label>
                <button
                  type="button"
                  className="text-xs text-primary hover:text-primary-hover transition-colors"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none">
                  <Lock size={16} />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-field pl-9 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Iniciando sesión...
                </span>
              ) : (
                'Iniciar sesión'
              )}
            </button>
          </form>

          <p className="text-center text-text-secondary text-sm">
            ¿No tienes cuenta?{' '}
            <Link to="/register" className="text-primary hover:text-primary-hover font-medium transition-colors">
              Regístrate aquí
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
