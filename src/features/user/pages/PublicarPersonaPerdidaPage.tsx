import { Link } from 'react-router-dom'
import { ChevronLeft, User } from 'lucide-react'
import { Alert } from '../../../shared/components/ui'

import { usePublicarForm }          from '../hooks/usePublicarForm'
import { StepIndicator }            from '../components/StepIndicator'
import { FormNavigation }           from '../components/FormNavigation'
import { StepDatosPersonales }      from '../components/StepDatosPersonales'
import { StepFotosVideo }           from '../components/StepFotosVideo'
import { StepUbicacion }            from '../components/StepUbicacion'
import { StepUltimoAvistamiento }   from '../components/StepUltimoAvistamiento'
import { StepPreferencias }         from '../components/StepPreferencias'
import { SuccessScreen }            from '../components/SuccessScreen'
import UserNavbar                  from '../components/Usernavbar'

export default function PublicarPersonaPerdida() {
  const {
    step, data, set,
    canNext, next, prev,
    submit, submitted,
    loading, error,
    caseNumber, reset,
  } = usePublicarForm()

  if (submitted) {
    return (
      <>
        <UserNavbar />
        <main className="min-h-screen bg-background py-8 px-4">
          <div className="max-w-2xl mx-auto">
            <SuccessScreen
              data={data}
              caseNumber={caseNumber}
              onReset={reset}
            />
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <UserNavbar />
      <main className="min-h-screen bg-background py-8 px-4">
        <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <Link
            to="/user"
            className="inline-flex items-center gap-1.5 text-xs text-text-secondary
                       hover:text-primary transition-colors mb-4"
          >
            <ChevronLeft size={14} /> Volver al inicio
          </Link>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-error/10 rounded-xl flex items-center justify-center">
              <User size={20} className="text-error" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-text-primary">Reportar persona perdida</h1>
              <p className="text-sm text-text-secondary">
                Completa todos los datos para aumentar las probabilidades de encontrarla
              </p>
            </div>
          </div>
        </div>

        {/* Stepper */}
        <StepIndicator current={step} />

        {/* Error */}
        {error && <Alert type="error" message={error} />}

        {/* Pasos */}
        <div className="card p-6 sm:p-8">
          {step === 1 && <StepDatosPersonales    data={data} set={set} />}
          {step === 2 && <StepFotosVideo         data={data} set={set} />}
          {step === 3 && <StepUbicacion          data={data} set={set} />}
          {step === 4 && <StepUltimoAvistamiento data={data} set={set} />}
          {step === 5 && <StepPreferencias       data={data} set={set} />}

          <FormNavigation
            step={step}
            canNext={canNext()}
            loading={loading}
            onPrev={prev}
            onNext={next}
            onSubmit={submit}
          />
        </div>

        <p className="text-center text-xs text-text-secondary mt-5">
          ¿Necesitas ayuda?{' '}
          <a href="mailto:soporte@findme.app" className="text-primary hover:underline">
            soporte@findme.app
          </a>
        </p>

        </div>
      </main>
    </>
  )
}
