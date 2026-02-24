import { type MouseEvent } from 'react'
import { MapPin, Search, Check, X } from 'lucide-react'
import { type FormData, type SetFormValue } from '../types'
import { Label } from './FormPrimitives'

interface Props {
  data: FormData
  set: SetFormValue
}

// Simulación de coordenadas centro (Santo Domingo, RD)
const MAP_CENTER = { lat: 18.48, lng: -69.93 }
const MAP_RANGE  = 0.5

export function StepUbicacion({ data, set }: Props) {
  const handleMapClick = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const lat  = +(MAP_CENTER.lat - ((e.clientY - rect.top)  / rect.height - 0.5) * MAP_RANGE).toFixed(5)
    const lng  = +(MAP_CENTER.lng + ((e.clientX - rect.left) / rect.width  - 0.5) * MAP_RANGE).toFixed(5)
    set('coordenadas', { lat, lng })
  }

  const pinLeft = data.coordenadas
    ? `${((data.coordenadas.lng - MAP_CENTER.lng) / MAP_RANGE + 0.5) * 100}%`
    : '50%'
  const pinTop = data.coordenadas
    ? `${(-(data.coordenadas.lat - MAP_CENTER.lat) / MAP_RANGE + 0.5) * 100}%`
    : '50%'

  return (
    <div className="space-y-5">

      {/* Address search */}
      <div>
        <Label required>Lugar de desaparición</Label>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
          <input
            className="input-field pl-9"
            placeholder="Dirección, barrio, ciudad, país…"
            value={data.lugarDesaparicion}
            onChange={e => set('lugarDesaparicion', e.target.value)}
          />
        </div>
      </div>

      {/* Map */}
      <div>
        <Label>
          Marcar en el mapa{' '}
          <span className="normal-case font-normal text-text-secondary">(haz clic para fijar el punto)</span>
        </Label>

        <div
          onClick={handleMapClick}
          className="relative w-full h-64 rounded-xl overflow-hidden cursor-crosshair border border-border bg-[#e8f0ff]"
        >
          {/* Grid background */}
          <svg className="absolute inset-0 w-full h-full opacity-20 pointer-events-none">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#3266db" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>

          {/* Simulated roads */}
          <svg className="absolute inset-0 w-full h-full opacity-25 pointer-events-none">
            <line x1="0" y1="40%" x2="100%" y2="45%" stroke="#3266db" strokeWidth="2" />
            <line x1="0" y1="70%" x2="100%" y2="65%" stroke="#3266db" strokeWidth="1.5" />
            <line x1="30%" y1="0" x2="35%" y2="100%" stroke="#3266db" strokeWidth="2" />
            <line x1="65%" y1="0" x2="60%" y2="100%" stroke="#3266db" strokeWidth="1.5" />
            <line x1="0" y1="20%" x2="70%" y2="25%" stroke="#3266db" strokeWidth="1" />
            <line x1="50%" y1="0" x2="45%" y2="50%" stroke="#3266db" strokeWidth="1" />
          </svg>

          {/* Empty state hint */}
          {!data.coordenadas && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-white/80 backdrop-blur-sm rounded-lg px-4 py-2.5 text-center shadow-sm">
                <MapPin size={20} className="text-primary mx-auto mb-1" />
                <p className="text-xs font-medium text-text-primary">Haz clic para marcar la ubicación</p>
              </div>
            </div>
          )}

          {/* Pin */}
          {data.coordenadas && (
            <div
              className="absolute transform -translate-x-1/2 -translate-y-full pointer-events-none"
              style={{ left: pinLeft, top: pinTop }}
            >
              <div className="w-8 h-8 bg-error rounded-full border-2 border-white shadow-lg
                              flex items-center justify-center">
                <MapPin size={16} className="text-white" fill="white" />
              </div>
              <div className="w-0.5 h-3 bg-error mx-auto" />
              <div className="w-3 h-1 bg-error/30 rounded-full mx-auto" />
            </div>
          )}
        </div>

        <p className="text-xs text-text-secondary mt-1.5">
          💡 En producción este mapa se integra con Mapbox o Google Maps API.
        </p>
      </div>

      {/* Coordinates badge */}
      {data.coordenadas && (
        <div className="flex items-center gap-2 bg-success/8 border border-success/25 rounded-lg px-3 py-2">
          <Check size={14} className="text-success shrink-0" />
          <p className="text-xs text-success font-medium flex-1">
            Ubicación marcada: {data.coordenadas.lat}°N, {data.coordenadas.lng}°W
          </p>
          <button
            onClick={() => set('coordenadas', null)}
            className="text-success hover:text-error transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}

    </div>
  )
}
