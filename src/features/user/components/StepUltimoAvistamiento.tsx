import { type FormData, type SetFormValue } from '../types'
import { Label } from './FormPrimitives'

interface Props {
  data: FormData
  set: SetFormValue
}

export function StepUltimoAvistamiento({ data, set }: Props) {
  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="space-y-5">

      {/* Fecha y hora */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label required>Fecha de desaparición</Label>
          <input
            type="date"
            className="input-field"
            max={today}
            value={data.fechaDesaparicion}
            onChange={e => set('fechaDesaparicion', e.target.value)}
          />
        </div>
        <div>
          <Label>Hora aproximada</Label>
          <input
            type="time"
            className="input-field"
            value={data.horaDesaparicion}
            onChange={e => set('horaDesaparicion', e.target.value)}
          />
        </div>
      </div>

      {/* Lugar */}
      <div>
        <Label required>Lugar donde fue visto/a por última vez</Label>
        <input
          className="input-field"
          placeholder="Dirección, establecimiento, punto de referencia…"
          value={data.lugarUltimaVez}
          onChange={e => set('lugarUltimaVez', e.target.value)}
        />
      </div>

      {/* Ropa */}
      <div>
        <Label>Ropa que llevaba puesta</Label>
        <input
          className="input-field"
          placeholder="Ej. Camisa roja, pantalón azul, tenis blancos, gorra negra…"
          value={data.ropaDescripcion}
          onChange={e => set('ropaDescripcion', e.target.value)}
        />
      </div>

      {/* Circunstancias */}
      <div>
        <Label required>Circunstancias de la desaparición</Label>
        <textarea
          rows={4}
          className="input-field resize-none"
          placeholder="Describe todo lo que sabes: actividad que realizaba, con quién estaba, si hubo algún incidente previo, posibles razones, etc."
          value={data.descripcionCircunstancias}
          onChange={e => set('descripcionCircunstancias', e.target.value)}
        />
      </div>

    </div>
  )
}
