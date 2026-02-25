import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, RotateCcw, ArrowLeft, Mail } from 'lucide-react'
import { verifyEmailOtp, resendVerificationOtp } from '../../../lib/supabase/auth'

interface Props {
  email: string
  onBack: () => void
}

const RESEND_COOLDOWN = 60 // segundos

export default function VerifyEmailPage({ email, onBack }: Props) {
  const navigate = useNavigate()
  const [codes, setCodes] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const inputs = useRef<(HTMLInputElement | null)[]>([])

  // Foco automático en el primer input al montar
  useEffect(() => {
    inputs.current[0]?.focus()
  }, [])

  // Countdown para reenvío
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return // Solo números

    const newCodes = [...codes]
    newCodes[index] = value.slice(-1)
    setCodes(newCodes)
    setError(null)

    // Auto-focus al siguiente
    if (value && index < 5) {
      inputs.current[index + 1]?.focus()
    }

    // Auto-submit al completar
    if (index === 5 && value) {
      const token = [...newCodes.slice(0, 5), value].join('')
      if (token.length === 6) submitCode(token)
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace') {
      if (codes[index]) {
        // Borrar el dígito actual
        const newCodes = [...codes]
        newCodes[index] = ''
        setCodes(newCodes)
      } else if (index > 0) {
        // Moverse al anterior
        inputs.current[index - 1]?.focus()
      }
    }
    if (e.key === 'ArrowLeft' && index > 0) inputs.current[index - 1]?.focus()
    if (e.key === 'ArrowRight' && index < 5) inputs.current[index + 1]?.focus()
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!paste) return

    const newCodes = paste.split('').concat(Array(6).fill('')).slice(0, 6)
    setCodes(newCodes)

    // Focus en el último input con valor
    const lastIndex = Math.min(paste.length - 1, 5)
    inputs.current[lastIndex]?.focus()

    if (paste.length === 6) submitCode(paste)
  }

  const submitCode = async (token: string) => {
    if (loading) return
    setLoading(true)
    setError(null)

    try {
      await verifyEmailOtp(email, token)
      // Redirigir a login con mensaje de éxito
      navigate('/login?verified=true')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Código inválido.'
      setError(message)
      // Limpiar inputs para reintentar
      setCodes(['', '', '', '', '', ''])
      setTimeout(() => inputs.current[0]?.focus(), 50)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = () => {
    const token = codes.join('')
    if (token.length !== 6) {
      setError('Ingresa los 6 dígitos del código.')
      return
    }
    submitCode(token)
  }

  const handleResend = async () => {
    if (cooldown > 0 || resendLoading) return
    setResendLoading(true)
    setError(null)
    setResendSuccess(false)

    try {
      await resendVerificationOtp(email)
      setResendSuccess(true)
      setCooldown(RESEND_COOLDOWN)
      setCodes(['', '', '', '', '', ''])
      setTimeout(() => inputs.current[0]?.focus(), 50)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo reenviar el código.'
      setError(message)
    } finally {
      setResendLoading(false)
    }
  }

  const isComplete = codes.every((c) => c !== '')

  return (
    <div className="min-h-screen bg-background flex">
      {/* Panel izquierdo — decorativo (igual que RegisterPage) */}
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
            Un paso más<br />para proteger<br />tu cuenta.
          </h2>
          <p className="text-white/70 text-base leading-relaxed max-w-sm">
            La verificación de correo garantiza que solo tú puedas acceder a tu cuenta en FindMe System.
          </p>
        </div>

        <div className="relative z-10 space-y-3">
          {[
            'Código de 6 dígitos enviado a tu correo',
            'Expira en 10 minutos por seguridad',
            'Puedes solicitar un nuevo código si es necesario',
          ].map((item) => (
            <div key={item} className="flex items-center gap-3">
              <ShieldCheck size={18} className="text-white/80 shrink-0" />
              <span className="text-white/80 text-sm">{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Panel derecho — verificación */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
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

          {/* Encabezado */}
          <div>
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-text-secondary hover:text-text-primary text-sm mb-6 transition-colors"
            >
              <ArrowLeft size={16} />
              Volver al registro
            </button>

            <div className="flex items-center gap-3 mb-2">
              <div className="bg-primary/10 p-2.5 rounded-xl">
                <Mail size={22} className="text-primary" />
              </div>
              <h1 className="text-3xl font-bold text-text-primary tracking-tight">
                Verifica tu correo
              </h1>
            </div>

            <p className="text-text-secondary text-sm mt-3 leading-relaxed">
              Enviamos un código de 6 dígitos a{' '}
              <span className="font-semibold text-text-primary">{email}</span>.
              <br />Revisa tu bandeja de entrada y carpeta de spam.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          {/* Mensaje de reenvío exitoso */}
          {resendSuccess && !error && (
            <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-4 py-3">
              ✓ Nuevo código enviado. Revisa tu correo.
            </div>
          )}

          {/* Inputs OTP */}
          <div>
            <p className="text-sm font-medium text-text-primary mb-3">Código de verificación</p>
            <div
              className="flex gap-3 justify-between"
              onPaste={handlePaste}
            >
              {codes.map((code, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    inputs.current[i] = el
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={code}
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  disabled={loading}
                  className={`
                    w-full aspect-square max-w-[56px] text-center text-2xl font-bold
                    border-2 rounded-xl outline-none transition-all duration-150
                    disabled:opacity-50 disabled:cursor-not-allowed
                    ${code
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border bg-white text-text-primary'
                    }
                    focus:border-primary focus:ring-2 focus:ring-primary/20
                    ${error ? 'border-error focus:border-error focus:ring-error/20' : ''}
                  `}
                />
              ))}
            </div>
          </div>

          {/* Botón confirmar */}
          <button
            onClick={handleSubmit}
            disabled={!isComplete || loading}
            className="btn-primary w-full"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Verificando...
              </span>
            ) : (
              'Confirmar cuenta'
            )}
          </button>

          {/* Reenviar código */}
          <div className="text-center">
            <p className="text-text-secondary text-sm">
              ¿No recibiste el código?{' '}
              {cooldown > 0 ? (
                <span className="text-text-secondary font-medium">
                  Reenviar en {cooldown}s
                </span>
              ) : (
                <button
                  onClick={handleResend}
                  disabled={resendLoading}
                  className="text-primary font-medium hover:underline inline-flex items-center gap-1 transition-colors disabled:opacity-50"
                >
                  {resendLoading ? (
                    <>
                      <span className="w-3 h-3 border border-primary/40 border-t-primary rounded-full animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <RotateCcw size={13} />
                      Reenviar código
                    </>
                  )}
                </button>
              )}
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}
