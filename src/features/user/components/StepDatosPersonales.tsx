import { type FormData, type SetFormValue } from '../types'
import { GENEROS } from '../types/constants'
import { Label, Select } from './FormPrimitives'

interface Props {
  data: FormData
  set: SetFormValue
}

export function StepDatosPersonales({ data, set }: Props) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label required>Nombres</Label>
          <input
            className="input-field"
            placeholder="Ej. Juan Carlos"
            value={data.nombres}
            onChange={e => set('nombres', e.target.value)}
          />
        </div>
        <div>
          <Label required>Apellidos</Label>
          <input
            className="input-field"
            placeholder="Ej. Martinez Lopez"
            value={data.apellidos}
            onChange={e => set('apellidos', e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label required>Edad (anos)</Label>
          <input
            className="input-field"
            type="number"
            placeholder="25"
            min={0}
            max={120}
            value={data.edad}
            onChange={e => set('edad', e.target.value)}
          />
        </div>
        <div>
          <Label required>Genero</Label>
          <Select
            value={data.genero}
            onChange={v => set('genero', v)}
            options={GENEROS}
            placeholder="Seleccionar"
          />
        </div>
      </div>

      <div>
        <Label>Senas particulares</Label>
        <input
          className="input-field"
          placeholder="Tatuajes, cicatrices, lentes, color de ojos o cabello, etc."
          value={data.senasParticulares}
          onChange={e => set('senasParticulares', e.target.value)}
        />
      </div>

      <div>
        <Label required>Descripcion general</Label>
        <textarea
          rows={4}
          className="input-field resize-none"
          placeholder="Incluye aqui estatura, peso, color de piel/cabello/ojos y rasgos fisicos relevantes."
          value={data.descripcion}
          onChange={e => set('descripcion', e.target.value.slice(0, 500))}
        />
        <p className="text-xs text-text-secondary mt-1 text-right">
          {data.descripcion.length}/500
        </p>
      </div>
    </div>
  )
}
