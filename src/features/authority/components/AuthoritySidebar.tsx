import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Bell, FileSearch, LayoutDashboard, LogOut, Menu, ShieldCheck, X, ChevronRight, Eye } from 'lucide-react'
import { logoutUser } from '../../auth/services'

const authorityNavItems = [
  { to: '/authority', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/authority/cases', label: 'Casos', icon: FileSearch, exact: true },
  { to: '/authority/sightings', label: 'Avistamientos', icon: Eye, exact: true },
  { to: '/authority/cases/pending', label: 'Revisión', icon: Bell, exact: true },
  { label: 'Alertas', icon: Bell },
] as const

interface SidebarBodyProps {
  onNavigate?: () => void
  onLogout: () => void
  logoutLoading: boolean
}

function SidebarBody({ onNavigate, onLogout, logoutLoading }: SidebarBodyProps) {
  return (
    <div className="h-full bg-white border-r border-slate-200 flex flex-col font-['Syne',sans-serif]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');
        .nav-link-active { background: linear-gradient(90deg, rgba(59,130,246,0.10) 0%, rgba(59,130,246,0.04) 100%); }
        .nav-link-hover:hover { background: rgba(15,23,42,0.04); }
        .logo-glow { box-shadow: 0 12px 30px rgba(15,23,42,0.08); }
      `}</style>

      {/* Logo / Brand */}
      <div className="h-[72px] border-b border-slate-200 px-5 flex items-center gap-3.5 shrink-0">
        <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center logo-glow shrink-0">
          <img
            src="/findMeLogo.svg"
            alt="FindMe"
            className="w-6 h-6 object-contain"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
              const sibling = e.currentTarget.nextElementSibling as HTMLElement | null
              sibling?.classList.remove('hidden')
            }}
          />
          <ShieldCheck size={18} className="hidden text-blue-600" />
        </div>
        <div className="flex flex-col gap-0.5 min-w-0">
          <p className="text-sm font-bold text-slate-900 leading-none tracking-wide">FindMe</p>
          <span className="inline-flex items-center gap-1 text-[9px] font-mono font-medium tracking-[0.2em] uppercase text-blue-700/80 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-md w-fit">
            <ShieldCheck size={8} />
            Authority
          </span>
        </div>
      </div>

      {/* Nav Label */}
      <div className="px-5 pt-7 pb-2">
        <p className="text-[9px] font-mono font-medium uppercase tracking-[0.22em] text-slate-500 select-none">
          Navegación
        </p>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {authorityNavItems.map((item) => {
          const { label, icon: Icon } = item

          if ('to' in item) {
            return (
              <NavLink
                key={label}
                to={item.to}
                end={item.exact}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 ${
                    isActive
                      ? 'nav-link-active text-slate-900'
                      : 'nav-link-hover text-slate-600 hover:text-slate-900'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {/* Active bar */}
                    <span
                      className={`h-4 w-0.5 rounded-full transition-all duration-200 shrink-0 ${
                        isActive ? 'bg-blue-600' : 'bg-transparent group-hover:bg-slate-300'
                      }`}
                    />

                    {/* Icon */}
                    <span
                      className={`flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-150 ${
                        isActive
                          ? 'bg-blue-600/12 text-blue-600'
                          : 'text-slate-500 group-hover:text-slate-600 group-hover:bg-white/[0.03]'
                      }`}
                    >
                      <Icon size={15} />
                    </span>

                    {/* Label */}
                    <span className={`flex-1 text-sm ${isActive ? 'font-semibold text-slate-900' : 'font-normal'}`}>
                      {label}
                    </span>

                    {/* Arrow hint on active */}
                    {isActive && (
                      <ChevronRight size={13} className="text-blue-600/50 shrink-0" />
                    )}
                  </>
                )}
              </NavLink>
            )
          }

          return (
            <button
              key={label}
              type="button"
              className="group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-500 cursor-not-allowed opacity-50"
            >
              <span className="h-4 w-0.5 rounded-full bg-transparent shrink-0" />
              <span className="flex items-center justify-center w-7 h-7 rounded-lg text-slate-500">
                <Icon size={15} />
              </span>
              <span className="flex-1 font-normal">{label}</span>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06] text-slate-500 uppercase tracking-[0.15em]">
                Pronto
              </span>
            </button>
          )
        })}
      </nav>

      {/* Divider */}
      <div className="mx-4 border-t border-slate-200" />

      {/* Logout */}
      <div className="px-3 py-4 shrink-0">
        <button
          type="button"
          onClick={onLogout}
          disabled={logoutLoading}
          className="group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span className="h-4 w-0.5 rounded-full bg-transparent group-hover:bg-rose-300 transition-colors shrink-0" />
          <span className="flex items-center justify-center w-7 h-7 rounded-lg text-slate-500 group-hover:text-rose-400 group-hover:bg-rose-400/8 transition-all">
            <LogOut size={15} />
          </span>
          <span className="font-normal">{logoutLoading ? 'Cerrando sesión...' : 'Cerrar sesión'}</span>
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
      setMobileOpen(false)
      navigate('/login', { replace: true })
    } catch (err) {
      console.error('Error al cerrar sesión:', err)
    } finally {
      setLogoutLoading(false)
    }
  }

  return (
    <>
      {/* Desktop */}
      <aside className="hidden md:block md:w-60 md:shrink-0">
        <div className="h-full">
          <SidebarBody onLogout={() => void handleLogout()} logoutLoading={logoutLoading} />
        </div>
      </aside>

      {/* Mobile toggle */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-40 bg-white border border-slate-200 rounded-xl p-2.5 text-slate-600 hover:text-slate-900 shadow-xl transition-all"
        aria-label="Abrir menú lateral"
      >
        <Menu size={18} />
      </button>

      {mobileOpen && (
        <>
          <button
            type="button"
            className="md:hidden fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-label="Cerrar menú lateral"
          />
          <aside className="md:hidden fixed inset-y-0 left-0 z-50 w-60 shadow-2xl" style={{ animation: 'slideInLeft 0.2s ease' }}>
            <style>{`@keyframes slideInLeft { from { transform: translateX(-100%); opacity:0; } to { transform: translateX(0); opacity:1; } }`}</style>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 z-10 bg-white border border-slate-200 rounded-lg p-1.5 text-slate-600 hover:text-slate-900 transition-colors"
              aria-label="Cerrar menú"
            >
              <X size={15} />
            </button>
            <SidebarBody
              onNavigate={() => setMobileOpen(false)}
              onLogout={() => void handleLogout()}
              logoutLoading={logoutLoading}
            />
          </aside>
        </>
      )}
    </>
  )
}






