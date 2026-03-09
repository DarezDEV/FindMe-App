import { MapPin, Search } from 'lucide-react'
import { type FormData, type SetFormValue } from '../types'
import { Label } from './FormPrimitives'

interface Props {
  data: FormData
  set: SetFormValue
}

export function StepUbicacion({ data, set }: Props) {
  return (
    <div className="space-y-5">
      <div>
        <Label required>Lugar de desaparicion</Label>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
          <input
            className="input-field pl-9"
            placeholder="Zona, barrio, ciudad, pais"
            value={data.lugarDesaparicion}
            onChange={e => {
              set('lugarDesaparicion', e.target.value)
              set('coordenadas', null)
            }}
          />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-primary-soft/30 px-4 py-3">
        <p className="text-sm font-medium text-text-primary inline-flex items-center gap-2">
          <MapPin size={15} className="text-primary" />
          Ubicacion manual
        </p>
        <p className="text-xs text-text-secondary mt-1">
          Puedes registrar detalle interno, pero en la publicacion se mostrara solo zona aproximada (ciudad/pais).
        </p>
      </div>
    </div>
  )
}
