import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  Bell,
  CheckCircle,
  ChevronDown,
  Flag,
  LogOut,
  MapPin,
  Menu,
  MessageCircle,
  Plus,
  Search,
  Settings,
  User,
  UserSearch,
  X,
} from 'lucide-react'
import { useAuth } from '../../auth/hooks'
import { logoutUser } from '../../auth/services'
import { appToast } from '../../../shared/components/ui'
import { type CasoReciente, useMisCasos } from '../hooks/useMisCasos'

type DropdownKey = 'notifications' | 'messages' | 'user' | 'publish' | null

type NotificationType = 'info' | 'warning' | 'success'

interface NavbarNotification {
  id: string
  text: string
  time: string
  unread: boolean
  type: NotificationType
}

interface NavbarMessage {
  id: string
  from: string
  avatar: string
  preview: string
  time: string
  unread: boolean
}

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
  {
    key: 'avistamiento',
    label: 'Avistamiento',
    desc: 'Registrar informacion de avistamiento',
    to: '/avistamiento',
    color: 'text-primary',
    icon: <MapPin size={16} />,
  },
  {
    key: 'contenido',
    label: 'Reportar contenido',
    desc: 'Denunciar contenido inapropiado',
    to: '/reportar',
    color: 'text-warning',
    icon: <Flag size={16} />,
  },
]

function getInitials(name: string, lastName: string) {
  const first = name.trim().charAt(0).toUpperCase()
  const second = lastName.trim().charAt(0).toUpperCase()
  return `${first}${second}`.trim() || 'U'
}

function formatTime(value: string | null) {
  if (!value) return 'Reciente'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Reciente'

  const diff = Date.now() - date.getTime()
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour

  if (diff < minute) return 'Hace un momento'
  if (diff < hour) return `Hace ${Math.max(1, Math.floor(diff / minute))} min`
  if (diff < day) return `Hace ${Math.max(1, Math.floor(diff / hour))} h`
  return date.toLocaleDateString()
}

function buildNotifications(cases: CasoReciente[]): NavbarNotification[] {
  return cases.slice(0, 5).map(caso => {
    if (caso.status === 'avistado') {
      return {
        id: `notif-${caso.id}`,
        text: `Nuevo avistamiento en ${caso.numero_caso}.`,
        time: formatTime(caso.created_at),
        unread: true,
        type: 'warning' as const,
      }
    }

    if (caso.status === 'encontrado') {
      return {
        id: `notif-${caso.id}`,
        text: `El caso ${caso.numero_caso} fue marcado como encontrado.`,
        time: formatTime(caso.created_at),
        unread: false,
        type: 'success' as const,
      }
    }

    if (caso.status === 'en_revision') {
      return {
        id: `notif-${caso.id}`,
        text: `El caso ${caso.numero_caso} esta en revision de autoridad.`,
        time: formatTime(caso.created_at),
        unread: true,
        type: 'info' as const,
      }
    }

    return {
      id: `notif-${caso.id}`,
      text: `Caso ${caso.numero_caso} activo.`,
      time: formatTime(caso.created_at),
      unread: false,
      type: 'info' as const,
    }
  })
}

function buildMessages(cases: CasoReciente[]): NavbarMessage[] {
  return cases
    .filter(caso => caso.total_fotos > 0)
    .slice(0, 5)
    .map(caso => ({
      id: `msg-${caso.id}`,
      from: `${caso.nombres} ${caso.apellidos}`.trim(),
      avatar: getInitials(caso.nombres, caso.apellidos),
      preview: `${caso.total_fotos} archivo(s) multimedia en ${caso.numero_caso}.`,
      time: formatTime(caso.created_at),
      unread: caso.status !== 'encontrado',
    }))
}

function notifIcon(type: NotificationType) {
  if (type === 'warning') return <AlertTriangle size={14} className="text-warning" />
  if (type === 'success') return <CheckCircle size={14} className="text-success" />
  return <MapPin size={14} className="text-primary" />
}

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
  const ref = useRef<HTMLDivElement>(null)

  const { data: myCases = [], isLoading: casesLoading } = useMisCasos(user?.id ?? '', 6)

  const notifications = useMemo(() => buildNotifications(myCases), [myCases])
  const messages = useMemo(() => buildMessages(myCases), [myCases])

  const unreadNotifs = notifications.filter(item => item.unread).length
  const unreadMsgs = messages.filter(item => item.unread).length

  const userName = user?.name ?? 'Usuario'
  const userLastName = user?.last_nmae ?? ''
  const userEmail = user?.email ?? 'sin-correo'
  const userInitials = getInitials(userName, userLastName)

  const toggle = (key: DropdownKey) => setOpen(prev => (prev === key ? null : key))

  const closeAll = () => {
    setOpen(null)
    setMobileOpen(false)
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
      const message = err instanceof Error ? err.message : 'No se pudo cerrar la sesion.'
      appToast.error(message)
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
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center group-hover:bg-primary-hover transition-colors duration-200">
                <MapPin size={16} className="text-white" strokeWidth={2.5} />
              </div>
              <span className="font-bold text-lg text-text-primary tracking-tight hidden sm:block">
                Find<span className="text-primary">Me</span>
              </span>
            </Link>

            <div className="flex-1 max-w-md hidden md:block">
              <div className="relative">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none"
                />
                <input
                  type="text"
                  placeholder="Buscar casos por nombre o numero"
                  className="input-field pl-9 py-2 text-sm"
                />
              </div>
            </div>

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
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                      <span className="font-semibold text-sm text-text-primary">Notificaciones</span>
                      <Link
                        to="/notificaciones"
                        onClick={closeAll}
                        className="text-xs text-primary hover:text-primary-hover font-medium transition-colors"
                      >
                        Ver todas
                      </Link>
                    </div>
                    <div className="max-h-72 overflow-y-auto divide-y divide-border">
                      {casesLoading && <p className="px-4 py-3 text-xs text-text-secondary">Cargando...</p>}
                      {!casesLoading && notifications.length === 0 && (
                        <p className="px-4 py-3 text-xs text-text-secondary">No hay notificaciones recientes.</p>
                      )}
                      {!casesLoading &&
                        notifications.map(item => (
                          <div
                            key={item.id}
                            className={`flex items-start gap-3 px-4 py-3 hover:bg-background transition-colors ${
                              item.unread ? 'bg-primary-soft/40' : ''
                            }`}
                          >
                            <div className="mt-0.5 shrink-0">{notifIcon(item.type)}</div>
                            <div className="flex-1 min-w-0">
                              <p
                                className={`text-xs leading-snug ${
                                  item.unread ? 'font-medium text-text-primary' : 'text-text-secondary'
                                }`}
                              >
                                {item.text}
                              </p>
                              <p className="text-[11px] text-text-secondary mt-1">{item.time}</p>
                            </div>
                            {item.unread && <div className="w-2 h-2 rounded-full bg-primary mt-1 shrink-0" />}
                          </div>
                        ))}
                    </div>
                  </DropdownPanel>
                )}
              </div>

              <div className="relative ml-0.5">
                <IconBtn
                  active={open === 'messages'}
                  onClick={() => toggle('messages')}
                  badge={unreadMsgs}
                  title="Mensajes"
                >
                  <MessageCircle size={18} />
                </IconBtn>

                {open === 'messages' && (
                  <DropdownPanel className="right-0 w-80">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                      <span className="font-semibold text-sm text-text-primary">Mensajes</span>
                      <Link
                        to="/mensajes"
                        onClick={closeAll}
                        className="text-xs text-primary hover:text-primary-hover font-medium transition-colors"
                      >
                        Ver todos
                      </Link>
                    </div>
                    <div className="max-h-72 overflow-y-auto divide-y divide-border">
                      {casesLoading && <p className="px-4 py-3 text-xs text-text-secondary">Cargando...</p>}
                      {!casesLoading && messages.length === 0 && (
                        <p className="px-4 py-3 text-xs text-text-secondary">No hay mensajes recientes.</p>
                      )}
                      {!casesLoading &&
                        messages.map(message => (
                          <div
                            key={message.id}
                            className={`flex items-start gap-3 px-4 py-3 hover:bg-background transition-colors ${
                              message.unread ? 'bg-primary-soft/40' : ''
                            }`}
                          >
                            <div className="w-8 h-8 rounded-full bg-primary-soft text-primary text-[11px] font-bold flex items-center justify-center shrink-0">
                              {message.avatar}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p
                                className={`text-xs ${
                                  message.unread ? 'font-semibold text-text-primary' : 'text-text-secondary'
                                }`}
                              >
                                {message.from}
                              </p>
                              <p className="text-xs text-text-secondary truncate mt-0.5">{message.preview}</p>
                            </div>
                            <div className="shrink-0 text-[11px] text-text-secondary">{message.time}</div>
                          </div>
                        ))}
                    </div>
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
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                    <span className="text-white text-xs font-bold select-none">{userInitials}</span>
                  </div>
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
                        { icon: <Settings size={15} />, label: 'Configuracion', to: '/configuracion' },
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
                        {loggingOut ? 'Cerrando...' : 'Cerrar sesion'}
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
            <div className="relative mb-3">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none"
              />
              <input type="text" placeholder="Buscar casos" className="input-field pl-9 py-2 text-sm" />
            </div>
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
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </nav>
    </>
  )
}
