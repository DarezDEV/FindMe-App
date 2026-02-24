import { useAuth } from '../../auth/hooks'
import {
  ShieldCheck,
  AlertTriangle,
  Clock,
  CheckCircle2,
  TrendingUp,
  Eye,
  Users,
  ArrowRight,
} from 'lucide-react'

interface StatCardProps {
  label: string
  value: string | number
  icon: React.ReactNode
  colorClass: string
  trend?: string
}

function StatCard({ label, value, icon, colorClass, trend }: StatCardProps) {
  return (
    <div className="card p-5 flex items-start gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${colorClass}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-2xl font-bold text-text-primary leading-tight">{value}</p>
        <p className="text-sm text-text-secondary mt-0.5">{label}</p>
        {trend && (
          <p className="text-xs text-text-secondary/60 mt-1 flex items-center gap-1">
            <TrendingUp size={11} />
            {trend}
          </p>
        )}
      </div>
    </div>
  )
}

export function AuthorityDashboard() {
  const { user } = useAuth()

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
      <div className="card p-6 flex items-center gap-4">
        <div className="w-12 h-12 bg-warning rounded-xl flex items-center justify-center shrink-0">
          <ShieldCheck className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-text-primary leading-tight">Panel de Autoridad</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Bienvenido,{' '}
            <span className="font-medium text-text-primary">
              {user?.name} {user?.last_nmae}
            </span>
            . Aqui esta el resumen del dia.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Casos activos"
          value={12}
          icon={<AlertTriangle size={20} />}
          colorClass="bg-error/10 text-error"
          trend="+2 desde ayer"
        />
        <StatCard
          label="En proceso"
          value={28}
          icon={<Clock size={20} />}
          colorClass="bg-info/10 text-info"
          trend="Sin cambios"
        />
        <StatCard
          label="Casos resueltos"
          value={156}
          icon={<CheckCircle2 size={20} />}
          colorClass="bg-success/10 text-success"
          trend="+5 esta semana"
        />
        <StatCard
          label="Avistamientos"
          value={34}
          icon={<Eye size={20} />}
          colorClass="bg-warning/10 text-warning"
          trend="8 pendientes"
        />
      </div>

      <div className="card p-5">
        <h2 className="text-base font-semibold text-text-primary mb-4">Acciones rapidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { icon: <Eye size={16} />, label: 'Revisar avistamientos', badge: '8', color: 'text-warning' },
            { icon: <AlertTriangle size={16} />, label: 'Casos urgentes', badge: '3', color: 'text-error' },
            { icon: <Users size={16} />, label: 'Casos asignados a mi', badge: '5', color: 'text-info' },
            { icon: <CheckCircle2 size={16} />, label: 'Cerrar casos resueltos', badge: '', color: 'text-success' },
          ].map(({ icon, label, badge, color }) => (
            <button
              key={label}
              type="button"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-text-secondary hover:bg-primary-soft/60 hover:text-text-primary transition-all duration-150 group border border-border"
            >
              <span className={color}>{icon}</span>
              <span className="flex-1 text-left">{label}</span>
              {badge && (
                <span className="text-xs font-semibold bg-error/10 text-error px-2 py-0.5 rounded-full">
                  {badge}
                </span>
              )}
              <ArrowRight
                size={14}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-text-secondary"
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
