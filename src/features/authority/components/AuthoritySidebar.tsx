import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Bell, FileSearch, LayoutDashboard, LogOut, Menu, ShieldCheck, X } from 'lucide-react'
import { logoutUser } from '../../auth/services'
import { appToast } from '../../../shared/components/ui'

const authorityNavItems = [
  { to: '/authority', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/authority/cases', label: 'Casos', icon: FileSearch, exact: true },
  { to: '/authority/cases/pending', label: 'Revision', icon: Bell, exact: true },
  { label: 'Alertas', icon: Bell },
] as const

interface SidebarBodyProps {
  onNavigate?: () => void
  onLogout: () => void
  logoutLoading: boolean
}

function SidebarBody({ onNavigate, onLogout, logoutLoading }: SidebarBodyProps) {
  return (
    <div className="h-full bg-card border-r border-border/90 flex flex-col">
      <div className="h-20 border-b border-border/80 px-5 flex items-center gap-4 shrink-0">
        <div className="w-11 h-11 rounded-xl bg-primary-soft/60 text-primary flex items-center justify-center border border-border/70">
          <img
            src="/findMeLogo.svg"
            alt="FindMe"
            className="w-8 h-8 object-contain"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
              const sibling = e.currentTarget.nextElementSibling as HTMLElement | null
              sibling?.classList.remove('hidden')
            }}
          />
          <ShieldCheck size={22} className="hidden text-primary" />
        </div>
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-semibold tracking-wide text-text-primary leading-none">FindMe</p>
          <span className="inline-flex items-center gap-1 text-[10px] font-medium tracking-[0.18em] uppercase text-primary bg-primary-soft/80 px-2 py-0.5 rounded-full w-fit">
            <ShieldCheck size={9} />
            Authority
          </span>
        </div>
      </div>

      <div className="px-5 pt-6 pb-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary/55 select-none">
          Navegacion
        </p>
      </div>

      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
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
                  `group w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors border ${
                    isActive
                      ? 'bg-primary-soft/45 text-text-primary border-primary/25'
                      : 'text-text-secondary border-transparent hover:bg-primary-soft/25 hover:text-text-primary'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={`h-5 w-0.5 rounded-full ${
                        isActive ? 'bg-primary' : 'bg-transparent group-hover:bg-primary/35'
                      }`}
                    />
                    <span
                      className={`flex items-center justify-center w-7 h-7 rounded-md transition-colors ${
                        isActive
                          ? 'bg-primary/12 text-primary'
                          : 'text-text-secondary group-hover:text-text-primary'
                      }`}
                    >
                      <Icon size={16} />
                    </span>
                    <span className={isActive ? 'font-medium' : 'font-normal'}>{label}</span>
                  </>
                )}
              </NavLink>
            )
          }

          return (
            <button
              key={label}
              type="button"
              onClick={onNavigate}
              className="group w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-text-secondary/60 border border-transparent hover:bg-primary-soft/20 hover:text-text-secondary transition-colors cursor-not-allowed"
            >
              <span className="h-5 w-0.5 rounded-full bg-transparent" />
              <span className="flex items-center justify-center w-7 h-7 rounded-md text-text-secondary/50">
                <Icon size={16} />
              </span>
              <span>{label}</span>
              <span className="ml-auto text-[9px] px-2 py-0.5 rounded-full bg-border text-text-secondary/70 font-medium tracking-wide uppercase">
                Pronto
              </span>
            </button>
          )
        })}
      </nav>

      <div className="px-3 pb-4 pt-3 border-t border-border/80 shrink-0">
        <button
          type="button"
          onClick={onLogout}
          disabled={logoutLoading}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-text-secondary border border-transparent hover:bg-red-50/70 hover:text-red-500 transition-colors group disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <span className="h-5 w-0.5 rounded-full bg-transparent group-hover:bg-red-300/80" />
          <span className="flex items-center justify-center w-7 h-7 rounded-md group-hover:text-red-500 text-text-secondary/60 transition-colors">
            <LogOut size={16} />
          </span>
          <span>{logoutLoading ? 'Cerrando sesion...' : 'Cerrar sesion'}</span>
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
      appToast.success('Sesion cerrada correctamente.')
      setMobileOpen(false)
      navigate('/login', { replace: true })
    } catch (err) {
      console.error('Error al cerrar sesion:', err)
      const message = err instanceof Error ? err.message : 'No se pudo cerrar la sesion.'
      appToast.error(message)
    } finally {
      setLogoutLoading(false)
    }
  }

  return (
    <>
      <aside className="hidden md:block md:w-64 md:shrink-0">
        <div className="h-full">
          <SidebarBody onLogout={() => void handleLogout()} logoutLoading={logoutLoading} />
        </div>
      </aside>

      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-40 bg-card border border-border rounded-xl p-2.5 text-text-primary shadow-md transition-all hover:shadow-lg"
        aria-label="Abrir menu lateral"
      >
        <Menu size={20} />
      </button>

      {mobileOpen && (
        <>
          <button
            type="button"
            className="md:hidden fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-label="Cerrar menu lateral"
          />

          <aside className="md:hidden fixed inset-y-0 left-0 z-50 w-64 shadow-2xl animate-in slide-in-from-left duration-200">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 z-10 bg-card border border-border rounded-lg p-1.5 text-text-secondary hover:text-text-primary transition-colors"
              aria-label="Cerrar menu lateral"
            >
              <X size={16} />
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
