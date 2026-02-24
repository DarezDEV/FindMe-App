import { useAuth } from '../../auth/hooks'
import {
  ShieldCheck,
  AlertTriangle,
  Clock,
  CheckCircle2,
  TrendingUp,
  MapPin,
  Calendar,
  ArrowRight,
  Eye,
  Users,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string
  value: string | number
  icon: React.ReactNode
  colorClass: string        // e.g. "bg-error/10 text-error"
  trend?: string
}

interface RecentCaseProps {
  id: string
  name: string
  age: number
  location: string
  date: string
  status: 'active' | 'in_progress' | 'resolved'
}

// ─── Sub-components ───────────────────────────────────────────────────────────

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

const statusConfig = {
  active: { label: 'Activo', className: 'bg-error/10 text-error' },
  in_progress: { label: 'En proceso', className: 'bg-info/10 text-info' },
  resolved: { label: 'Resuelto', className: 'bg-success/10 text-success' },
}

function CaseRow({ name, age, location, date, status }: RecentCaseProps) {
  const cfg = statusConfig[status]
  return (
    <div className="flex items-center gap-3 py-3 border-b border-border last:border-0">
      {/* Avatar placeholder */}
      <div className="w-9 h-9 rounded-full bg-primary-soft text-primary flex items-center justify-center shrink-0 text-sm font-semibold">
        {name.charAt(0).toUpperCase()}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary truncate">{name}</p>
        <p className="text-xs text-text-secondary flex items-center gap-1 mt-0.5">
          <MapPin size={10} />
          {location}
          <span className="mx-1 text-border">·</span>
          <Calendar size={10} />
          {date}
          <span className="mx-1 text-border">·</span>
          {age} años
        </p>
      </div>

      <span className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${cfg.className}`}>
        {cfg.label}
      </span>
    </div>
  )
}

// ─── Mock data (replace with real Supabase queries) ───────────────────────────

const MOCK_RECENT_CASES: RecentCaseProps[] = [
  { id: '1', name: 'María García',    age: 17, location: 'Zona Norte', date: '24 feb',  status: 'active' },
  { id: '2', name: 'Carlos Rodríguez',age: 34, location: 'Centro',     date: '23 feb',  status: 'in_progress' },
  { id: '3', name: 'Ana Martínez',    age: 22, location: 'Zona Sur',   date: '22 feb',  status: 'in_progress' },
  { id: '4', name: 'Luis Hernández',  age: 45, location: 'Este',       date: '20 feb',  status: 'resolved' },
  { id: '5', name: 'Sofia Pérez',     age: 9,  location: 'Oeste',      date: '19 feb',  status: 'active' },
]

// ─── Main Dashboard Component ─────────────────────────────────────────────────

export function AuthorityDashboard() {
  const { user } = useAuth()

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">

      {/* ── Welcome header ── */}
      <div className="card p-6 flex items-center gap-4">
        <div className="w-12 h-12 bg-warning rounded-xl flex items-center justify-center shrink-0">
          <ShieldCheck className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-text-primary leading-tight">
            Panel de Autoridad
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Bienvenido,{' '}
            <span className="font-medium text-text-primary">
              {user?.name} {user?.last_nmae}
            </span>
            . Aquí está el resumen del día.
          </p>
        </div>
      </div>

      {/* ── Stat cards ── */}
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

      {/* ── Bottom row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Recent cases – takes 2 cols */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-text-primary">Casos recientes</h2>
            <button
              type="button"
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Ver todos <ArrowRight size={12} />
            </button>
          </div>

          <div>
            {MOCK_RECENT_CASES.map((c) => (
              <CaseRow key={c.id} {...c} />
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div className="card p-5 flex flex-col gap-3">
          <h2 className="text-base font-semibold text-text-primary mb-1">Acciones rápidas</h2>

          {[
            { icon: <Eye size={16} />,         label: 'Revisar avistamientos', badge: '8', color: 'text-warning' },
            { icon: <AlertTriangle size={16} />, label: 'Casos urgentes',       badge: '3', color: 'text-error' },
            { icon: <Users size={16} />,        label: 'Casos asignados a mí',  badge: '5', color: 'text-info' },
            { icon: <CheckCircle2 size={16} />, label: 'Cerrar casos resueltos', badge: '',  color: 'text-success' },
          ].map(({ icon, label, badge, color }) => (
            <button
              key={label}
              type="button"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-text-secondary hover:bg-primary-soft/60 hover:text-text-primary transition-all duration-150 group border border-border"
            >
              <span className={`${color}`}>{icon}</span>
              <span className="flex-1 text-left">{label}</span>
              {badge && (
                <span className="text-xs font-semibold bg-error/10 text-error px-2 py-0.5 rounded-full">
                  {badge}
                </span>
              )}
              <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity text-text-secondary" />
            </button>
          ))}
        </div>

      </div>
    </div>
  )
}