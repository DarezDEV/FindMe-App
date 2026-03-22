import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Bell, FileSearch, LayoutDashboard, LogOut, Menu, ShieldCheck, X, Eye } from 'lucide-react'
import { logoutUser } from '../../auth/services'

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
}

function SidebarBody({ onNavigate, onLogout, logoutLoading }: SidebarBodyProps) {
  const [logoutHover, setLogoutHover] = useState(false)

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      background: '#ffffff', borderRight: '1px solid #e5e7eb',
      fontFamily: "'Geist', 'Inter', system-ui, sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

        .sb-navlink {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          border-radius: 8px;
          font-size: 13px;
          font-family: 'Geist', sans-serif;
          color: #6B7280;
          text-decoration: none;
          transition: background 0.12s, color 0.12s;
          position: relative;
          width: 100%;
          box-sizing: border-box;
        }
        .sb-navlink:hover { background: #f9fafb; color: #111827; }
        .sb-navlink.sb-active {
          background: linear-gradient(90deg, rgba(37,99,235,0.09) 0%, rgba(37,99,235,0.03) 100%);
          color: #111827;
        }

        .sb-accent {
          position: absolute; left: 0; top: 50%;
          transform: translateY(-50%);
          width: 3px; height: 0;
          border-radius: 0 2px 2px 0;
          background: #2563eb;
          transition: height 0.18s ease-out;
        }
        .sb-active .sb-accent { height: 18px; }

        .sb-icon {
          width: 28px; height: 28px; border-radius: 7px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; color: #6B7280;
          transition: background 0.12s, color 0.12s;
        }
        .sb-navlink:hover .sb-icon { background: #e5e7eb; color: #6B7280; }
        .sb-active .sb-icon { background: rgba(37,99,235,0.1); color: #2563eb; }

        .sb-navlink .sb-lbl { flex: 1; font-weight: 400; }
        .sb-active .sb-lbl  { font-weight: 600; color: #111827; }
      `}</style>

      {/* ─── BRAND ─── */}
      <div style={{
        height: 68, borderBottom: '1px solid #e5e7eb',
        padding: '0 18px', display: 'flex', alignItems: 'center',
        gap: 12, flexShrink: 0,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.18)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(37,99,235,0.1)',
        }}>
          <img
            src="/findMeLogo.svg" alt="FindMe"
            style={{ width: 20, height: 20, objectFit: 'contain' }}
            onError={(e) => {
              e.currentTarget.style.display = 'none'
              const n = e.currentTarget.nextElementSibling as HTMLElement | null
              if (n) n.style.display = 'flex'
            }}
          />
          <span style={{ display: 'none', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck size={16} style={{ color: '#2563eb' }} />
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
          <p style={{
            fontFamily: "'Instrument Serif', Georgia, serif", fontStyle: 'italic',
            fontSize: 17, color: '#111827', fontWeight: 400,
            lineHeight: 1, letterSpacing: '-0.02em', margin: 0,
          }}>
            FindMe
          </p>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 9, fontFamily: "'JetBrains Mono', monospace", fontWeight: 500,
            letterSpacing: '0.18em', textTransform: 'uppercase',
            color: '#2563eb', background: 'rgba(37,99,235,0.07)',
            border: '1px solid rgba(37,99,235,0.18)',
            padding: '2px 7px', borderRadius: 4, width: 'fit-content',
          }}>
            <ShieldCheck size={7} /> Authority
          </span>
        </div>
      </div>

      {/* ─── LABEL ─── */}
      <div style={{ padding: '20px 18px 8px' }}>
        <p style={{
          fontSize: 9, fontFamily: "'JetBrains Mono', monospace", fontWeight: 500,
          letterSpacing: '0.28em', textTransform: 'uppercase',
          color: '#C4C9D4', margin: 0, userSelect: 'none',
        }}>Navegación</p>
      </div>

      {/* ─── NAV ─── */}
      <nav style={{ flex: 1, padding: '0 10px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
        {authorityNavItems.map((item) => {
          const { label, icon: Icon } = item

          if ('to' in item) {
            return (
              <NavLink
                key={label}
                to={item.to}
                end={item.exact}
                onClick={onNavigate}
                className={({ isActive }) => `sb-navlink${isActive ? ' sb-active' : ''}`}
              >
                <>
                  <span className="sb-accent" />
                  <span className="sb-icon"><Icon size={14} /></span>
                  <span className="sb-lbl">{label}</span>
                </>
              </NavLink>
            )
          }

          return (
            <div key={label} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 10px', borderRadius: 8,
              fontSize: 13, fontFamily: "'Geist', sans-serif",
              color: '#C4C9D4', opacity: 0.65, cursor: 'not-allowed',
            }}>
              <span style={{ width: 28, height: 28, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={14} />
              </span>
              <span style={{ flex: 1 }}>{label}</span>
              <span style={{
                fontSize: 9, fontFamily: "'JetBrains Mono', monospace", fontWeight: 500,
                letterSpacing: '0.15em', textTransform: 'uppercase',
                color: '#C4C9D4', background: '#f9fafb',
                border: '1px solid #e5e7eb', padding: '2px 6px', borderRadius: 4,
              }}>Pronto</span>
            </div>
          )
        })}
      </nav>

      {/* ─── DIVIDER ─── */}
      <div style={{ margin: '8px 14px', height: 1, background: '#e5e7eb', flexShrink: 0 }} />

      {/* ─── LOGOUT ─── */}
      <div style={{ padding: '6px 10px 14px', flexShrink: 0 }}>
        <button
          type="button"
          onClick={onLogout}
          disabled={logoutLoading}
          onMouseEnter={() => setLogoutHover(true)}
          onMouseLeave={() => setLogoutHover(false)}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 10px', borderRadius: 8, width: '100%',
            fontSize: 13, fontFamily: "'Geist', sans-serif", fontWeight: 400,
            color: logoutHover ? '#ef4444' : '#6B7280',
            background: logoutHover ? 'rgba(239,68,68,0.05)' : 'transparent',
            border: 'none', cursor: logoutLoading ? 'not-allowed' : 'pointer',
            opacity: logoutLoading ? 0.4 : 1,
            transition: 'background 0.12s, color 0.12s',
            textAlign: 'left',
          }}
        >
          <span style={{
            width: 28, height: 28, borderRadius: 7, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: logoutHover ? '#ef4444' : '#6B7280',
            background: logoutHover ? 'rgba(239,68,68,0.08)' : 'transparent',
            transition: 'background 0.12s, color 0.12s',
          }}>
            <LogOut size={14} />
          </span>
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
      <style>{`
        @keyframes slideInLeft {
          from { transform: translateX(-100%); opacity: 0; }
          to   { transform: translateX(0);     opacity: 1; }
        }
        .sb-aside {
          width: 220px;
          flex-shrink: 0;
          height: 100%;
        }
        .sb-mobile-btn { display: none !important; }
        @media (max-width: 768px) {
          .sb-aside      { display: none !important; }
          .sb-mobile-btn { display: flex !important; }
        }
      `}</style>

      {/* ─── DESKTOP ─── */}
      <aside className="sb-aside">
        <SidebarBody onLogout={() => void handleLogout()} logoutLoading={logoutLoading} />
      </aside>

      {/* ─── MOBILE TOGGLE ─── */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="sb-mobile-btn"
        aria-label="Abrir menú"
        style={{
          position: 'fixed', top: 16, left: 16, zIndex: 40,
          alignItems: 'center', justifyContent: 'center',
          background: '#fff', border: '1px solid #e5e7eb',
          borderRadius: 10, padding: 10, color: '#6B7280',
          cursor: 'pointer', boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
        }}
      >
        <Menu size={17} />
      </button>

      {/* ─── MOBILE DRAWER ─── */}
      {mobileOpen && (
        <>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Cerrar menú"
            style={{
              position: 'fixed', inset: 0, zIndex: 40,
              background: 'rgba(17,24,39,0.4)', backdropFilter: 'blur(4px)',
              border: 'none', cursor: 'pointer',
            }}
          />
          <aside style={{
            position: 'fixed', top: 0, left: 0, bottom: 0,
            zIndex: 50, width: 220,
            animation: 'slideInLeft 0.2s ease',
            boxShadow: '4px 0 24px rgba(0,0,0,0.12)',
          }}>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Cerrar menú"
              style={{
                position: 'absolute', top: 14, right: 14, zIndex: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: '#fff', border: '1px solid #e5e7eb',
                borderRadius: 7, padding: 6, color: '#6B7280', cursor: 'pointer',
              }}
            >
              <X size={14} />
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
