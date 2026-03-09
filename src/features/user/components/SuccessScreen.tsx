import { Check } from 'lucide-react'
import { Link } from 'react-router-dom'
import { type FormData } from '../types'

interface Props {
  data: FormData
  caseNumber: string
  onReset: () => void
}

export function SuccessScreen({ data, caseNumber, onReset }: Props) {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="card p-10 text-center space-y-5 max-w-md w-full">

        <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mx-auto">
          <Check size={36} className="text-success" strokeWidth={2} />
        </div>

        <div>
          <h2 className="text-2xl font-bold text-text-primary">¡Caso publicado!</h2>
          <p className="text-text-secondary text-sm mt-2">
            El reporte de{' '}
            <strong className="text-text-primary">{data.nombres} {data.apellidos}</strong>{' '}
            ha sido publicado. Las autoridades y la comunidad han sido notificadas.
          </p>
        </div>

        <div className="bg-primary-soft rounded-xl p-4 text-left">
          <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">
            Número de caso
          </p>
          <p className="text-2xl font-bold text-primary">{caseNumber}</p>
        </div>

        <p className="text-xs text-text-secondary">
          Guarda este número para dar seguimiento al caso o compartirlo con las autoridades.
        </p>

        <div className="flex gap-3 pt-2">
          <button onClick={onReset} className="btn-secondary flex-1 text-sm">
            Nuevo reporte
          </button>
          <Link to="/user" className="btn-primary flex-1 text-sm text-center">
            Ir al inicio
          </Link>
        </div>

      </div>
    </div>
  )
}
