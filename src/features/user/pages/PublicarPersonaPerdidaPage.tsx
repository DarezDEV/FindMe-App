import { Link } from 'react-router-dom'
import { ChevronLeft, UserRound } from 'lucide-react'
import { Alert } from '../../../shared/components/ui'

import { usePublicarForm } from '../hooks/usePublicarForm'
import { StepIndicator } from '../components/StepIndicator'
import { FormNavigation } from '../components/FormNavigation'
import { StepDatosPersonales } from '../components/StepDatosPersonales'
import { StepFotosVideo } from '../components/StepFotosVideo'
import { StepUbicacion } from '../components/StepUbicacion'
import { StepUltimoAvistamiento } from '../components/StepUltimoAvistamiento'
import { StepPreferencias } from '../components/StepPreferencias'
import { SuccessScreen } from '../components/SuccessScreen'
import UserNavbar from '../components/Usernavbar'

export default function PublicarPersonaPerdida() {
  const {
    step,
    data,
    set,
    canNext,
    next,
    prev,
    submit,
    submitted,
    loading,
    error,
    caseNumber,
    reset,
  } = usePublicarForm()

  if (submitted) {
    return (
      <>
        <UserNavbar />
        <main className="min-h-screen bg-background py-8 px-4">
          <div className="max-w-2xl mx-auto">
            <SuccessScreen data={data} caseNumber={caseNumber} onReset={reset} />
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <UserNavbar />

      {/* Ambient background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-error/6 blur-3xl" />
        <div className="absolute top-1/2 -right-24 h-80 w-80 rounded-full bg-primary/6 blur-3xl" />
      </div>

      <main className="relative z-10 min-h-screen bg-background py-10 px-4">
        <div className="max-w-2xl mx-auto">

          {/* Back link */}
          <Link
            to="/user"
            className="inline-flex items-center gap-1.5 text-xs text-text-secondary hover:text-primary transition-colors mb-6 group"
          >
            <ChevronLeft
              size={14}
              className="transition-transform group-hover:-translate-x-0.5"
            />
            Volver al inicio
          </Link>

          {/* Page header */}
          <div className="mb-8 flex items-start gap-4">
            <div className="shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-error/20 to-error/5 border border-error/20 flex items-center justify-center shadow-sm">
              <UserRound size={22} className="text-error" strokeWidth={1.8} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-text-primary leading-tight">
                Reportar persona perdida
              </h1>
              <p className="text-sm text-text-secondary mt-1 leading-relaxed">
                Completa los datos clave para publicar el caso de forma rápida y segura.
              </p>
            </div>
          </div>

          {/* Step indicator */}
          <StepIndicator current={step} />

          {/* Error alert */}
          {error && (
            <div className="mb-4">
              <Alert type="error" message={error} />
            </div>
          )}

          {/* Form card */}
          <div className="rounded-2xl border border-border/70 bg-card shadow-sm overflow-hidden">
            {/* Card top accent stripe */}
            <div className="h-1 w-full bg-gradient-to-r from-error/60 via-error/30 to-transparent" />

            <div className="p-6 sm:p-8">
              {step === 1 && <StepDatosPersonales data={data} set={set} />}
              {step === 2 && <StepFotosVideo data={data} set={set} />}
              {step === 3 && <StepUbicacion data={data} set={set} />}
              {step === 4 && <StepUltimoAvistamiento data={data} set={set} />}
              {step === 5 && <StepPreferencias data={data} set={set} />}

              <FormNavigation
                step={step}
                canNext={canNext()}
                loading={loading}
                onPrev={prev}
                onNext={next}
                onSubmit={submit}
              />
            </div>
          </div>

          {/* Footer note */}
          <p className="text-center text-xs text-text-secondary mt-6">
            ¿Necesitas ayuda?{' '}
            <a
              href="mailto:soporte@findme.app"
              className="text-primary hover:underline font-medium"
            >
              soporte@findme.app
            </a>
          </p>
        </div>
      </main>
    </>
  )
}