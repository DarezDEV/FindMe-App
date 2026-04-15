import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Bell,
  CheckCircle,
  ChevronDown,
  Flag,
  LogOut,
  MapPin,
  Menu,
  Plus,
  Search,
  User,
  UserSearch,
  X,
} from 'lucide-react'
import { useAuth } from '../../auth/hooks'
import { logoutUser } from '../../auth/services'
import { appToast, ProfileAvatar } from '../../../shared/components/ui'
import { handleError } from '../../../shared/utils/handleError'
import { NotificationsDropdown } from '../../notifications/components/NotificationsDropdown'
import { useNotifications } from '../../notifications/hooks/useNotifications'

type DropdownKey = 'notifications' | 'user' | 'publish' | null

interface PublishOption {
  key: string
  label: string
  desc: string
  to: string
  color: string
  icon: ReactNode
}

const publishOptions: PublishOption[] = [
  {
    key: 'desaparecida',
    label: 'Persona desaparecida',
    desc: 'Crear un nuevo reporte',
    to: '/publicar',
    color: 'text-error',
    icon: <UserSearch size={16} />,
  },
]

function Badge({ count }: { count: number }) {
  if (!count) return null
  return (
    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-error text-white text-[10px] font-bold rounded-full leading-none pointer-events-none">
      {count > 9 ? '9+' : count}
    </span>
  )
}

function IconBtn({
  active = false,
  badge = 0,
  children,
  onClick,
  title,
}: {
  children: ReactNode
  active?: boolean
  onClick?: () => void
  title?: string
  badge?: number
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`relative flex items-center justify-center w-9 h-9 rounded-lg text-text-secondary hover:text-primary hover:bg-primary-soft transition-all duration-150 cursor-pointer ${
        active ? 'bg-primary-soft text-primary' : ''
      }`}
    >
      {children}
      <Badge count={badge} />
    </button>
  )
}

function DropdownPanel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`absolute top-full mt-2 bg-card border border-border rounded-xl shadow-lg z-50 origin-top-right animate-dropdown ${className}`}
    >
      {children}
    </div>
  )
}

export default function UserNavbar() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [open, setOpen] = useState<DropdownKey>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const location = useLocation()

  const { unreadCount: unreadNotifs } = useNotifications({ includeList: false })

  const userName = user?.name ?? 'Usuario'
  const userLastName = user?.last_nmae ?? ''
  const userEmail = user?.email ?? 'sin-correo'

  const toggle = (key: DropdownKey) => setOpen(prev => (prev === key ? null : key))

  const closeAll = () => {
    setOpen(null)
    setMobileOpen(false)
  }

  const handleSearchSubmit = (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault()
    const trimmed = searchTerm.trim()
    if (trimmed) {
      navigate(`/user?q=${encodeURIComponent(trimmed)}`)
    } else {
      navigate('/user')
    }
    closeAll()
  }

  const handleLogout = async () => {
    if (loggingOut) return
    setLoggingOut(true)
    try {
      await logoutUser()
      appToast.success('Sesion cerrada correctamente.')
      closeAll()
      navigate('/login', { replace: true })
    } catch (err) {
      handleError('UserNavbar.logout', err, { fallbackMessage: 'No se pudo cerrar la sesión.' })
    } finally {
      setLoggingOut(false)
    }
  }

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(null)
    }

    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const q = params.get('q') ?? ''
    setSearchTerm(q)
  }, [location.pathname, location.search])

  return (
    <>
      <style>{`
        @keyframes dropdown {
          from { opacity: 0; transform: scale(0.96) translateY(-6px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-dropdown { animation: dropdown 0.15s ease-out forwards; }
      `}</style>

      <nav
        ref={ref}
        className={`sticky top-0 z-50 bg-card border-b border-border transition-shadow duration-200 ${
          scrolled ? 'shadow-md' : 'shadow-sm'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16 gap-3">
            <Link to="/user" className="flex items-center gap-2 shrink-0 group" onClick={closeAll}>
              <img
                src="/findMeLogo.svg"
                alt="FindMe System"
                className="w-9 h-9 object-contain"
                onError={(event) => {
                  event.currentTarget.style.display = 'none'
                  event.currentTarget.nextElementSibling?.classList.remove('hidden')
                }}
              />
              <svg className="w-8 h-8 text-primary hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
                />
              </svg>
              <span className="font-bold text-lg text-text-primary tracking-tight hidden sm:block">
                FindMe System
              </span>
            </Link>

            <form className="flex-1 max-w-md hidden md:block" onSubmit={handleSearchSubmit}>
              <div className="relative">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none"
                />
                <input
                  type="text"
                  placeholder="Buscar casos por nombre o numero"
                  className="input-field pl-9 py-2 text-sm"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>
            </form>

            <div className="flex items-center gap-0.5">
              
              <div className="relative ml-1">
                <button
                  onClick={() => toggle('publish')}
                  className="btn-primary flex items-center gap-1.5 py-2 px-3 text-sm"
                >
                  <Plus size={16} strokeWidth={2.5} />
                  <span className="hidden sm:block">Publicar</span>
                  <ChevronDown
                    size={14}
                    className={`hidden sm:block transition-transform duration-200 ${
                      open === 'publish' ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {open === 'publish' && (
                  <DropdownPanel className="right-0 w-72 p-2">
                    <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider px-3 pt-1 pb-2">
                      Que deseas publicar?
                    </p>
                    {publishOptions.map(option => (
                      <Link
                        key={option.key}
                        to={option.to}
                        onClick={closeAll}
                        className="w-full flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-background transition-colors duration-150 text-left group"
                      >
                        <span
                          className={`mt-0.5 ${option.color} group-hover:scale-110 transition-transform duration-150`}
                        >
                          {option.icon}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-text-primary">{option.label}</p>
                          <p className="text-xs text-text-secondary">{option.desc}</p>
                        </div>
                      </Link>
                    ))}
                  </DropdownPanel>
                )}
              </div>

              <div className="relative ml-0.5">
                <IconBtn
                  active={open === 'notifications'}
                  onClick={() => toggle('notifications')}
                  badge={unreadNotifs}
                  title="Notificaciones"
                >
                  <Bell size={18} />
                </IconBtn>

                {open === 'notifications' && (
                  <DropdownPanel className="right-0 w-80">
                    <NotificationsDropdown onNavigate={closeAll} />
                  </DropdownPanel>
                )}
              </div>

              <Link to="/reportar" onClick={closeAll}>
                <IconBtn title="Reportar contenido">
                  <Flag size={18} />
                </IconBtn>
              </Link>

              <div className="relative ml-1">
                <button
                  onClick={() => toggle('user')}
                  className={`flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg hover:bg-background transition-colors duration-150 ${
                    open === 'user' ? 'bg-background' : ''
                  }`}
                >
                  <ProfileAvatar
                    name={userName}
                    lastName={userLastName}
                    src={user?.avatar_url ?? null}
                    size={32}
                    rounded="full"
                    className="shrink-0"
                  />
                  <ChevronDown
                    size={14}
                    className={`text-text-secondary hidden sm:block transition-transform duration-200 ${
                      open === 'user' ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {open === 'user' && (
                  <DropdownPanel className="right-0 w-56">
                    <div className="px-4 py-3 border-b border-border">
                      <p className="text-sm font-semibold text-text-primary">
                        {userName} {userLastName}
                      </p>
                      <p className="text-xs text-text-secondary">{userEmail}</p>
                      <span className="badge-user mt-1.5 inline-flex">Usuario</span>
                    </div>
                    <div className="p-1.5">
                      {[
                        { icon: <User size={15} />, label: 'Mi perfil', to: '/perfil' },
                        { icon: <CheckCircle size={15} />, label: 'Mis casos', to: '/mis-casos' },
                      ].map(item => (
                        <Link
                          key={item.label}
                          to={item.to}
                          onClick={closeAll}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-text-secondary hover:bg-background hover:text-text-primary transition-colors duration-150"
                        >
                          {item.icon}
                          {item.label}
                        </Link>
                      ))}
                    </div>
                    <div className="p-1.5 border-t border-border">
                      <button
                        onClick={handleLogout}
                        disabled={loggingOut}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-error hover:bg-error/5 transition-colors duration-150 disabled:opacity-60"
                      >
                        <LogOut size={15} />
                        {loggingOut ? 'Cerrando...' : 'Cerrar sesión'}
                      </button>
                    </div>
                  </DropdownPanel>
                )}
              </div>

              <button
                className="relative flex items-center justify-center w-9 h-9 rounded-lg text-text-secondary hover:text-primary hover:bg-primary-soft transition-all duration-150 md:hidden ml-1"
                onClick={() => setMobileOpen(prev => !prev)}
                aria-label="Menu"
              >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden border-t border-border bg-card px-4 py-3 space-y-1">
            <form className="relative mb-3" onSubmit={handleSearchSubmit}>
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none"
              />
              <input
                type="text"
                placeholder="Buscar casos"
                className="input-field pl-9 py-2 text-sm"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </form>
            {[
              { icon: <UserSearch size={16} />, label: 'Nuevo reporte', to: '/publicar' },
              { icon: <MapPin size={16} />, label: 'Reportar avistamiento', to: '/avistamiento' },
              { icon: <Bell size={16} />, label: 'Notificaciones', to: '/notificaciones' },
              { icon: <Flag size={16} />, label: 'Reportar contenido', to: '/reportar' },
              { icon: <CheckCircle size={16} />, label: 'Mis casos', to: '/mis-casos' },
            ].map(item => (
              <Link
                key={item.label}
                to={item.to}
                onClick={closeAll}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-text-secondary hover:bg-background hover:text-text-primary transition-colors duration-150"
              >
                {item.icon}
                <span className="flex-1">{item.label}</span>
                {item.to === '/notificaciones' && unreadNotifs > 0 && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-error/10 text-error border border-error/20">
                    {unreadNotifs > 99 ? '99+' : unreadNotifs}
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </nav>
    </>
  )
}
