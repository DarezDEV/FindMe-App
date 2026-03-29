import { Link } from 'react-router-dom'
import { ChevronLeft, FilePlus2 } from 'lucide-react'
import { Alert } from '../../../shared/components/ui'
import { AuthoritySidebar } from '../components/AuthoritySidebar'
import { usePublicarForm } from '../../user/hooks/usePublicarForm'
import { StepIndicator } from '../../user/components/StepIndicator'
import { FormNavigation } from '../../user/components/FormNavigation'
import { StepDatosPersonales } from '../../user/components/StepDatosPersonales'
import { StepFotosVideo } from '../../user/components/StepFotosVideo'
import { StepUbicacion } from '../../user/components/StepUbicacion'
import { StepUltimoAvistamiento } from '../../user/components/StepUltimoAvistamiento'
import { StepPreferencias } from '../../user/components/StepPreferencias'
import { SuccessScreen } from '../../user/components/SuccessScreen'

export default function AuthorityCreateCasePage() {
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

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AuthoritySidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="min-h-screen bg-background py-8 px-4">
          <div className="max-w-3xl mx-auto">
            <div className="mb-8">
              <Link
                to="/authority/cases"
                className="inline-flex items-center gap-1.5 text-xs text-text-secondary hover:text-primary transition-colors mb-4"
              >
                <ChevronLeft size={14} /> Volver a casos
              </Link>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-info/10 rounded-xl flex items-center justify-center">
                  <FilePlus2 size={20} className="text-info" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-text-primary">Registrar nuevo caso</h1>
                  <p className="text-sm text-text-secondary">
                    Crea manualmente un caso cuando el reporte se realiza en la autoridad.
                  </p>
                </div>
              </div>
            </div>

            <StepIndicator current={step} />

            {error && <Alert type="error" message={error} />}

            <div className="card p-6 sm:p-8">
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

            {submitted && (
              <div className="mt-6">
                <SuccessScreen data={data} caseNumber={caseNumber} onReset={reset} />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
