import { useEffect, useRef, useState } from 'react'
import { ChevronDown, CheckCircle, LogOut, User } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../features/auth/hooks'
import { logoutUser } from '../../../features/auth/services'
import { appToast } from '../ui'

function getInitials(name: string, lastName: string) {
  const first = name.trim().charAt(0).toUpperCase()
  const second = lastName.trim().charAt(0).toUpperCase()
  return `${first}${second}`.trim() || 'U'
}

interface UserProfileMenuProps {
  open: boolean
  onToggle: () => void
  onClose: () => void
  roleLabel?: string
  badgeClassName?: string
  align?: 'left' | 'right'
  items?: Array<{ icon: React.ReactNode; label: string; to: string }>
}

export default function UserProfileMenu({
  open,
  onToggle,
  onClose,
  roleLabel = 'Usuario',
  badgeClassName = 'badge-user',
  align = 'right',
  items,
}: UserProfileMenuProps) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [loggingOut, setLoggingOut] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const userName = user?.name ?? 'Usuario'
  const userLastName = user?.last_nmae ?? ''
  const userEmail = user?.email ?? 'sin-correo'
  const userInitials = getInitials(userName, userLastName)
  const menuItems = items ?? [
    { icon: <User size={15} />, label: 'Mi perfil', to: '/perfil' },
    { icon: <CheckCircle size={15} />, label: 'Mis casos', to: '/mis-casos' },
  ]

  const handleLogout = async () => {
    if (loggingOut) return
    setLoggingOut(true)
    try {
      await logoutUser()
      appToast.success('Sesion cerrada correctamente.')
      onClose()
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
      if (ref.current && !ref.current.contains(event.target as Node)) onClose()
    }

    if (open) {
      document.addEventListener('mousedown', handler)
    }
    return () => document.removeEventListener('mousedown', handler)
  }, [open, onClose])

  return (
    <div ref={ref} className="relative">
      <style>{`
        @keyframes dropdown {
          from { opacity: 0; transform: scale(0.96) translateY(-6px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-dropdown { animation: dropdown 0.15s ease-out forwards; }
      `}</style>
      <button
        onClick={onToggle}
        className={`flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg hover:bg-background transition-colors duration-150 ${
          open ? 'bg-background' : ''
        }`}
      >
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
          <span className="text-white text-xs font-bold select-none">{userInitials}</span>
        </div>
        <ChevronDown
          size={14}
          className={`text-text-secondary hidden sm:block transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div
          className={`absolute top-full mt-2 bg-card border border-border rounded-xl shadow-lg z-50 origin-top-right animate-dropdown ${
            align === 'right' ? 'right-0' : 'left-0'
          } w-56`}
        >
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-semibold text-text-primary">
              {userName} {userLastName}
            </p>
            <p className="text-xs text-text-secondary">{userEmail}</p>
            <span className={`${badgeClassName} mt-1.5 inline-flex`}>{roleLabel}</span>
          </div>
          <div className="p-1.5">
            {menuItems.map(item => (
              <Link
                key={item.label}
                to={item.to}
                onClick={onClose}
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
        </div>
      )}
    </div>
  )
}
