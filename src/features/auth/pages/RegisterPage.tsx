import { useState, type FormEvent, type ChangeEvent, type MouseEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { registerUser } from '../services'
import { Alert, appToast } from '../../../shared/components/ui'
import type { RegisterFormData } from '../types'
import { User, Mail, Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import VerifyEmailPage from './Verifyemailpage'

const INITIAL_FORM: RegisterFormData = {
  name: '',
  last_name: '',
  email: '',
  password: '',
  confirm: '',
  acceptTerms: false,
}

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ]
  const score = checks.filter(Boolean).length

  const labels = ['', 'Débil', 'Regular', 'Buena', 'Fuerte']
  const colors = ['', 'bg-error', 'bg-warning', 'bg-info', 'bg-success']
  const textColors = ['', 'text-error', 'text-warning', 'text-info', 'text-success']

  if (!password) return null

  return (
    <div className="mt-2 space-y-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
              i <= score ? colors[score] : 'bg-border'
            }`}
          />
        ))}
      </div>
      <p className={`text-xs ${textColors[score]}`}>{labels[score]}</p>
    </div>
  )
}

function InputWithIcon({
  icon: Icon,
  label,
  required,
  error,
  hint,
  className = '',
  ...props
}: {
  icon: React.ElementType
  label: string
  required?: boolean
  error?: string
  hint?: React.ReactNode
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="block text-sm font-medium text-text-primary mb-1.5">
        {label} {required && <span className="text-error">*</span>}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none">
          <Icon size={16} />
        </span>
        <input
          {...props}
          className={`input-field pl-9 ${error ? 'border-error focus:border-error focus:ring-error/20' : ''} ${className}`}
        />
      </div>
      {hint}
      {error && <p className="text-error text-xs mt-1">{error}</p>}
    </div>
  )
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState<RegisterFormData>(INITIAL_FORM)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)

  // ── Paso de verificación ──────────────────────────────────────────────────
  const [step, setStep] = useState<'register' | 'verify'>('register')
  const [registeredEmail, setRegisteredEmail] = useState('')

  const handleChange = (e: ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))

  const handleTermsChange = (e: ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, acceptTerms: e.target.checked }))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!form.acceptTerms) {
      setError('Debes aceptar los términos y el tratamiento de datos sensibles para crear la cuenta.')
      return
    }

    if (form.password !== form.confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }
    if (form.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }

    setLoading(true)
    try {
      const consentTimestamp = new Date().toISOString()
      await registerUser({
        name: form.name,
        last_name: form.last_name,
        email: form.email,
        password: form.password,
        accepted_terms_at: consentTimestamp,
        sensitive_data_consent_at: consentTimestamp,
      })
      appToast.success('Cuenta creada. Revisa tu correo para verificarla.', { title: 'Registro completado' })
      // Guardar email y pasar a verificación
      setRegisteredEmail(form.email)
      setStep('verify')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al crear la cuenta.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const handleGoToLogin = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.button !== 0 || e.metaKey || e.altKey || e.ctrlKey || e.shiftKey) return
    e.preventDefault()
    if (isLeaving) return
    setIsLeaving(true)
    window.setTimeout(() => navigate('/login'), 240)
  }

  const passwordMismatch = !!form.confirm && form.confirm !== form.password

  // ── Renderizar verificación si el registro fue exitoso ───────────────────
  if (step === 'verify') {
    return (
      <VerifyEmailPage
        email={registeredEmail}
        onBack={() => setStep('register')}
      />
    )
  }

  // ── Formulario de registro ────────────────────────────────────────────────
  return (
    <div
      className={`min-h-screen bg-background flex auth-transition ${
        isLeaving ? 'auth-transition-exit-right' : 'auth-transition-enter'
      }`}
    >
      {/* Panel izquierdo — decorativo */}
      <div className="hidden lg:flex lg:w-[45%] bg-primary flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-white/5 rounded-full" />
        <div className="absolute -bottom-32 -right-16 w-80 h-80 bg-white/5 rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white/5 rounded-full" />

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
          <svg className="w-8 h-8 text-white hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
              d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <span className="text-white font-bold text-xl tracking-tight">FindMe System</span>
        </div>

        <div className="relative z-10 space-y-4">
          <h2 className="text-white text-4xl font-bold leading-tight">
            Únete a la<br />red de búsqueda<br />y ayuda.
          </h2>
          <p className="text-white/70 text-base leading-relaxed max-w-sm">
            Crea tu cuenta y forma parte de la comunidad que ayuda a reunir familias.
          </p>
        </div>

        <div className="relative z-10 space-y-3">
          {[
            'Reporta personas desaparecidas fácilmente',
            'Envía avistamientos desde cualquier lugar',
            'Recibe actualizaciones en tiempo real',
          ].map((item) => (
            <div key={item} className="flex items-center gap-3">
              <CheckCircle2 size={18} className="text-white/80 shrink-0" />
              <span className="text-white/80 text-sm">{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Panel derecho — formulario */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 overflow-y-auto">
        <div className="w-full max-w-md space-y-8">
          {/* Logo móvil */}
          <div className="lg:hidden flex items-center gap-3 mb-2">
            <img
              src="/findMeLogo.svg"
              alt="FindMe System"
              className="w-10 h-10 object-contain"
              onError={(e) => { e.currentTarget.style.display = 'none' }}
            />
            <span className="font-bold text-text-primary text-lg">FindMe System</span>
          </div>

          <div>
            <h1 className="text-3xl font-bold text-text-primary tracking-tight">Crear cuenta</h1>
            <p className="text-text-secondary mt-2 text-sm">
              Regístrate para comenzar a usar FindMe System
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && <Alert type="error" message={error} />}

            <div className="grid grid-cols-2 gap-4">
              <InputWithIcon
                icon={User}
                label="Nombre"
                name="name"
                required
                value={form.name}
                onChange={handleChange}
                placeholder="Juan"
              />
              <InputWithIcon
                icon={User}
                label="Apellido"
                name="last_name"
                required
                value={form.last_name}
                onChange={handleChange}
                placeholder="Pérez"
              />
            </div>

            <InputWithIcon
              icon={Mail}
              label="Correo electrónico"
              name="email"
              type="email"
              required
              value={form.email}
              onChange={handleChange}
              placeholder="tu@correo.com"
            />

            {/* Contraseña */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Contraseña <span className="text-error">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none">
                  <Lock size={16} />
                </span>
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Mínimo 6 caracteres"
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
              <PasswordStrength password={form.password} />
            </div>

            {/* Confirmar contraseña */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Confirmar contraseña <span className="text-error">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none">
                  <Lock size={16} />
                </span>
                <input
                  name="confirm"
                  type={showConfirm ? 'text' : 'password'}
                  required
                  value={form.confirm}
                  onChange={handleChange}
                  placeholder="Repite tu contraseña"
                  className={`input-field pl-9 pr-10 ${
                    passwordMismatch ? 'border-error focus:border-error focus:ring-error/20' : ''
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {passwordMismatch && (
                <p className="text-error text-xs mt-1">Las contraseñas no coinciden</p>
              )}
            </div>

            <label
              className={`flex items-start gap-3 rounded-xl border p-4 transition-colors ${
                !form.acceptTerms && error?.toLowerCase().includes('términos')
                  ? 'border-error bg-error/5'
                  : 'border-border bg-card hover:border-primary/30'
              }`}
            >
              <input
                name="acceptTerms"
                type="checkbox"
                checked={form.acceptTerms}
                onChange={handleTermsChange}
                className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                required
              />
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-text-primary">
                  Acepto los términos de uso y el tratamiento de datos sensibles <span className="text-error">*</span>
                </p>
                <p className="text-xs leading-relaxed text-text-secondary">
                  Autorizo a FindMe a tratar información sensible relacionada con identidad, contacto y contexto de casos
                  exclusivamente para registro, búsqueda, verificación, moderación y notificación dentro de la plataforma.
                </p>
                <p className="text-xs leading-relaxed text-text-secondary">
                  Al continuar, aceptas los <a href="/terms" className="text-primary hover:underline">términos de uso</a> y la{' '}
                  <a href="/privacy" className="text-primary hover:underline">política de privacidad</a>.
                </p>
              </div>
            </label>

            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Creando cuenta...
                </span>
              ) : (
                'Crear cuenta'
              )}
            </button>
          </form>

          <p className="text-center text-text-secondary text-sm">
            ¿Ya tienes cuenta?{' '}
            <Link
              to="/login"
              onClick={handleGoToLogin}
              className="text-primary hover:text-primary-hover font-medium transition-colors"
            >
              Inicia sesión aquí
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
