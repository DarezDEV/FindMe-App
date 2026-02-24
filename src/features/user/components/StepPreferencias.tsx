import { Lock, Unlock, Flag, Phone, Mail, Check } from 'lucide-react'
import { type FormData, type SetFormValue } from '../types'
import { IDIOMAS } from '../types/constants'
import { Label } from './FormPrimitives'

interface Props {
  data: FormData
  set: SetFormValue
}

const VISIBILIDAD = [
  {
    value:  'publico'     as const,
    label:  'Público',
    desc:   'Cualquier persona puede ver tu información de contacto',
    Icon:   Unlock,
  },
  {
    value:  'autoridades' as const,
    label:  'Solo autoridades',
    desc:   'Tu contacto solo es visible a autoridades verificadas',
    Icon:   Flag,
  },
  {
    value:  'privado'     as const,
    label:  'Privado',
    desc:   'Nadie puede ver tu contacto directamente',
    Icon:   Lock,
  },
]

export function StepPreferencias({ data, set }: Props) {
  return (
    <div className="space-y-6">

      {/* Idioma */}
      <div>
        <Label>Idioma del caso</Label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {IDIOMAS.map(lang => (
            <button
              key={lang.code}
              onClick={() => set('idioma', lang.code)}
              className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition-all duration-150
                ${data.idioma === lang.code
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : 'bg-card border-border text-text-secondary hover:border-primary hover:text-primary'
                }`}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </div>

      {/* Visibilidad de contacto */}
      <div>
        <Label required>Visibilidad de tu información de contacto</Label>
        <div className="space-y-2">
          {VISIBILIDAD.map(opt => {
            const active = data.visibilidadContacto === opt.value
            return (
              <button
                key={opt.value}
                onClick={() => set('visibilidadContacto', opt.value)}
                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl border text-left
                            transition-all duration-150
                  ${active
                    ? 'border-primary bg-primary-soft ring-1 ring-primary/30'
                    : 'border-border bg-card hover:border-primary/50 hover:bg-background'
                  }`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0
                  ${active ? 'bg-primary text-white' : 'bg-background text-text-secondary'}`}>
                  <opt.Icon size={18} />
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-semibold ${active ? 'text-primary' : 'text-text-primary'}`}>
                    {opt.label}
                  </p>
                  <p className="text-xs text-text-secondary">{opt.desc}</p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0
                  ${active ? 'border-primary bg-primary' : 'border-border'}`}>
                  {active && <Check size={11} className="text-white" strokeWidth={3} />}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Datos de contacto */}
      <div>
        <Label>Datos de contacto</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
            <input
              className="input-field pl-9"
              placeholder="Teléfono de contacto"
              type="tel"
              value={data.telefonoContacto}
              onChange={e => set('telefonoContacto', e.target.value)}
            />
          </div>
          <div className="relative">
            <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
            <input
              className="input-field pl-9"
              placeholder="Correo electrónico"
              type="email"
              value={data.emailContacto}
              onChange={e => set('emailContacto', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Términos */}
      <label className="flex items-start gap-3 cursor-pointer group">
        <div
          onClick={() => set('aceptaTerminos', !data.aceptaTerminos)}
          className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0
                      transition-all duration-150
            ${data.aceptaTerminos
              ? 'bg-primary border-primary'
              : 'border-border group-hover:border-primary'
            }`}
        >
          {data.aceptaTerminos && <Check size={12} className="text-white" strokeWidth={3} />}
        </div>
        <p className="text-sm text-text-secondary leading-snug">
          Confirmo que la información es verídica y acepto los{' '}
          <a href="/terms" className="text-primary hover:underline">términos de uso</a> y la{' '}
          <a href="/privacy" className="text-primary hover:underline">política de privacidad</a> de FindMe.
        </p>
      </label>

    </div>
  )
}
