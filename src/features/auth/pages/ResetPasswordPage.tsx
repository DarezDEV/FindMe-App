import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Eye, EyeOff, Lock, ShieldCheck } from 'lucide-react'
import {
  exchangeRecoveryCode,
  getCurrentSession,
  logoutUser,
  setSessionFromTokens,
  updateUserPassword,
  verifyPasswordSetupToken,
  type PasswordSetupTokenType,
} from '../services'
import { Alert } from '../../../shared/components/ui'

const MIN_PASSWORD_LENGTH = 6

const wait = (ms: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, ms))

const decodeParam = (value: string) => {
  try {
    return decodeURIComponent(value.replace(/\+/g, ' '))
  } catch {
    return value
  }
}

const getResetParams = () => {
  const queryParams = new URLSearchParams(window.location.search)
  const hashRaw = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash
  const hashParams = new URLSearchParams(hashRaw)

  return {
    get: (key: string) => queryParams.get(key) ?? hashParams.get(key),
  }
}

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const paramsKey = `${searchParams.toString()}|${window.location.hash}`

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [checkingLink, setCheckingLink] = useState(true)
  const [isLinkValid, setIsLinkValid] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    let isMounted = true

    const waitForSession = async () => {
      for (let attempt = 0; attempt < 6; attempt += 1) {
        const session = await getCurrentSession()
        if (session) return session
        await wait(200)
      }
      return null
    }

    const validateRecoveryLink = async () => {
      setCheckingLink(true)
      setError(null)

      try {
        const params = getResetParams()
        const authError = params.get('error_description') ?? params.get('error')
        const code = params.get('code')
        const tokenHash = params.get('token_hash')
        const type = params.get('type')
        const accessToken = params.get('access_token')
        const refreshToken = params.get('refresh_token')

        if (authError) {
          throw new Error(decodeParam(authError))
        }

        if (code) {
          await exchangeRecoveryCode(code)
        } else if (
          tokenHash &&
          (type === 'recovery' || type === 'invite')
        ) {
          await verifyPasswordSetupToken(tokenHash, type as PasswordSetupTokenType)
        } else if (accessToken && refreshToken) {
          await setSessionFromTokens(accessToken, refreshToken)
        } else {
          const existingSession = await getCurrentSession()
          if (!existingSession) {
            throw new Error('El enlace no contiene un token valido de recuperacion o invitacion.')
          }
        }

        const session = await waitForSession()
        if (!session) {
          throw new Error('El enlace de recuperación es inválido o ya expiró. Solicita uno nuevo.')
        }

        // Limpia parámetros sensibles del URL después de validar el enlace.
        window.history.replaceState({}, document.title, '/reset-password')

        if (isMounted) {
          setIsLinkValid(true)
        }
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'No se pudo validar el enlace de recuperación.'

        if (isMounted) {
          setError(message)
          setIsLinkValid(false)
        }
      } finally {
        if (isMounted) {
          setCheckingLink(false)
        }
      }
    }

    void validateRecoveryLink()

    return () => {
      isMounted = false
    }
  }, [paramsKey])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }

    if (password !== confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setLoading(true)
    try {
      await updateUserPassword(password)
      await logoutUser()
      setSuccess(true)
      window.setTimeout(() => navigate('/login?reset=success', { replace: true }), 1200)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo actualizar la contraseña.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  if (checkingLink) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6 py-12">
        <div className="card w-full max-w-md p-8 text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-xl bg-primary/10 flex items-center justify-center">
            <span className="w-5 h-5 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
          </div>
          <h1 className="text-xl font-bold text-text-primary">Validando enlace...</h1>
          <p className="text-sm text-text-secondary">
            Estamos verificando tu enlace de recuperación.
          </p>
        </div>
      </div>
    )
  }

  if (!isLinkValid) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6 py-12">
        <div className="card w-full max-w-md p-8 space-y-6">
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">
            Enlace inválido
          </h1>
          {error && <Alert type="error" message={error} />}
          <p className="text-sm text-text-secondary leading-relaxed">
            Solicita un nuevo enlace de recuperación para volver a intentarlo.
          </p>
          <div className="flex flex-col gap-3">
            <Link to="/forgot-password" className="btn-primary text-center">
              Solicitar nuevo enlace
            </Link>
            <Link to="/login" className="btn-secondary text-center">
              Volver al login
            </Link>
          </div>
        </div>
      </div>
    )
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

        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
            <ShieldCheck size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">
              Nueva contraseña
            </h1>
            <p className="text-sm text-text-secondary">
              Define tu nueva contraseña para acceder a tu cuenta.
            </p>
          </div>
        </div>

        {error && <Alert type="error" message={error} />}
        {success && (
          <Alert type="success" message="Contraseña actualizada. Redirigiendo al login..." />
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Nueva contraseña
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none">
                <Lock size={16} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="input-field pl-9 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Confirmar contraseña
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none">
                <Lock size={16} />
              </span>
              <input
                type={showConfirm ? 'text' : 'password'}
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repite tu nueva contraseña"
                className="input-field pl-9 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
                tabIndex={-1}
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading || success} className="btn-primary w-full">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Guardando...
              </span>
            ) : (
              'Actualizar contraseña'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
