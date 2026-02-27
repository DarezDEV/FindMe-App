import { type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Check, ChevronLeft, Clock, Loader2, MapPin, User, Video } from 'lucide-react'
import { Alert } from '../../../shared/components/ui'

import { usePublicarForm } from '../hooks/usePublicarForm'
import { StepDatosPersonales } from '../components/StepDatosPersonales'
import { StepFotosVideo } from '../components/StepFotosVideo'
import { StepUbicacion } from '../components/StepUbicacion'
import { StepUltimoAvistamiento } from '../components/StepUltimoAvistamiento'
import { StepPreferencias } from '../components/StepPreferencias'
import { SuccessScreen } from '../components/SuccessScreen'
import UserNavbar from '../components/Usernavbar'

function FormSection({
  title,
  hint,
  icon,
  children,
}: {
  title: string
  hint: string
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <section className="card p-6 sm:p-8 space-y-5">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary-soft text-primary flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div>
          <h2 className="text-base font-semibold text-text-primary">{title}</h2>
          <p className="text-xs text-text-secondary mt-0.5">{hint}</p>
        </div>
      </div>

      {children}
    </section>
  )
}

export default function PublicarPersonaPerdida() {
  const {
    data,
    set,
    canSubmit,
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
          <div className="mb-8">
            <Link
              to="/user"
              className="inline-flex items-center gap-1.5 text-xs text-text-secondary hover:text-primary transition-colors mb-4"
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
                  Completa el aviso en un solo formulario y publica de inmediato.
                </p>
              </div>
            </div>
          </div>

          {error && <Alert type="error" message={error} />}

          <div className="space-y-6">
            <FormSection
              title="Datos personales"
              hint="Informacion basica para identificar a la persona."
              icon={<User size={18} />}
            >
              <StepDatosPersonales data={data} set={set} />
            </FormSection>

            <FormSection
              title="Fotos y video"
              hint="Agrega evidencia visual clara. La primera foto sera la principal."
              icon={<Video size={18} />}
            >
              <StepFotosVideo data={data} set={set} />
            </FormSection>

            <FormSection
              title="Ubicacion"
              hint="Indica donde ocurrio la desaparicion."
              icon={<MapPin size={18} />}
            >
              <StepUbicacion data={data} set={set} />
            </FormSection>

            <FormSection
              title="Ultimo avistamiento"
              hint="Registra fecha, lugar y contexto del ultimo contacto."
              icon={<Clock size={18} />}
            >
              <StepUltimoAvistamiento data={data} set={set} />
            </FormSection>

            <FormSection
              title="Preferencias y contacto"
              hint="Define visibilidad y confirma terminos para publicar."
              icon={<Check size={18} />}
            >
              <StepPreferencias data={data} set={set} />
            </FormSection>

            <section className="card p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-xs text-text-secondary">
                Completa los campos obligatorios (*) para habilitar el envio.
              </p>
              <button
                type="button"
                onClick={submit}
                disabled={!canSubmit() || loading}
                className="btn-primary min-w-[180px] justify-center inline-flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Publicando...
                  </>
                ) : (
                  <>
                    <Check size={16} /> Publicar caso
                  </>
                )}
              </button>
            </section>
          </div>

          <p className="text-center text-xs text-text-secondary mt-5">
            Necesitas ayuda?{' '}
            <a href="mailto:soporte@findme.app" className="text-primary hover:underline">
              soporte@findme.app
            </a>
          </p>
        </div>
      </main>
    </>
  )
}
