import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  FileSearch,
  Eye,
  Settings,
  LogOut,
  ChevronRight,
  Menu,
  X,
  Bell,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "../../auth/hooks";
import { logoutUser } from "../../auth/services";
import { appToast } from "../../../shared/components/ui";
import { useAdminDashboardSummary } from "../hooks/useAdminDashboardSummary";

const badgeClass: Record<string, string> = {
  primary: "bg-primary/10 text-primary border border-primary/20",
  warning: "bg-warning/10 text-warning border border-warning/20",
  error:   "bg-error/10 text-error border border-error/20",
};

interface AdminSidebarProps {
  children: React.ReactNode;
}

export default function AdminSidebar({ children }: AdminSidebarProps) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: summary } = useAdminDashboardSummary();

  const initials = user
    ? `${user.name?.[0] ?? ""}${user.last_nmae?.[0] ?? ""}`.toUpperCase()
    : "AD";

  const navItems = [
    {
      section: "General",
      items: [
        { label: "Dashboard", icon: LayoutDashboard, href: "/admin/dashboard", badge: null },
      ],
    },
    {
      section: "Gestión",
      items: [
        { label: "Usuarios", icon: Users, href: "/admin/users", badge: null },
      ],
    },
    {
      section: "Casos",
      items: [
        {
          label: "Casos",
          icon: FileSearch,
          href: "/admin/cases",
          badge: summary && summary.total > 0 ? { count: summary.total, type: "primary" } : null,
        },
        {
          label: "Avistamientos",
          icon: Eye,
          href: "/admin/sightings",
          badge: null,
        },
        {
          label: "Revisión",
          icon: AlertTriangle,
          href: "/admin/revision",
          badge: summary && summary.pending > 0 ? { count: summary.pending, type: "error" } : null,
        },
      ],
    },
    {
      section: "Sistema",
      items: [
        { label: "Configuración", icon: Settings, href: "/admin/settings", badge: null },
      ],
    },
  ];

  const handleLogout = async () => {
    try {
      await logoutUser();
      appToast.success("Sesión cerrada correctamente.");
      navigate("/login");
    } catch (err) {
      console.error("Error al cerrar sesión:", err);
      const message = err instanceof Error ? err.message : "No se pudo cerrar la sesión.";
      appToast.error(message);
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* ── Mobile toggle ───────────────────────── */}
      <button
        onClick={() => setOpen(true)}
        className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-card border border-border
                   text-text-secondary hover:text-primary hover:border-primary
                   transition-all duration-200 sm:hidden"
        aria-label="Abrir menú"
      >
        <Menu size={20} />
      </button>

      {/* ── Overlay ─────────────────────────────── */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm sm:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Sidebar ─────────────────────────────── */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-full w-64 flex flex-col
          bg-card border-r border-border
          transition-transform duration-300 ease-in-out
          ${open ? "translate-x-0" : "-translate-x-full"}
          sm:translate-x-0
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-border">
          <div className="flex items-center gap-2.5">
            <img
              src="/findMeLogo.svg"
              alt="FindMe"
              className="w-8 h-8 object-contain"
            />
            <div>
              <p className="text-sm font-bold text-text-primary leading-none">FindMe</p>
              <p className="text-[11px] text-text-secondary mt-0.5">Panel Admin</p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-md text-text-secondary hover:text-primary
                       hover:bg-primary-soft transition-all sm:hidden"
          >
            <X size={16} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {navItems.map((group) => (
            <div key={group.section}>
              <p className="text-[10px] font-semibold uppercase tracking-widest
                            text-text-secondary px-2 mb-1.5">
                {group.section}
              </p>
              <ul className="space-y-0.5">
                {group.items.map(({ label, icon: Icon, href, badge }) => {
                  const isActive = location.pathname === href;
                  return (
                    <li key={href}>
                      <a
                        href={href}
                        onClick={(e) => {
                          e.preventDefault();
                          navigate(href);
                          setOpen(false);
                        }}
                        className={`
                          flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm
                          transition-all duration-150 group relative
                          ${isActive
                            ? "bg-primary-soft text-primary font-medium"
                            : "text-text-secondary hover:bg-background hover:text-text-primary"
                          }
                        `}
                      >
                        {isActive && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2
                                           w-0.5 h-5 bg-primary rounded-r-full" />
                        )}
                        <Icon
                          size={17}
                          className={`shrink-0 transition-colors ${
                            isActive
                              ? "text-primary"
                              : "text-text-secondary group-hover:text-text-primary"
                          }`}
                        />
                        <span className="flex-1 leading-none">{label}</span>
                        {badge ? (
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5
                                            rounded-full ${badgeClass[badge.type]}`}>
                            {badge.count}
                          </span>
                        ) : isActive ? (
                          <ChevronRight size={14} className="text-primary opacity-60" />
                        ) : null}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-border space-y-1">
          <a
            href="/admin/revision"
            onClick={(e) => { e.preventDefault(); navigate("/admin/revision"); }}
            className="flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm
                       text-text-secondary hover:bg-background hover:text-text-primary
                       transition-all group"
          >
            <Bell size={17} className="shrink-0" />
            <span className="flex-1">Notificaciones</span>
            {summary && summary.pending > 0 && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full
                               bg-error/10 text-error border border-error/20">
                {summary.pending}
              </span>
            )}
          </a>

          {/* User card */}
          <div className="mt-2 flex items-center gap-3 px-2.5 py-2.5 rounded-lg
                          bg-background border border-border">
            <div className="w-8 h-8 rounded-full bg-primary-soft border border-primary/20
                            flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-primary">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-text-primary truncate">
                {user ? `${user.name} ${user.last_nmae}` : "Admin"}
              </p>
              <p className="text-[11px] text-text-secondary truncate">
                {user?.email ?? "admin@findme.com"}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="p-1 rounded-md text-text-secondary hover:text-error
                         hover:bg-error/10 transition-all"
              title="Cerrar sesión"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main content ────────────────────────── */}
      <div className="flex-1 sm:ml-64 min-w-0">
        {children}
      </div>
    </div>
  );
}

