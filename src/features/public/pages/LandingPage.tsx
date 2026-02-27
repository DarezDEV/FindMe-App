import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { BadgeCheck, HeartHandshake, LockKeyhole, ShieldCheck, Users, Zap, Search, MapPin, Clock, Eye, ArrowRight, CheckCircle } from 'lucide-react'
import { getAuthorityCases, type AuthorityCaseRow } from '../../../lib/supabase/db'

type PublicWorkflowStatus = 'approved' | 'found' | 'closed'

function getPublicWorkflowStatus(caso: AuthorityCaseRow): PublicWorkflowStatus | null {
  if (caso.workflow_status) {
    if (caso.workflow_status === 'approved' || caso.workflow_status === 'found' || caso.workflow_status === 'closed') {
      return caso.workflow_status
    }
    return null
  }

  // Backward compatibility for datasets that still use only `status`.
  if (caso.status === 'resuelto') return 'found'
  if (caso.status === 'cerrado') return 'closed'
  if (caso.status === 'activo' || caso.status === 'en_proceso') return 'approved'
  return null
}

function getLocation(caso: AuthorityCaseRow): string {
  return caso.ciudad || caso.estado_provincia || caso.lugar_ultima_vez || 'Ubicacion no disponible'
}

function formatShortDate(value: string | null): string {
  if (!value) return 'Fecha no disponible'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'Fecha no disponible'
  return new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).format(parsed)
}

function formatReportedAgo(value: string): string {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'Reportado recientemente'

  const diffMs = Date.now() - parsed.getTime()
  const diffHours = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60)))
  if (diffHours < 24) return `Reportado hace ${diffHours}h`

  const diffDays = Math.floor(diffHours / 24)
  return `Reportado hace ${diffDays}d`
}

function getStatusLabel(status: PublicWorkflowStatus | null): string {
  if (status === 'found') return 'Encontrado'
  if (status === 'closed') return 'Cerrado'
  return 'Activo'
}

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set())
  const [loadingFeaturedCase, setLoadingFeaturedCase] = useState(true)
  const [featuredCase, setFeaturedCase] = useState<AuthorityCaseRow | null>(null)
  const [featuredStatus, setFeaturedStatus] = useState<PublicWorkflowStatus | null>(null)
  const [publicCaseCount, setPublicCaseCount] = useState(0)
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    document.title = 'FindMe | Plataforma de bÃºsqueda de personas'

    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)

    if ('IntersectionObserver' in window) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const sectionId = entry.target instanceof HTMLElement ? entry.target.dataset.section : undefined
            if (entry.isIntersecting && sectionId) {
              setVisibleSections((prev) => new Set([...prev, sectionId]))
            }
          })
        },
        { threshold: 0.15 },
      )

      document.querySelectorAll<HTMLElement>('[data-section]').forEach((el) => {
        observerRef.current?.observe(el)
      })
    }

    return () => {
      window.removeEventListener('scroll', handleScroll)
      observerRef.current?.disconnect()
    }
  }, [])

  useEffect(() => {
    let active = true

    const loadPublicCases = async () => {
      setLoadingFeaturedCase(true)
      try {
        const data = await getAuthorityCases({ limit: 80 })
        const publicRows = data.filter((item) => {
          const status = getPublicWorkflowStatus(item)
          return Boolean(status)
        })

        const firstCase = publicRows[0] ?? null
        const status = firstCase ? getPublicWorkflowStatus(firstCase) : null

        if (!active) return

        setFeaturedCase(firstCase)
        setFeaturedStatus(status)
        setPublicCaseCount(publicRows.length)
      } catch {
        if (!active) return
        setFeaturedCase(null)
        setFeaturedStatus(null)
        setPublicCaseCount(0)
      } finally {
        if (active) {
          setLoadingFeaturedCase(false)
        }
      }
    }

    void loadPublicCases()

    return () => {
      active = false
    }
  }, [])

  const isVisible = (id: string) => visibleSections.has(id)

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,300;1,9..144,400&family=DM+Sans:wght@300;400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --ink: #0e1117;
          --ink-soft: #1e2530;
          --paper: #f7f4ef;
          --paper-warm: #f0ece4;
          --accent: #1d4ed8;
          --accent-light: #3b82f6;
          --accent-muted: rgba(29,78,216,0.08);
          --amber: #d97706;
          --amber-soft: rgba(217,119,6,0.1);
          --text-main: #0e1117;
          --text-body: #3d4450;
          --text-quiet: #6b7280;
          --border: rgba(14,17,23,0.1);
          --shadow-sm: 0 1px 3px rgba(14,17,23,0.08), 0 1px 2px rgba(14,17,23,0.04);
          --shadow-md: 0 4px 16px rgba(14,17,23,0.08), 0 2px 6px rgba(14,17,23,0.05);
          --shadow-lg: 0 12px 40px rgba(14,17,23,0.1), 0 4px 12px rgba(14,17,23,0.06);
          --font-display: 'Fraunces', Georgia, serif;
          --font-body: 'DM Sans', system-ui, sans-serif;
          --radius: 14px;
          --radius-sm: 8px;
        }

        html { scroll-behavior: smooth; }

        body {
          font-family: var(--font-body);
          background: var(--paper);
          color: var(--text-main);
          line-height: 1.6;
          -webkit-font-smoothing: antialiased;
        }

        /* HEADER */
        .header {
          position: sticky; top: 0; z-index: 50;
          padding: 0 max(24px, calc((100vw - 1200px)/2));
          height: 68px;
          display: flex; align-items: center; justify-content: space-between;
          transition: all 0.3s ease;
          border-bottom: 1px solid transparent;
        }
        .header.scrolled {
          background: rgba(247,244,239,0.94);
          backdrop-filter: blur(12px);
          border-color: var(--border);
          box-shadow: var(--shadow-sm);
        }
        .logo {
          display: flex; align-items: center; gap: 10px;
          font-family: var(--font-display); font-size: 1.2rem; font-weight: 600;
          color: var(--text-main); text-decoration: none;
        }
        .logo-icon {
          width: 36px; height: 36px; border-radius: 10px;
          background: var(--accent); display: flex; align-items: center; justify-content: center;
          color: white;
        }
        .nav { display: flex; align-items: center; gap: 32px; }
        .nav a {
          font-size: 0.875rem; font-weight: 400; color: var(--text-body);
          text-decoration: none; transition: color 0.2s;
        }
        .nav a:hover { color: var(--accent); }
        .header-actions { display: flex; gap: 10px; }

        /* BUTTONS */
        .btn {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 10px 22px; border-radius: 100px;
          font-size: 0.875rem; font-weight: 500; font-family: var(--font-body);
          text-decoration: none; cursor: pointer; border: none;
          transition: all 0.2s ease;
        }
        .btn-primary {
          background: var(--accent); color: white;
          box-shadow: 0 2px 8px rgba(29,78,216,0.3);
        }
        .btn-primary:hover {
          background: #1e40af;
          box-shadow: 0 4px 16px rgba(29,78,216,0.4);
          transform: translateY(-1px);
        }
        .btn-secondary {
          background: transparent; color: var(--text-main);
          border: 1.5px solid var(--border);
        }
        .btn-secondary:hover {
          background: var(--paper-warm);
          border-color: rgba(14,17,23,0.2);
        }
        .btn-large { padding: 14px 32px; font-size: 1rem; }
        .btn-ghost { padding: 10px 22px; color: var(--text-body); background: none; border: none; }

        /* HERO */
        .hero {
          padding: 80px max(24px, calc((100vw - 1200px)/2)) 72px;
          min-height: 88vh;
          display: grid; grid-template-columns: 1fr 1fr; gap: 64px;
          align-items: center;
          position: relative; overflow: hidden;
        }
        .hero::before {
          content: '';
          position: absolute; inset: 0;
          background:
            radial-gradient(ellipse 70% 60% at 80% -10%, rgba(29,78,216,0.1) 0%, transparent 60%),
            radial-gradient(ellipse 50% 40% at 10% 90%, rgba(217,119,6,0.07) 0%, transparent 50%);
          pointer-events: none;
        }
        .hero-eyebrow {
          display: inline-flex; align-items: center; gap: 8px;
          background: var(--amber-soft); color: var(--amber);
          padding: 5px 14px; border-radius: 100px;
          font-size: 0.78rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase;
          margin-bottom: 24px;
        }
        .hero-eyebrow .dot {
          width: 6px; height: 6px; border-radius: 50%; background: var(--amber);
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
        .hero h1 {
          font-family: var(--font-display);
          font-size: clamp(2.4rem, 4vw, 3.5rem);
          font-weight: 600; line-height: 1.12;
          color: var(--text-main);
          margin-bottom: 20px;
        }
        .hero h1 em {
          font-style: italic; font-weight: 300;
          color: var(--accent);
        }
        .hero-sub {
          font-size: 1.1rem; color: var(--text-body); line-height: 1.7;
          max-width: 480px; margin-bottom: 36px;
        }
        .hero-actions { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }
        .hero-trust {
          margin-top: 48px; display: flex; gap: 28px;
        }
        .hero-trust-item {
          display: flex; align-items: center; gap: 8px;
          font-size: 0.82rem; color: var(--text-quiet);
        }
        .hero-trust-item svg { color: var(--accent); flex-shrink: 0; }

        /* HERO VISUAL */
        .hero-visual { position: relative; }
        .hero-card {
          background: white;
          border: 1px solid var(--border);
          border-radius: 20px;
          overflow: hidden;
          box-shadow: var(--shadow-lg);
          position: relative;
        }
        .hero-card-header {
          padding: 20px 24px 16px;
          border-bottom: 1px solid var(--border);
          display: flex; align-items: center; gap: 12px;
        }
        .case-avatar {
          width: 44px; height: 44px; border-radius: 12px;
          background: linear-gradient(135deg, #dbeafe, #bfdbfe);
          display: flex; align-items: center; justify-content: center;
          font-family: var(--font-display); font-size: 1.2rem;
          color: var(--accent); font-weight: 600;
        }
        .case-meta { flex: 1; }
        .case-name { font-weight: 600; font-size: 0.95rem; }
        .case-time { font-size: 0.78rem; color: var(--text-quiet); }
        .badge-active {
          background: #dcfce7; color: #16a34a;
          padding: 3px 10px; border-radius: 100px;
          font-size: 0.75rem; font-weight: 600;
        }
        .hero-card-body { padding: 20px 24px; }
        .case-detail {
          display: flex; align-items: center; gap: 8px;
          font-size: 0.85rem; color: var(--text-body);
          margin-bottom: 12px;
        }
        .case-detail svg { color: var(--text-quiet); flex-shrink: 0; }
        .case-progress-label {
          display: flex; justify-content: space-between;
          font-size: 0.78rem; color: var(--text-quiet); margin-bottom: 6px;
        }
        .case-progress-bar {
          height: 6px; background: #e5e7eb; border-radius: 100px; overflow: hidden;
        }
        .case-progress-fill {
          height: 100%; width: 73%; background: var(--accent); border-radius: 100px;
          animation: fillBar 1.5s ease 0.5s both;
        }
        @keyframes fillBar { from { width: 0 } to { width: 73% } }
        .hero-card-footer {
          padding: 16px 24px;
          border-top: 1px solid var(--border);
          background: #fafafa;
          display: flex; align-items: center; justify-content: space-between;
        }
        .helpers-label { font-size: 0.8rem; color: var(--text-quiet); }
        .helpers-count { font-size: 0.9rem; font-weight: 600; color: var(--text-main); }

        .hero-float-badge {
          position: absolute; top: -16px; right: -16px;
          background: var(--amber); color: white;
          padding: 10px 16px; border-radius: 14px;
          font-size: 0.8rem; font-weight: 600;
          box-shadow: 0 4px 16px rgba(217,119,6,0.35);
          white-space: nowrap;
          animation: floatUp 3s ease-in-out infinite;
        }
        @keyframes floatUp {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }

        /* SECTIONS */
        .section {
          padding: 80px max(24px, calc((100vw - 1200px)/2));
        }
        .section-inner {
          opacity: 0; transform: translateY(28px);
          transition: opacity 0.65s ease, transform 0.65s ease;
        }
        .section-inner.visible {
          opacity: 1; transform: none;
        }
        .section-label {
          display: inline-flex; align-items: center; gap: 8px;
          font-size: 0.78rem; font-weight: 600; letter-spacing: 0.08em;
          text-transform: uppercase; color: var(--accent); margin-bottom: 16px;
        }
        .section-label::before {
          content: ''; width: 24px; height: 2px; background: var(--accent); border-radius: 2px;
        }
        .section-title {
          font-family: var(--font-display);
          font-size: clamp(1.8rem, 3vw, 2.5rem);
          font-weight: 600; line-height: 1.2;
          color: var(--text-main); margin-bottom: 16px;
        }
        .section-title em { font-style: italic; font-weight: 300; color: var(--accent); }
        .section-body {
          font-size: 1.05rem; color: var(--text-body); line-height: 1.75;
          max-width: 680px;
        }

        /* MISSION */
        .mission-grid {
          display: grid; grid-template-columns: 1fr 1fr; gap: 64px;
          align-items: start;
          padding: 80px max(24px, calc((100vw - 1200px)/2));
          background: var(--paper-warm);
          border-top: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
        }
        .mission-left .section-body { margin-bottom: 24px; }
        .mission-value {
          display: flex; gap: 16px; align-items: flex-start;
          padding: 20px 0; border-bottom: 1px solid var(--border);
        }
        .mission-value:last-child { border-bottom: none; }
        .mission-value-icon {
          width: 40px; height: 40px; flex-shrink: 0;
          border-radius: 10px; background: var(--accent-muted);
          display: flex; align-items: center; justify-content: center;
          color: var(--accent);
        }
        .mission-value-title { font-weight: 600; margin-bottom: 4px; }
        .mission-value-desc { font-size: 0.9rem; color: var(--text-body); }
        .mission-quote {
          background: white; border: 1px solid var(--border);
          border-radius: 20px; padding: 32px;
          box-shadow: var(--shadow-md);
          position: sticky; top: 88px;
        }
        .mission-quote blockquote {
          font-family: var(--font-display);
          font-size: 1.35rem; line-height: 1.5;
          font-style: italic; color: var(--text-main);
          margin-bottom: 24px;
        }
        .mission-quote cite {
          font-style: normal; font-size: 0.85rem; color: var(--text-quiet);
        }
        .mission-stats {
          display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 24px;
        }
        .stat-box {
          background: var(--accent-muted); border-radius: 12px; padding: 16px;
          text-align: center;
        }
        .stat-num {
          font-family: var(--font-display); font-size: 1.8rem; font-weight: 600;
          color: var(--accent); display: block;
        }
        .stat-label { font-size: 0.78rem; color: var(--text-body); }

        /* HOW IT WORKS */
        .steps { display: grid; grid-template-columns: repeat(3,1fr); gap: 32px; margin-top: 48px; }
        .step { position: relative; }
        .step-connector {
          position: absolute; top: 28px; left: calc(50% + 28px);
          width: calc(100% - 56px); height: 1px;
          background: linear-gradient(to right, var(--border), transparent);
        }
        .step:last-child .step-connector { display: none; }
        .step-num {
          width: 56px; height: 56px; border-radius: 16px;
          background: white; border: 1.5px solid var(--border);
          display: flex; align-items: center; justify-content: center;
          font-family: var(--font-display); font-size: 1.4rem; font-weight: 600;
          color: var(--accent); margin-bottom: 20px;
          box-shadow: var(--shadow-sm);
          position: relative; z-index: 1;
        }
        .step-title { font-size: 1.1rem; font-weight: 600; margin-bottom: 8px; }
        .step-desc { font-size: 0.9rem; color: var(--text-body); line-height: 1.65; }
        .step-detail {
          margin-top: 16px; padding: 14px 16px;
          background: var(--accent-muted); border-radius: 10px;
        }
        .step-detail p { font-size: 0.82rem; color: var(--accent); font-weight: 500; }

        /* SECURITY */
        .security-bg {
          background: var(--ink);
          padding: 80px max(24px, calc((100vw - 1200px)/2));
        }
        .security-bg .section-label { color: #60a5fa; }
        .security-bg .section-label::before { background: #60a5fa; }
        .security-bg .section-title { color: white; }
        .security-bg .section-body { color: #9ca3af; }
        .security-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 48px; }
        .security-card {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px; padding: 28px;
          transition: background 0.2s, border-color 0.2s;
        }
        .security-card:hover {
          background: rgba(255,255,255,0.08);
          border-color: rgba(255,255,255,0.14);
        }
        .security-icon {
          width: 44px; height: 44px; border-radius: 12px;
          background: rgba(59,130,246,0.15);
          display: flex; align-items: center; justify-content: center;
          color: #60a5fa; margin-bottom: 16px;
        }
        .security-title { font-size: 1rem; font-weight: 600; color: white; margin-bottom: 8px; }
        .security-desc { font-size: 0.88rem; color: #9ca3af; line-height: 1.65; }

        /* IMPACT */
        .impact-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; margin-top: 48px; }
        .impact-card {
          background: white; border: 1px solid var(--border);
          border-radius: 20px; padding: 32px;
          box-shadow: var(--shadow-sm);
          text-align: center; transition: box-shadow 0.2s, transform 0.2s;
        }
        .impact-card:hover { box-shadow: var(--shadow-md); transform: translateY(-2px); }
        .impact-num {
          font-family: var(--font-display); font-size: 2.8rem; font-weight: 600;
          color: var(--accent); line-height: 1;
          display: block; margin-bottom: 10px;
        }
        .impact-title { font-weight: 600; margin-bottom: 6px; }
        .impact-desc { font-size: 0.88rem; color: var(--text-body); }

        /* CTA */
        .cta-section {
          padding: 80px max(24px, calc((100vw - 1200px)/2));
          text-align: center;
        }
        .cta-inner {
          background: var(--ink); border-radius: 28px;
          padding: 72px 64px;
          position: relative; overflow: hidden;
        }
        .cta-inner::before {
          content: '';
          position: absolute; inset: 0;
          background:
            radial-gradient(ellipse 60% 80% at 80% 120%, rgba(29,78,216,0.4) 0%, transparent 60%),
            radial-gradient(ellipse 40% 60% at 10% -20%, rgba(217,119,6,0.2) 0%, transparent 50%);
        }
        .cta-content { position: relative; z-index: 1; }
        .cta-eyebrow {
          display: inline-flex; align-items: center; gap: 8px;
          color: #fbbf24; font-size: 0.82rem; font-weight: 600;
          letter-spacing: 0.08em; text-transform: uppercase;
          margin-bottom: 20px;
        }
        .cta-title {
          font-family: var(--font-display);
          font-size: clamp(2rem, 3.5vw, 3rem);
          font-weight: 600; line-height: 1.15;
          color: white; margin-bottom: 20px;
        }
        .cta-title em { font-style: italic; font-weight: 300; color: #93c5fd; }
        .cta-sub { font-size: 1.05rem; color: #9ca3af; max-width: 480px; margin: 0 auto 36px; }
        .cta-actions { display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; }
        .btn-cta-primary {
          background: white; color: var(--ink);
          box-shadow: 0 2px 12px rgba(255,255,255,0.2);
        }
        .btn-cta-primary:hover { background: #f3f4f6; transform: translateY(-1px); }
        .btn-cta-secondary { color: rgba(255,255,255,0.7); border-color: rgba(255,255,255,0.2); }
        .btn-cta-secondary:hover { background: rgba(255,255,255,0.08); color: white; }

        /* FOOTER */
        .footer {
          border-top: 1px solid var(--border);
          padding: 40px max(24px, calc((100vw - 1200px)/2));
          display: flex; justify-content: space-between; align-items: center;
          flex-wrap: wrap; gap: 20px;
        }
        .footer-brand { display: flex; align-items: center; gap: 10px; }
        .footer-brand p { font-size: 0.85rem; color: var(--text-quiet); margin-top: 4px; }
        .footer-links { display: flex; gap: 24px; flex-wrap: wrap; }
        .footer-links a {
          font-size: 0.85rem; color: var(--text-quiet);
          text-decoration: none; transition: color 0.2s;
        }
        .footer-links a:hover { color: var(--accent); }

        /* Responsive */
        @media (max-width: 900px) {
          .hero, .mission-grid { grid-template-columns: 1fr; gap: 40px; }
          .hero { min-height: auto; padding-top: 56px; }
          .steps, .security-grid, .impact-grid { grid-template-columns: 1fr; }
          .cta-inner { padding: 48px 32px; }
          .nav { display: none; }
          .mission-quote { position: static; }
        }
      `}</style>

      {/* HEADER */}
      <header className={`header ${scrolled ? 'scrolled' : ''}`}>
        <Link to="/" className="logo">
          <div className="logo-icon">
            <Search size={18} />
          </div>
          FindMe
        </Link>

        <nav className="nav">
          <a href="#mision">Nuestra misiÃ³n</a>
          <a href="#como-funciona">CÃ³mo funciona</a>
          <a href="#seguridad">Seguridad</a>
          <a href="#impacto">Impacto</a>
        </nav>

        <div className="header-actions">
          <Link to="/login" className="btn btn-secondary" style={{ padding: '8px 18px', fontSize: '0.85rem' }}>
            Iniciar sesiÃ³n
          </Link>
          <Link to="/register" className="btn btn-primary" style={{ padding: '8px 18px', fontSize: '0.85rem' }}>
            Crear cuenta
          </Link>
        </div>
      </header>

      <main>
        {/* HERO */}
        <section className="hero">
          <div>
            <p className="hero-eyebrow">
              <span className="dot" />
              {loadingFeaturedCase ? 'Actualizando casos publicos...' : `${publicCaseCount} casos publicos activos`}
            </p>

            <h1>
              Cada minuto importa.<br />
              <em>Juntos llegamos</em><br />
              mÃ¡s lejos.
            </h1>

            <p className="hero-sub">
              FindMe conecta a familias, comunidad y autoridades para reportar, 
              verificar y difundir casos de personas desaparecidas con responsabilidad 
              y trazabilidad desde el primer momento.
            </p>

            <div className="hero-actions">
              <Link to="/publish-case" className="btn btn-primary btn-large">
                Publicar un caso
                <ArrowRight size={16} />
              </Link>
              <Link to="/cases" className="btn btn-secondary btn-large">
                Ver casos activos
              </Link>
            </div>

            <div className="hero-trust">
              <div className="hero-trust-item">
                <CheckCircle size={15} />
                Casos moderados y verificados
              </div>
              <div className="hero-trust-item">
                <CheckCircle size={15} />
                Datos protegidos
              </div>
              <div className="hero-trust-item">
                <CheckCircle size={15} />
                Acceso simple y confiable
              </div>
            </div>
          </div>

          {/* HERO VISUAL */}
          <div className="hero-visual">
            <div className="hero-float-badge">
              {loadingFeaturedCase ? 'Sincronizando datos...' : `${publicCaseCount} casos visibles ahora`}
            </div>
            <div className="hero-card">
              <div className="hero-card-header">
                <div className="case-avatar">{featuredCase?.nombres?.charAt(0).toUpperCase() ?? 'F'}</div>
                <div className="case-meta">
                  <div className="case-name">
                    {featuredCase
                      ? `${featuredCase.nombres} ${featuredCase.apellidos}${featuredCase.edad ? `, ${featuredCase.edad} anos` : ''}`
                      : 'Aun no hay casos publicos'}
                  </div>
                  <div className="case-time">
                    {featuredCase
                      ? `${formatReportedAgo(featuredCase.created_at)} - ${getLocation(featuredCase)}`
                      : 'Publica o consulta casos en tiempo real'}
                  </div>
                </div>
                <span className="badge-active">{getStatusLabel(featuredStatus)}</span>
              </div>
              <div className="hero-card-body">
                <div className="case-detail">
                  <MapPin size={14} />
                  Ultima ubicacion: {featuredCase ? getLocation(featuredCase) : 'No disponible'}
                </div>
                <div className="case-detail">
                  <Clock size={14} />
                  Ultima vez visto: {featuredCase ? formatShortDate(featuredCase.fecha_desaparicion) : 'Sin fecha'}
                </div>
                <div className="case-detail">
                  <Eye size={14} />
                  Caso: {featuredCase?.numero_caso ?? 'Sin identificador'}
                </div>
                <div className="case-progress-label">
                  <span>Difusion del caso</span>
                  <span>{featuredStatus === 'closed' ? '100%' : featuredStatus === 'found' ? '90%' : '70%'}</span>
                </div>
                <div className="case-progress-bar">
                  <div
                    className="case-progress-fill"
                    style={{ width: featuredStatus === 'closed' ? '100%' : featuredStatus === 'found' ? '90%' : '70%' }}
                  />
                </div>
              </div>
              <div className="hero-card-footer">
                <div>
                  <div className="helpers-label">Estado actual</div>
                  <div className="helpers-count">{getStatusLabel(featuredStatus)}</div>
                </div>
                <Link to="/cases" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.82rem' }}>
                  Ver detalles
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* MISSION */}
        <section id="mision" className="mission-grid">
          <div className="mission-left">
            <div
              className={`section-inner ${isVisible('mission') ? 'visible' : ''}`}
              data-section="mission"
            >
              <span className="section-label">Nuestra misiÃ³n</span>
              <h2 className="section-title">
                TecnologÃ­a al servicio<br />
                de <em>lo que mÃ¡s importa</em>
              </h2>
              <p className="section-body">
                En MÃ©xico y AmÃ©rica Latina, miles de familias enfrentan la angustia de no saber 
                dÃ³nde estÃ¡ un ser querido. La informaciÃ³n se dispersa, las horas pasan, 
                y la coordinaciÃ³n entre comunidad y autoridades falla.
              </p>
              <p className="section-body" style={{ marginTop: 16 }}>
                FindMe existe para cambiar eso. No somos una red social, ni un grupo de WhatsApp. 
                Somos una plataforma estructurada donde cada reporte es validado, cada dato es 
                protegido y cada persona puede contribuir de forma segura y significativa.
              </p>
              <p className="section-body" style={{ marginTop: 16 }}>
                Creemos que la tecnologÃ­a, cuando se usa con responsabilidad, puede ser la 
                diferencia entre encontrar a alguien a tiempo o no encontrarlo nunca.
              </p>
            </div>

            <div style={{ marginTop: 40 }}>
              {[
                { icon: <HeartHandshake size={18} />, title: 'EmpatÃ­a primero', desc: 'Cada caso representa a una familia real. DiseÃ±amos cada decisiÃ³n pensando en ellos.' },
                { icon: <ShieldCheck size={18} />, title: 'Responsabilidad total', desc: 'Moderamos, verificamos y protegemos. No publicamos nada sin revisiÃ³n.' },
                { icon: <Eye size={18} />, title: 'Transparencia activa', desc: 'Las familias saben en todo momento el estado de su caso y quiÃ©n estÃ¡ ayudando.' },
                { icon: <Users size={18} />, title: 'Comunidad organizada', desc: 'La fuerza colectiva, canalizada con orden, multiplica las posibilidades de encontrar a alguien.' },
              ].map((v, i) => (
                <div key={i} className="mission-value">
                  <div className="mission-value-icon">{v.icon}</div>
                  <div>
                    <div className="mission-value-title">{v.title}</div>
                    <div className="mission-value-desc">{v.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="mission-quote">
              <blockquote>
                "Los primeros momentos son los mÃ¡s crÃ­ticos. Una hora de difusiÃ³n organizada 
                vale mÃ¡s que dÃ­as de bÃºsqueda descoordinada."
              </blockquote>
              <cite>â€” Principio operativo de FindMe</cite>
              <div className="mission-stats">
                <div className="stat-box">
                  <span className="stat-num">+70%</span>
                  <span className="stat-label">mÃ¡s efectividad en las primeras 6 horas</span>
                </div>
                <div className="stat-box">
                  <span className="stat-num">24/7</span>
                  <span className="stat-label">seguimiento activo de casos</span>
                </div>
                <div className="stat-box">
                  <span className="stat-num">3</span>
                  <span className="stat-label">roles coordinados: ciudadano, autoridad, admin</span>
                </div>
                <div className="stat-box">
                  <span className="stat-num">100%</span>
                  <span className="stat-label">casos moderados antes de publicarse</span>
                </div>
              </div>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-quiet)', marginTop: 16 }}>
                * EstadÃ­sticas referenciales para presentaciÃ³n inicial de la plataforma.
              </p>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="como-funciona" className="section">
          <div
            className={`section-inner ${isVisible('how') ? 'visible' : ''}`}
            data-section="how"
          >
            <span className="section-label">CÃ³mo funciona</span>
            <h2 className="section-title">Simple, claro y <em>trazable</em></h2>
            <p className="section-body">
              Un flujo diseÃ±ado para que cualquier persona pueda actuar rÃ¡pido, 
              sin perder el control de la informaciÃ³n ni la seguridad del proceso.
            </p>

            <div className="steps">
              {[
                {
                  n: '1',
                  title: 'Publica el caso',
                  desc: 'Llenas un formulario con los datos esenciales: descripciÃ³n, Ãºltima ubicaciÃ³n conocida y fotografÃ­a. Es rÃ¡pido y guiado.',
                  detail: 'â†’ El caso entra a revisiÃ³n antes de ser visible.',
                },
                {
                  n: '2',
                  title: 'La comunidad ayuda',
                  desc: 'Una vez aprobado, el caso se difunde a personas verificadas. Cualquiera puede compartir informaciÃ³n Ãºtil de forma segura.',
                  detail: 'â†’ Cada aporte queda registrado con trazabilidad.',
                },
                {
                  n: '3',
                  title: 'Recibe seguimiento',
                  desc: 'La familia y las autoridades tienen acceso a un panel con toda la informaciÃ³n organizada, actualizada en tiempo real.',
                  detail: 'â†’ El caso se cierra solo cuando hay resoluciÃ³n confirmada.',
                },
              ].map((s, i) => (
                <div key={i} className="step">
                  {i < 2 && <div className="step-connector" />}
                  <div className="step-num">{s.n}</div>
                  <div className="step-title">{s.title}</div>
                  <p className="step-desc">{s.desc}</p>
                  <div className="step-detail"><p>{s.detail}</p></div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECURITY */}
        <section id="seguridad" className="security-bg">
          <div
            className={`section-inner ${isVisible('security') ? 'visible' : ''}`}
            data-section="security"
          >
            <span className="section-label">Seguridad y verificaciÃ³n</span>
            <h2 className="section-title">No somos una red social.<br />Somos <em>una plataforma responsable.</em></h2>
            <p className="section-body">
              La informaciÃ³n sobre personas desaparecidas es sensible. Un dato errÃ³neo 
              puede desviar una bÃºsqueda. Por eso construimos controles reales en cada capa del sistema.
            </p>

            <div className="security-grid">
              {[
                {
                  icon: <ShieldCheck size={20} />,
                  title: 'ModeraciÃ³n antes de publicar',
                  desc: 'NingÃºn caso aparece en la plataforma sin pasar por revisiÃ³n de moderadores. Esto evita reportes falsos, duplicados o malintencionados.',
                },
                {
                  icon: <BadgeCheck size={20} />,
                  title: 'Control por roles diferenciados',
                  desc: 'Ciudadanos, autoridades y administradores tienen permisos distintos. Cada acciÃ³n queda vinculada a un perfil verificado.',
                },
                {
                  icon: <LockKeyhole size={20} />,
                  title: 'ProtecciÃ³n de datos sensibles',
                  desc: 'Los datos de contacto y contexto familiar solo son accesibles para autoridades autorizadas. La comunidad ve lo necesario, no todo.',
                },
                {
                  icon: <Eye size={20} />,
                  title: 'Trazabilidad completa',
                  desc: 'Cada cambio, aporte y actualizaciÃ³n queda registrado. Las familias saben quiÃ©n accediÃ³ a su caso y quÃ© se hizo con la informaciÃ³n.',
                },
              ].map((c, i) => (
                <div key={i} className="security-card">
                  <div className="security-icon">{c.icon}</div>
                  <div className="security-title">{c.title}</div>
                  <p className="security-desc">{c.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* IMPACT */}
        <section id="impacto" className="section">
          <div
            className={`section-inner ${isVisible('impact') ? 'visible' : ''}`}
            data-section="impact"
          >
            <span className="section-label">Impacto social</span>
            <h2 className="section-title">Una persona que actÃºa<br /><em>puede cambiar todo.</em></h2>
            <p className="section-body">
              La bÃºsqueda de personas desaparecidas no es solo trabajo de autoridades. 
              Es responsabilidad colectiva. Y cuando la comunidad actÃºa con orden, 
              los resultados son exponencialmente mejores.
            </p>

            <div className="impact-grid">
              {[
                {
                  num: '+70%',
                  title: 'MÃ¡s efectividad en las primeras horas',
                  desc: 'La difusiÃ³n organizada en las primeras 6 horas multiplica las probabilidades de localizaciÃ³n.',
                },
                {
                  num: '24/7',
                  title: 'Acceso continuo al estado del caso',
                  desc: 'Familias y autoridades pueden consultar y actualizar informaciÃ³n en cualquier momento.',
                },
                {
                  num: '3 roles',
                  title: 'CoordinaciÃ³n estructurada',
                  desc: 'Ciudadano, autoridad y administrador trabajando en un solo sistema con informaciÃ³n compartida.',
                },
              ].map((c, i) => (
                <div key={i} className="impact-card">
                  <span className="impact-num">{c.num}</span>
                  <div className="impact-title">{c.title}</div>
                  <p className="impact-desc">{c.desc}</p>
                </div>
              ))}
            </div>

            <p style={{ marginTop: 20, fontSize: '0.78rem', color: 'var(--text-quiet)' }}>
              * EstadÃ­sticas referenciales de ejemplo para presentaciÃ³n inicial de la plataforma.
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="cta-section">
          <div className="cta-inner">
            <div className="cta-content">
              <p className="cta-eyebrow">
                <Zap size={14} />
                ActÃºa ahora. No maÃ±ana.
              </p>
              <h2 className="cta-title">
                Alguien te necesita.<br />
                <em>El momento es ahora.</em>
              </h2>
              <p className="cta-sub">
                RegÃ­strate, publica un caso o apoya a alguien que lo necesita. 
                Tu participaciÃ³n puede marcar la diferencia que una familia lleva semanas esperando.
              </p>
              <div className="cta-actions">
                <Link to="/register" className="btn btn-cta-primary btn-large">
                  Crear cuenta
                  <ArrowRight size={16} />
                </Link>
                <Link to="/cases" className="btn btn-secondary btn-cta-secondary btn-large">
                  Ver casos activos
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-brand">
          <div className="logo-icon" style={{ width: 32, height: 32 }}>
            <Search size={15} />
          </div>
          <div>
            <strong style={{ fontSize: '0.95rem' }}>FindMe</strong>
            <p>soporte@findme.app Â· +52 55 0000 0000</p>
          </div>
        </div>
        <div className="footer-links">
          <a href="#">PolÃ­tica de privacidad</a>
          <a href="#">TÃ©rminos y condiciones</a>
          <a href="#">Soporte</a>
        </div>
      </footer>
    </>
  )
}

