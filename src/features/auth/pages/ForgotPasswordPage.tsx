import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Mail } from 'lucide-react'
import { sendPasswordResetEmail } from '../services'
import { Alert } from '../../../shared/components/ui'

const RESEND_COOLDOWN = 60
const COOLDOWN_KEY = 'forgot_password_cooldown_until'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    const raw = window.localStorage.getItem(COOLDOWN_KEY)
    const until = raw ? Number(raw) : 0
    if (!until) return

    const remaining = Math.max(0, Math.ceil((until - Date.now()) / 1000))
    if (remaining > 0) {
      setCooldown(remaining)
    } else {
      window.localStorage.removeItem(COOLDOWN_KEY)
    }
  }, [])

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = window.setTimeout(() => setCooldown((prev) => prev - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [cooldown])

  const startCooldown = (seconds: number) => {
    setCooldown(seconds)
    window.localStorage.setItem(COOLDOWN_KEY, String(Date.now() + seconds * 1000))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (loading || cooldown > 0) return

    setError(null)
    setSuccess(false)
    setLoading(true)

    try {
      await sendPasswordResetEmail(email)
      setSuccess(true)
      startCooldown(RESEND_COOLDOWN)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo enviar el correo de recuperación.'
      setError(message)
      if (message.toLowerCase().includes('espera 60 segundos')) {
        startCooldown(RESEND_COOLDOWN)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-12">
      <div className="card w-full max-w-md p-8 space-y-6">
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft size={15} />
          Volver al login
        </Link>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">
            Recuperar contraseña
          </h1>
          <p className="text-sm text-text-secondary leading-relaxed">
            Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
          </p>
        </div>

        {error && <Alert type="error" message={error} />}
        {success && (
          <Alert
            type="success"
            message={`Enlace enviado a ${email}. Revisa tu bandeja de entrada y spam.`}
          />
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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

          <button type="submit" disabled={loading || cooldown > 0} className="btn-primary w-full">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Enviando enlace...
              </span>
            ) : cooldown > 0 ? (
              `Reintenta en ${cooldown}s`
            ) : (
              'Enviar enlace de recuperación'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
