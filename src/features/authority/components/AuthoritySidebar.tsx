import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Bell, FileSearch, LayoutDashboard, LogOut, Menu, ShieldCheck, X, Eye } from 'lucide-react'
import { logoutUser } from '../../auth/services'
import { appToast } from '../../../shared/components/ui'
import { useAuth } from '../../auth/hooks'

const authorityNavItems = [
  { to: '/authority',               label: 'Dashboard',     icon: LayoutDashboard, exact: true },
  { to: '/authority/cases',         label: 'Casos',         icon: FileSearch,      exact: true },
  { to: '/authority/sightings',     label: 'Avistamientos', icon: Eye,             exact: true },
  { to: '/authority/cases/pending', label: 'Revisión',      icon: Bell,            exact: true },
] as const

interface SidebarBodyProps {
  onNavigate?: () => void
  onLogout: () => void
  logoutLoading: boolean
  onClose?: () => void
}

function SidebarBody({ onNavigate, onLogout, logoutLoading, onClose }: SidebarBodyProps) {
  const { user } = useAuth()

  const initials = user
    ? `${user.name?.[0] ?? ''}${user.last_nmae?.[0] ?? ''}`.toUpperCase()
    : 'AU'

  return (
    <div className="flex flex-col h-full bg-card border-r border-border">

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <img
            src="/findMeLogo.svg"
            alt="FindMe"
            className="w-8 h-8 object-contain"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
          <div>
            <p className="text-sm font-bold text-text-primary leading-none">FindMe</p>
            <p className="text-[11px] text-text-secondary mt-0.5">Panel Autoridad</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-text-secondary hover:text-primary hover:bg-primary-soft transition-all sm:hidden"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-text-secondary px-2 mb-1.5">
          Navegación
        </p>
        <ul className="space-y-0.5">
          {authorityNavItems.map(({ to, label, icon: Icon, exact }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={exact}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm transition-all duration-150 group relative
                  ${isActive
                    ? 'bg-primary-soft text-primary font-medium'
                    : 'text-text-secondary hover:bg-background hover:text-text-primary'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r-full" />
                    )}
                    <Icon
                      size={17}
                      className={`shrink-0 transition-colors ${isActive ? 'text-primary' : 'text-text-secondary group-hover:text-text-primary'}`}
                    />
                    <span className="flex-1 leading-none">{label}</span>
                    {isActive && (
                      <ShieldCheck size={13} className="text-primary opacity-50" />
                    )}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* User + Logout */}
      <div className="px-3 py-4 border-t border-border space-y-1">
        {user && (
          <div className="flex items-center gap-2.5 px-2.5 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-warning/10 border border-warning/20 flex items-center justify-center shrink-0">
              <span className="text-xs font-semibold text-warning">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-text-primary truncate">
                {user.name} {user.last_nmae}
              </p>
              <p className="text-[11px] text-text-secondary truncate">{user.email}</p>
            </div>
          </div>
        )}
        <button
          onClick={onLogout}
          disabled={logoutLoading}
          className="flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm w-full
                     text-text-secondary hover:bg-error/8 hover:text-error
                     transition-all duration-150 group disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <LogOut size={17} className="shrink-0 group-hover:text-error transition-colors" />
          <span>{logoutLoading ? 'Cerrando sesión...' : 'Cerrar sesión'}</span>
        </button>
      </div>
    </div>
  )
}

export function AuthoritySidebar() {
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [logoutLoading, setLogoutLoading] = useState(false)

  const handleLogout = async () => {
    setLogoutLoading(true)
    try {
      await logoutUser()
      appToast.success('Sesión cerrada correctamente.')
      setMobileOpen(false)
      navigate('/login', { replace: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo cerrar la sesión.'
      appToast.error(message)
    } finally {
      setLogoutLoading(false)
    }
  }

  return (
    <>
      {/* Desktop */}
      <aside className="hidden sm:flex w-64 shrink-0 h-full">
        <SidebarBody onLogout={() => void handleLogout()} logoutLoading={logoutLoading} />
      </aside>

      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-card border border-border
                   text-text-secondary hover:text-primary hover:border-primary
                   transition-all duration-200 sm:hidden"
        aria-label="Abrir menú"
      >
        <Menu size={20} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm sm:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 sm:hidden
                    transition-transform duration-300 ease-in-out
                    ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <SidebarBody
          onNavigate={() => setMobileOpen(false)}
          onLogout={() => void handleLogout()}
          logoutLoading={logoutLoading}
          onClose={() => setMobileOpen(false)}
        />
      </aside>
    </>
  )
}
