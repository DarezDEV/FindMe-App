import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Bell, FileSearch, LayoutDashboard, Menu, ShieldCheck, X, LogOut } from 'lucide-react'

const authorityNavItems = [
  { to: '/authority', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/authority/cases', label: 'Casos', icon: FileSearch },
  { label: 'Alertas', icon: Bell },
] as const

interface SidebarBodyProps {
  onNavigate?: () => void
}

function SidebarBody({ onNavigate }: SidebarBodyProps) {
  return (
    <div className="h-full bg-card border-r border-border flex flex-col">

      {/* Header / Brand */}
      <div className="h-20 border-b border-border px-5 flex items-center gap-4 shrink-0">
        <div className="w-11 h-11 rounded-xl bg-primary-soft text-primary flex items-center justify-center shadow-sm border border-border">
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
          <p className="text-sm font-bold tracking-wide text-text-primary leading-none">FindMe</p>
          <span className="inline-flex items-center gap-1 text-[10px] font-medium tracking-widest uppercase text-primary bg-primary-soft px-2 py-0.5 rounded-full w-fit">
            <ShieldCheck size={9} />
            Authority
          </span>
        </div>
      </div>

      {/* Nav label */}
      <div className="px-5 pt-5 pb-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-text-secondary/50 select-none">
          Navegación
        </p>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {authorityNavItems.map((item) => {
          const { label, icon: Icon } = item

          if ('to' in item) {
            return (
              <NavLink
                key={label}
                to={item.to}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `group w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
                    isActive
                      ? 'bg-primary-soft text-primary font-semibold shadow-sm'
                      : 'text-text-secondary hover:bg-primary-soft/60 hover:text-text-primary'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={`flex items-center justify-center w-7 h-7 rounded-md transition-colors ${
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-text-secondary group-hover:text-text-primary'
                      }`}
                    >
                      <Icon size={16} />
                    </span>
                    <span>{label}</span>
                    {isActive && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
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
              onClick={onNavigate}
              className="group w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-text-secondary/60 hover:bg-primary-soft/40 hover:text-text-secondary transition-all duration-150 cursor-not-allowed"
            >
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

      {/* Footer */}
      <div className="px-3 pb-4 pt-3 border-t border-border shrink-0">
        <button
          type="button"
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-text-secondary hover:bg-red-50 hover:text-red-500 transition-all duration-150 group"
        >
          <span className="flex items-center justify-center w-7 h-7 rounded-md group-hover:text-red-500 text-text-secondary/60 transition-colors">
            <LogOut size={16} />
          </span>
          <span>Cerrar sesión</span>
        </button>
      </div>
    </div>
  )
}

export function AuthoritySidebar() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:block md:w-64 md:shrink-0">
        <div className="h-full">
          <SidebarBody />
        </div>
      </aside>

      {/* Mobile toggle button */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-40 bg-card border border-border rounded-xl p-2.5 text-text-primary shadow-md transition-all hover:shadow-lg"
        aria-label="Abrir menú lateral"
      >
        <Menu size={20} />
      </button>

      {/* Mobile overlay + sidebar */}
      {mobileOpen && (
        <>
          <button
            type="button"
            className="md:hidden fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-label="Cerrar menú lateral"
          />

          <aside className="md:hidden fixed inset-y-0 left-0 z-50 w-64 shadow-2xl animate-in slide-in-from-left duration-200">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 z-10 bg-card border border-border rounded-lg p-1.5 text-text-secondary hover:text-text-primary transition-colors"
              aria-label="Cerrar menú lateral"
            >
              <X size={16} />
            </button>
            <SidebarBody onNavigate={() => setMobileOpen(false)} />
          </aside>
        </>
      )}
    </>
  )
}
