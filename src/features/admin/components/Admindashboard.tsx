import {
  Users,
  ShieldCheck,
  FileSearch,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Clock,
  Eye,
  AlertTriangle,
  UserPlus,
} from "lucide-react";
import { useAuth } from "../../auth/hooks";

// ── Types ──────────────────────────────────────────────────────────────────

type StatColor = "primary" | "warning" | "success" | "error";

interface Stat {
  label: string;
  value: string;
  icon: React.ElementType;
  color: StatColor;
  trend: string;
  up: boolean;
}

interface RecentCase {
  initials: string;
  name: string;
  meta: string;
  status: "active" | "progress" | "resolved";
  statusLabel: string;
}

interface ActivityItem {
  icon: React.ElementType;
  color: StatColor;
  text: string;
  highlight: string; // texto en negrita al inicio
  time: string;
}

// ── Data ───────────────────────────────────────────────────────────────────

const STATS: Stat[] = [
  { label: "Usuarios registrados", value: "124", icon: Users,        color: "primary", trend: "+8 este mes",    up: true  },
  { label: "Autoridades activas",  value: "8",   icon: ShieldCheck,  color: "warning", trend: "+1 este mes",    up: true  },
  { label: "Casos activos",        value: "37",  icon: FileSearch,   color: "error",   trend: "+5 esta semana", up: false },
  { label: "Casos resueltos",      value: "45",  icon: CheckCircle2, color: "success", trend: "+12 este mes",   up: true  },
];

const RECENT_CASES: RecentCase[] = [
  { initials: "MR", name: "María Rodríguez", meta: "Reportado hace 2 horas · Zona Norte",  status: "active",   statusLabel: "Activo"     },
  { initials: "JL", name: "Juan López",      meta: "Actualizado hace 5 horas · Zona Sur",  status: "progress", statusLabel: "En proceso" },
  { initials: "AG", name: "Ana García",      meta: "Reportado hace 1 día · Centro",        status: "active",   statusLabel: "Activo"     },
  { initials: "CM", name: "Carlos Méndez",   meta: "Resuelto hace 2 días · Zona Este",     status: "resolved", statusLabel: "Resuelto"   },
  { initials: "LT", name: "Laura Torres",    meta: "Actualizado hace 3 días · Zona Oeste", status: "progress", statusLabel: "En proceso" },
];

const ACTIVITY: ActivityItem[] = [
  { icon: UserPlus,      color: "primary", highlight: "Nuevo usuario registrado:",     text: "pedro.gomez@email.com",                    time: "Hace 15 min" },
  { icon: Eye,           color: "warning", highlight: "Avistamiento reportado",        text: "en Caso #237 – María R.",                  time: "Hace 32 min" },
  { icon: CheckCircle2,  color: "success", highlight: "Caso resuelto:",               text: "Carlos Méndez – Autoridad Sgt. Vega",       time: "Hace 2 horas" },
  { icon: AlertTriangle, color: "error",   highlight: "Alerta generada:",              text: "caso #241 sin actualización en 48h",        time: "Hace 3 horas" },
  { icon: TrendingUp,    color: "primary", highlight: "Reporte semanal generado",      text: "y disponible para descarga",               time: "Hace 5 horas" },
];

// ── Color maps ─────────────────────────────────────────────────────────────

const colorMap: Record<StatColor, { bg: string; text: string; border: string; pill: string }> = {
  primary: {
    bg:     "bg-primary/10",
    text:   "text-primary",
    border: "border-primary/20",
    pill:   "border-t-2 border-t-primary",
  },
  warning: {
    bg:     "bg-warning/10",
    text:   "text-warning",
    border: "border-warning/20",
    pill:   "border-t-2 border-t-warning",
  },
  success: {
    bg:     "bg-success/10",
    text:   "text-success",
    border: "border-success/20",
    pill:   "border-t-2 border-t-success",
  },
  error: {
    bg:     "bg-error/10",
    text:   "text-error",
    border: "border-error/20",
    pill:   "border-t-2 border-t-error",
  },
};

const statusMap: Record<RecentCase["status"], { pill: string; label: string }> = {
  active:   { pill: "bg-error/10 text-error border border-error/20",     label: "Activo"     },
  progress: { pill: "bg-warning/10 text-warning border border-warning/20", label: "En proceso" },
  resolved: { pill: "bg-success/10 text-success border border-success/20", label: "Resuelto"   },
};

// ── Sub-components ─────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color, trend, up }: Stat) {
  const c = colorMap[color];
  return (
    <div className={`card p-6 ${c.pill} flex flex-col gap-3`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${c.bg}`}>
        <Icon size={20} className={c.text} />
      </div>
      <div>
        <p className={`text-3xl font-bold ${c.text}`}>{value}</p>
        <p className="text-sm text-text-secondary mt-0.5">{label}</p>
      </div>
      <div className={`flex items-center gap-1 text-xs font-medium ${up ? "text-success" : "text-error"}`}>
        {up ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
        {trend}
      </div>
    </div>
  );
}

function RecentCaseRow({ initials, name, meta, status, statusLabel }: RecentCase) {
  const s = statusMap[status];
  return (
    <li className="flex items-center gap-3 py-3 border-b border-border last:border-none">
      <div className="w-9 h-9 rounded-lg bg-primary-soft border border-primary/20
                      flex items-center justify-center shrink-0">
        <span className="text-xs font-bold text-primary">{initials}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text-primary truncate">{name}</p>
        <p className="text-xs text-text-secondary mt-0.5 truncate">{meta}</p>
      </div>
      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${s.pill}`}>
        {statusLabel}
      </span>
    </li>
  );
}

function ActivityRow({ icon: Icon, color, highlight, text, time }: ActivityItem) {
  const c = colorMap[color];
  return (
    <li className="flex gap-3 py-3 border-b border-border last:border-none">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${c.bg}`}>
        <Icon size={14} className={c.text} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-text-primary leading-snug">
          <span className="font-semibold">{highlight}</span>{" "}
          <span className="text-text-secondary">{text}</span>
        </p>
        <p className="text-xs text-text-secondary mt-1 flex items-center gap-1">
          <Clock size={10} />
          {time}
        </p>
      </div>
    </li>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const { user } = useAuth();

  const today = new Date().toLocaleDateString("es-DO", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* ── Page header ── */}
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Bienvenido, <span className="text-text-primary font-medium">{user?.name} {user?.last_nmae}</span> · {today}
          </p>
        </div>

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {STATS.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>

        {/* ── Bottom panels ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Recent cases */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-text-primary">Casos Recientes</h2>
              <a
                href="/admin/cases"
                className="text-xs font-medium text-primary hover:underline"
              >
                Ver todos →
              </a>
            </div>
            <ul>
              {RECENT_CASES.map((c) => (
                <RecentCaseRow key={c.name} {...c} />
              ))}
            </ul>
          </div>

          {/* Activity feed */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-text-primary">Actividad Reciente</h2>
              <span className="text-xs text-text-secondary flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                En vivo
              </span>
            </div>
            <ul>
              {ACTIVITY.map((a, i) => (
                <ActivityRow key={i} {...a} />
              ))}
            </ul>
          </div>

        </div>
      </div>
    </div>
  );
}