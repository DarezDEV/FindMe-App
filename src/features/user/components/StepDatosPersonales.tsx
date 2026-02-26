import { type FormData, type SetFormValue } from '../types'
import { GENEROS, PIELES, CABELLOS, OJOS } from '../types/constants'
import { Label, Select } from './FormPrimitives'

interface Props {
  data: FormData
  set: SetFormValue
}

export function StepDatosPersonales({ data, set }: Props) {
  return (
    <div className="space-y-5">

      {/* Nombres y apellidos */}
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
            placeholder="Ej. Martínez López"
            value={data.apellidos}
            onChange={e => set('apellidos', e.target.value)}
          />
        </div>
      </div>

      {/* Edad, género, estatura, peso */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div>
          <Label required>Edad (años)</Label>
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
          <Label required>Género</Label>
          <Select
            value={data.genero}
            onChange={v => set('genero', v)}
            options={GENEROS}
            placeholder="Seleccionar"
          />
        </div>
        <div>
          <Label required>Estatura (cm o m)</Label>
          <input
            className="input-field"
            type="number"
            placeholder="170 o 1.70"
            min={1}
            max={300}
            step={0.01}
            value={data.estatura}
            onChange={e => set('estatura', e.target.value)}
          />
        </div>
        <div>
          <Label>Peso (kg)</Label>
          <input
            className="input-field"
            type="number"
            placeholder="65"
            min={2}
            max={500}
            step={0.1}
            value={data.peso}
            onChange={e => set('peso', e.target.value)}
          />
        </div>
      </div>

      {/* Características físicas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <Label>Color de piel</Label>
          <Select value={data.colorPiel} onChange={v => set('colorPiel', v)} options={PIELES} placeholder="Seleccionar" />
        </div>
        <div>
          <Label>Color de cabello</Label>
          <Select value={data.colorCabello} onChange={v => set('colorCabello', v)} options={CABELLOS} placeholder="Seleccionar" />
        </div>
        <div>
          <Label>Color de ojos</Label>
          <Select value={data.colorOjos} onChange={v => set('colorOjos', v)} options={OJOS} placeholder="Seleccionar" />
        </div>
      </div>

      {/* Señas particulares */}
      <div>
        <Label>Señas particulares</Label>
        <input
          className="input-field"
          placeholder="Tatuajes, cicatrices, lunares, prótesis, lentes, etc."
          value={data.senasParticulares}
          onChange={e => set('senasParticulares', e.target.value)}
        />
      </div>

      {/* Descripción general */}
      <div>
        <Label required>Descripción general</Label>
        <textarea
          rows={3}
          className="input-field resize-none"
          placeholder="Complexión, rasgos físicos relevantes, estado de salud, condición especial…"
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
