import { useState, useEffect, useRef } from 'react'
import {
  MapPin, Bell, MessageCircle, Search, Plus, Heart,
  Flag, CheckCircle, Menu, X, User, LogOut,
  Settings, AlertTriangle, UserSearch, ChevronDown, HandHeart
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────
type DropdownKey = 'notifications' | 'messages' | 'user' | 'publish' | null

interface Notification {
  id: number
  text: string
  time: string
  unread: boolean
  type: 'match' | 'verified' | 'sighting'
}

interface Message {
  id: number
  from: string
  avatar: string
  preview: string
  time: string
  unread: boolean
}

// ── Mock data ──────────────────────────────────────────────────────────────
const notifications: Notification[] = [
  { id: 1, text: 'Posible coincidencia encontrada para caso #1042', time: 'Hace 5 min', unread: true, type: 'match' },
  { id: 2, text: 'Tu reporte fue verificado por una autoridad', time: 'Hace 1 hora', unread: true, type: 'verified' },
  { id: 3, text: 'Nuevo avistamiento en tu zona de interés', time: 'Hace 3 horas', unread: false, type: 'sighting' },
]

const messages: Message[] = [
  { id: 1, from: 'Autoridad Zona Norte', avatar: 'AZ', preview: 'Necesitamos más detalles sobre el caso…', time: '10:32', unread: true },
  { id: 2, from: 'María González', avatar: 'MG', preview: 'Gracias por la información proporcionada', time: 'Ayer', unread: false },
]

const notifIcon = (type: Notification['type']) => {
  if (type === 'match') return <AlertTriangle size={14} className="text-warning" />
  if (type === 'verified') return <CheckCircle size={14} className="text-success" />
  return <MapPin size={14} className="text-primary" />
}

const publishOptions = [
  { icon: <UserSearch size={16} />, label: 'Persona desaparecida', desc: 'Reportar a alguien que no se encuentra', color: 'text-error' },
  { icon: <CheckCircle size={16} />, label: 'Persona encontrada', desc: 'Marcar un caso como resuelto', color: 'text-success' },
  { icon: <MapPin size={16} />, label: 'Avistamiento', desc: 'Informar sobre un posible avistamiento', color: 'text-primary' },
]

// ── Badge counter ──────────────────────────────────────────────────────────
function Badge({ count }: { count: number }) {
  if (!count) return null
  return (
    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center
                     bg-error text-white text-[10px] font-bold rounded-full leading-none pointer-events-none">
      {count > 9 ? '9+' : count}
    </span>
  )
}

// ── Icon button ────────────────────────────────────────────────────────────
function IconBtn({
  children,
  active = false,
  onClick,
  title,
  badge = 0,
}: {
  children: React.ReactNode
  active?: boolean
  onClick?: () => void
  title?: string
  badge?: number
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`relative flex items-center justify-center w-9 h-9 rounded-lg
                  text-text-secondary hover:text-primary hover:bg-primary-soft
                  transition-all duration-150 cursor-pointer
                  ${active ? 'bg-primary-soft text-primary' : ''}`}
    >
      {children}
      <Badge count={badge} />
    </button>
  )
}

// ── Dropdown panel ─────────────────────────────────────────────────────────
function DropdownPanel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`absolute top-full mt-2 bg-card border border-border rounded-xl shadow-lg z-50
                  origin-top-right animate-dropdown ${className}`}
    >
      {children}
    </div>
  )
}

// ── Main Navbar ────────────────────────────────────────────────────────────
export default function UserNavbar() {
  const [open, setOpen] = useState<DropdownKey>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const unreadNotifs = notifications.filter(n => n.unread).length
  const unreadMsgs = messages.filter(m => m.unread).length

  const toggle = (key: DropdownKey) => setOpen(prev => (prev === key ? null : key))

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(null)
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
          to   { opacity: 1; transform: scale(1)    translateY(0);    }
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

            {/* ── Logo ── */}
            <a href="/" className="flex items-center gap-2 shrink-0 group">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center
                              group-hover:bg-primary-hover transition-colors duration-200">
                <MapPin size={16} className="text-white" strokeWidth={2.5} />
              </div>
              <span className="font-bold text-lg text-text-primary tracking-tight hidden sm:block">
                Find<span className="text-primary">Me</span>
              </span>
            </a>

            {/* ── Search ── */}
            <div className="flex-1 max-w-md hidden md:block">
              <div className="relative">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none"
                />
                <input
                  type="text"
                  placeholder="Buscar casos, nombres, ubicaciones…"
                  className="input-field pl-9 py-2 text-sm"
                />
              </div>
            </div>

            {/* ── Right actions ── */}
            <div className="flex items-center gap-0.5">

           
              {/* Donate */}
              <a
                href="/donate"
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium
                           text-text-secondary hover:text-primary hover:bg-primary-soft transition-all duration-150"
              >
                <HandHeart size={16} />
                <span className="hidden lg:block">Donar</span>
              </a>

              {/* ── Publish dropdown ── */}
              <div className="relative ml-1">
                <button
                  onClick={() => toggle('publish')}
                  className="btn-primary flex items-center gap-1.5 py-2 px-3 text-sm"
                >
                  <Plus size={16} strokeWidth={2.5} />
                  <span className="hidden sm:block">Publicar</span>
                  <ChevronDown
                    size={14}
                    className={`hidden sm:block transition-transform duration-200 ${open === 'publish' ? 'rotate-180' : ''}`}
                  />
                </button>

                {open === 'publish' && (
                  <DropdownPanel className="right-0 w-72 p-2">
                    <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider px-3 pt-1 pb-2">
                      ¿Qué deseas publicar?
                    </p>
                    {publishOptions.map(opt => (
                      <button
                        key={opt.label}
                        className="w-full flex items-start gap-3 px-3 py-2.5 rounded-lg
                                   hover:bg-background transition-colors duration-150 text-left group"
                      >
                        <span className={`mt-0.5 ${opt.color} group-hover:scale-110 transition-transform duration-150`}>
                          {opt.icon}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-text-primary">{opt.label}</p>
                          <p className="text-xs text-text-secondary">{opt.desc}</p>
                        </div>
                      </button>
                    ))}
                  </DropdownPanel>
                )}
              </div>

              {/* ── Notifications ── */}
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
                      {unreadNotifs > 0 && (
                        <button className="text-xs text-primary hover:text-primary-hover font-medium transition-colors">
                          Marcar todo leído
                        </button>
                      )}
                    </div>
                    <div className="max-h-72 overflow-y-auto divide-y divide-border">
                      {notifications.map(n => (
                        <div
                          key={n.id}
                          className={`flex items-start gap-3 px-4 py-3 hover:bg-background
                                      transition-colors cursor-pointer ${n.unread ? 'bg-primary-soft/40' : ''}`}
                        >
                          <div className="mt-0.5 shrink-0">{notifIcon(n.type)}</div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs leading-snug ${n.unread ? 'font-medium text-text-primary' : 'text-text-secondary'}`}>
                              {n.text}
                            </p>
                            <p className="text-[11px] text-text-secondary mt-1">{n.time}</p>
                          </div>
                          {n.unread && <div className="w-2 h-2 rounded-full bg-primary mt-1 shrink-0" />}
                        </div>
                      ))}
                    </div>
                    <div className="px-4 py-2.5 border-t border-border">
                      <a href="/notifications" className="text-xs text-primary hover:text-primary-hover font-medium transition-colors">
                        Ver todas las notificaciones →
                      </a>
                    </div>
                  </DropdownPanel>
                )}
              </div>

            

              {/* Report */}
              <IconBtn title="Reportar contenido inapropiado">
                <Flag size={18} />
              </IconBtn>

              {/* ── User menu ── */}
              <div className="relative ml-1">
                <button
                  onClick={() => toggle('user')}
                  className={`flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg
                              hover:bg-background transition-colors duration-150
                              ${open === 'user' ? 'bg-background' : ''}`}
                >
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                    <span className="text-white text-xs font-bold select-none">JD</span>
                  </div>
                  <ChevronDown
                    size={14}
                    className={`text-text-secondary hidden sm:block transition-transform duration-200
                                ${open === 'user' ? 'rotate-180' : ''}`}
                  />
                </button>

                {open === 'user' && (
                  <DropdownPanel className="right-0 w-56">
                    <div className="px-4 py-3 border-b border-border">
                      <p className="text-sm font-semibold text-text-primary">Juan Díaz</p>
                      <p className="text-xs text-text-secondary">juan@email.com</p>
                      <span className="badge-user mt-1.5 inline-flex">👤 Usuario</span>
                    </div>
                    <div className="p-1.5">
                      {[
                        { icon: <User size={15} />, label: 'Mi perfil', href: '/profile' },
                        { icon: <CheckCircle size={15} />, label: 'Mis casos', href: '/my-cases' },
                        { icon: <Heart size={15} />, label: 'Donaciones', href: '/donate' },
                        { icon: <Settings size={15} />, label: 'Configuración', href: '/settings' },
                      ].map(item => (
                        <a
                          key={item.label}
                          href={item.href}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm
                                     text-text-secondary hover:bg-background hover:text-text-primary
                                     transition-colors duration-150"
                        >
                          {item.icon}
                          {item.label}
                        </a>
                      ))}
                    </div>
                    <div className="p-1.5 border-t border-border">
                      <button
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm
                                   text-error hover:bg-error/5 transition-colors duration-150"
                      >
                        <LogOut size={15} />
                        Cerrar sesión
                      </button>
                    </div>
                  </DropdownPanel>
                )}
              </div>

              {/* Mobile toggle */}
              <button
                className="relative flex items-center justify-center w-9 h-9 rounded-lg
                           text-text-secondary hover:text-primary hover:bg-primary-soft
                           transition-all duration-150 md:hidden ml-1"
                onClick={() => setMobileOpen(p => !p)}
                aria-label="Menú"
              >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>

        {/* ── Mobile expanded menu ── */}
        {mobileOpen && (
          <div className="md:hidden border-t border-border bg-card px-4 py-3 space-y-1">
            <div className="relative mb-3">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none"
              />
              <input
                type="text"
                placeholder="Buscar casos, nombres…"
                className="input-field pl-9 py-2 text-sm"
              />
            </div>
            {[
              { icon: <MapPin size={16} />, label: 'Explorar mapa', href: '/map' },
              { icon: <HandHeart size={16} />, label: 'Realizar donación', href: '/donate' },
              { icon: <Flag size={16} />, label: 'Reportar contenido', href: '/report' },
              { icon: <CheckCircle size={16} />, label: 'Mis casos', href: '/my-cases' },
            ].map(item => (
              <a
                key={item.label}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm
                           text-text-secondary hover:bg-background hover:text-text-primary
                           transition-colors duration-150"
              >
                {item.icon}
                {item.label}
              </a>
            ))}
          </div>
        )}
      </nav>
    </>
  )
}