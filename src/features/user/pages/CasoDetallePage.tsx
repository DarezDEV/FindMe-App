import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  Calendar,
  ChevronLeft,
  Clock,
  Eye,
  FileText,
  Flag,
  Link2,
  Mail,
  MapPin,
  MessageSquare,
  MoreVertical,
  Phone,
  PhoneCall,
  Share2,
  UserSearch,
  Video,
} from 'lucide-react'
import UserNavbar from '../components/Usernavbar'
import { Alert, Spinner } from '../../../shared/components/ui'
import {
  createCaseComment,
  getCaseComments,
  getProfilesBasicByIds,
  getUserRolesByIds,
  type CaseCommentRow,
} from '../../../lib/supabase/db'
import { useAuth } from '../../auth/hooks'
import { useCasoDetalle } from '../hooks/useMisCasos'
import { reportarComentarioPublico } from '../services/reportes'

function CaseChip({ icon, label }: { icon?: ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background px-3 py-1.5 text-xs text-text-secondary font-medium">
      {icon && <span className="text-primary">{icon}</span>}
      {label}
    </span>
  )
}

function DetailItem({
  label,
  value,
  className = '',
  valueClassName = '',
}: {
  label: string
  value: string | number | null
  className?: string
  valueClassName?: string
}) {
  return (
    <div className={`rounded-xl border border-border/40 bg-background/60 px-3.5 py-3 ${className}`}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary/70">{label}</p>
      <p className={`text-sm font-semibold text-text-primary mt-1 leading-snug ${valueClassName}`}>
        {value ?? 'No disponible'}
      </p>
    </div>
  )
}

function InfoTile({ icon, label, value }: { icon: ReactNode; label: string; value: string | null }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-background/70 px-4 py-3">
      <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary/70">{label}</p>
        <p className="text-sm font-semibold text-text-primary mt-0.5 truncate">{value ?? 'No disponible'}</p>
      </div>
    </div>
  )
}

function SectionTitle({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
        {icon}
      </span>
      <h2 className="text-base font-bold text-text-primary">{title}</h2>
    </div>
  )
}

function formatDateTime(value: string | null) {
  if (!value) return 'Sin fecha'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleString('es-DO', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function formatShortDate(value: string | null) {
  if (!value) return 'No disponible'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString('sv-SE')
}

function formatEstado(value: string | null) {
  if (!value) return null
  return value.replace(/_/g, ' ')
}

function formatStatusLabel(status: string) {
  if (status === 'encontrado') return 'Reunificada'
  if (status === 'cerrado') return 'Archivada'
  return 'Publicada'
}

function formatVisibilityLabel(value: string | null) {
  if (!value) return 'PUBLICO'
  if (value === 'publico') return 'PUBLICO'
  if (value === 'autoridades') return 'AUTORIDADES'
  if (value === 'privado') return 'PRIVADO'
  return value.toUpperCase()
}

function getVisibilityBadgeClasses(value: string | null) {
  if (value === 'privado') return 'bg-error/10 text-error border-error/30'
  if (value === 'autoridades') return 'bg-warning/10 text-warning border-warning/30'
  return 'bg-success/10 text-success border-success/30'
}

function getPosterTitle(status: string | null, workflowStatus: string | null) {
  const normalizedStatus = status?.toLowerCase() ?? ''
  if (normalizedStatus === 'encontrado' || workflowStatus === 'found' || workflowStatus === 'closed') return 'ENCONTRADO'
  return 'DESAPARECIDO'
}

function buildApproximateLocation(city: string | null, country: string | null) {
  const parts = [city, country].filter((part): part is string => Boolean(part?.trim()))
  return parts.length > 0 ? parts.join(', ') : 'Ubicacion reservada'
}

type ShareNetwork = 'whatsapp' | 'facebook' | 'x'
type NoticeType = 'error' | 'success' | 'warning' | 'info'

interface PublicComment {
  id: string
  caseId: string
  authorId: string
  text: string
  createdAt: string
}

const PUBLIC_COMMENT_PREFIX = '[PUBLICO]'

function buildCaseShareUrl(caseId: string) {
  if (typeof window === 'undefined') return `/cases?caseId=${caseId}`
  const url = new URL('/cases', window.location.origin)
  url.searchParams.set('caseId', caseId)
  return url.toString()
}

function buildShareText(caseNumber: string, fullName: string) {
  const safeName = fullName.trim() || 'persona sin identificar'
  return `Ayuda a difundir el caso ${caseNumber}: ${safeName}.`
}

function buildSocialShareUrl(network: ShareNetwork, url: string, text: string) {
  if (network === 'whatsapp') return `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`
  if (network === 'facebook') return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`
}

function toPublicComment(row: CaseCommentRow): PublicComment | null {
  const rawText = row.comentario.trim()
  if (!rawText.toUpperCase().startsWith(PUBLIC_COMMENT_PREFIX)) return null
  const text = rawText.slice(PUBLIC_COMMENT_PREFIX.length).trim()
  if (!text) return null
  return { id: row.id, caseId: row.caso_id, authorId: row.autor_id, text, createdAt: row.created_at }
}

function formatPublicCommentDate(value: string) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'Reciente'
  return new Intl.DateTimeFormat('es-DO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(parsed)
}

function getPublicCommentAuthorLabel(authorId: string, currentUserId: string | undefined) {
  if (currentUserId && authorId === currentUserId) return 'Tu'
  return `Usuario ${authorId.slice(0, 8)}`
}

function isPublicCommentEnabled(workflowStatus: string | null) {
  return workflowStatus === 'approved'
}

function formatPosterDate(value: string | null) {
  if (!value) return 'Fecha no disponible'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString('es-DO', { day: '2-digit', month: 'long', year: 'numeric' })
}

export default function CasoDetallePage() {
  const { user } = useAuth()
  const [shareNotice, setShareNotice] = useState<{ type: NoticeType; message: string } | null>(null)
  const [commentNotice, setCommentNotice] = useState<{ type: NoticeType; message: string } | null>(null)
  const [actionsOpen, setActionsOpen] = useState(false)
  const actionsMenuRef = useRef<HTMLDivElement | null>(null)
  const { id = '' } = useParams<{ id: string }>()
  const { data, isLoading, isError, error, refetch } = useCasoDetalle(id)
  const [publicComments, setPublicComments] = useState<PublicComment[]>([])
  const [publicCommentDraft, setPublicCommentDraft] = useState('')
  const [publicCommentsLoading, setPublicCommentsLoading] = useState(false)
  const [publicCommentsError, setPublicCommentsError] = useState<string | null>(null)
  const [publicCommentSubmitting, setPublicCommentSubmitting] = useState(false)
  const [commentAuthorById, setCommentAuthorById] = useState<Record<string, string>>({})
  const [commentRolesById, setCommentRolesById] = useState<Record<string, string[]>>({})
  const [reportingCommentId, setReportingCommentId] = useState<string | null>(null)
  const [pdfLoading, setPdfLoading] = useState(false)

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node | null
      if (actionsMenuRef.current?.contains(target ?? null)) return
      setActionsOpen(false)
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  useEffect(() => {
    if (!data?.caso?.id) return
    const loadPublicComments = async () => {
      setPublicCommentsLoading(true)
      setPublicCommentsError(null)
      try {
        const rows = await getCaseComments([data.caso.id])
        const mapped = rows.map(toPublicComment).filter((entry): entry is PublicComment => entry !== null)
        setPublicComments(mapped)
        const authorityAuthorIds = data.comentarios.map((entry) => entry.autor_id).filter((value): value is string => Boolean(value))
        const publicAuthorIds = mapped.map((entry) => entry.authorId)
        const uniqueAuthors = Array.from(new Set([...authorityAuthorIds, ...publicAuthorIds]))
        if (uniqueAuthors.length > 0) {
          try {
            const profiles = await getProfilesBasicByIds(uniqueAuthors)
            const roles = await getUserRolesByIds(uniqueAuthors)
            const profileMap: Record<string, string> = {}
            profiles.forEach((profile) => {
              const fullName = [profile.name, profile.last_name].filter(Boolean).join(' ').trim()
              profileMap[profile.id] = fullName || profile.email || `Usuario ${profile.id.slice(0, 8)}`
            })
            setCommentAuthorById(profileMap)
            setCommentRolesById(roles)
          } catch {
            setCommentAuthorById({})
            setCommentRolesById({})
          }
        } else {
          setCommentAuthorById({})
          setCommentRolesById({})
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'No se pudieron cargar los comentarios.'
        setPublicCommentsError(message)
        setPublicComments([])
        setCommentAuthorById({})
        setCommentRolesById({})
      } finally {
        setPublicCommentsLoading(false)
      }
    }
    void loadPublicComments()
  }, [data?.caso?.id, data?.comentarios])

  useEffect(() => {
    if (!data?.comentarios?.length) return
    const authorityAuthorIds = data.comentarios.map((entry) => entry.autor_id).filter((value): value is string => Boolean(value))
    const uniqueAuthors = Array.from(new Set(authorityAuthorIds))
    if (uniqueAuthors.length === 0) return
    void getProfilesBasicByIds(uniqueAuthors)
      .then((profiles) => {
        const profileMap: Record<string, string> = {}
        profiles.forEach((profile) => {
          const fullName = [profile.name, profile.last_name].filter(Boolean).join(' ').trim()
          profileMap[profile.id] = fullName || profile.email || `Usuario ${profile.id.slice(0, 8)}`
        })
        setCommentAuthorById((prev) => ({ ...prev, ...profileMap }))
      })
      .catch(() => { return })
  }, [data?.comentarios])

  if (isLoading) {
    return (
      <>
        <UserNavbar />
        <Spinner fullScreen />
      </>
    )
  }

  if (isError || !data) {
    return (
      <>
        <UserNavbar />
        <main className="bg-background min-h-screen py-8 px-4">
          <div className="max-w-4xl mx-auto rounded-2xl border border-border/50 bg-card p-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-error/10 flex items-center justify-center mx-auto">
              <UserSearch size={22} className="text-error" />
            </div>
            <div>
              <p className="text-base font-bold text-text-primary">No se pudo cargar el caso</p>
              <p className="text-sm text-text-secondary mt-1">{error instanceof Error ? error.message : 'Error inesperado.'}</p>
            </div>
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => refetch()} className="btn-secondary text-sm">Reintentar</button>
              <Link to="/user" className="btn-primary text-sm">Volver</Link>
            </div>
          </div>
        </main>
      </>
    )
  }

  const { caso, media, comentarios } = data
  const photos = media.filter(item => item.tipo === 'foto')
  const video = media.find(item => item.tipo === 'video')
  const mainPhoto = photos.find(item => item.es_principal)?.url ?? caso.foto_principal_url ?? photos[0]?.url ?? null
  const safeLocation = buildApproximateLocation(caso.ciudad, caso.pais)
  const fullName = `${caso.nombres} ${caso.apellidos}`.trim()
  const displayName = fullName || 'Persona no identificada'
  const detailDate = formatShortDate(caso.fecha_desaparicion)
  const visibilityLabel = formatVisibilityLabel(caso.visibilidad_contacto)
  const visibilityClasses = getVisibilityBadgeClasses(caso.visibilidad_contacto)
  const lastSeenLocation = caso.lugar_ultima_vez || caso.lugar_desaparicion || safeLocation
  const ageLabel = typeof caso.edad === 'number' ? `${caso.edad} años` : 'Edad no disponible'
  const generoValue = caso.genero?.trim()
  const genderLabel = generoValue ? `${generoValue.charAt(0).toUpperCase()}${generoValue.slice(1)}` : 'Género no disponible'
  const locationLabel = caso.ciudad || safeLocation
  const commentsEnabled = isPublicCommentEnabled(caso.workflow_status)
  const authorityComments = comentarios.filter((comentario) => {
    if (!comentario.autor_id) return false
    if (Object.keys(commentRolesById).length === 0) return true
    const roles = commentRolesById[comentario.autor_id] ?? []
    return roles.includes('authority') || roles.includes('admin')
  })
  const posterTitle = getPosterTitle(caso.status, caso.workflow_status)
  const posterDate = formatPosterDate(caso.fecha_desaparicion)
  const statusLabel = formatStatusLabel(caso.status)

  const posterStyles = `
    :root { --primary: #3266db; --primary-dark: #2954b8; --text: #0f172a; --muted: #475569; --border: #e2e8f0; --bg: #ffffff; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: "Segoe UI", Arial, sans-serif; color: var(--text); background: var(--bg); }
    .poster { max-width: 820px; margin: 0 auto; border: 1px solid var(--border); }
    .banner { background: var(--primary); color: white; text-align: center; padding: 28px 16px; font-size: 44px; letter-spacing: 2px; font-weight: 800; }
    .body { padding: 20px 24px 28px; }
    .row { display: grid; grid-template-columns: 1.1fr 1fr; gap: 20px; align-items: center; }
    .photo { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; border: 1px solid var(--border); border-radius: 8px; }
    .photo.placeholder { display: flex; align-items: center; justify-content: center; color: var(--muted); background: #f8fafc; }
    .info { border: 2px solid var(--primary); border-radius: 10px; padding: 16px; }
    .info h3 { margin: 0 0 8px 0; font-size: 18px; text-transform: uppercase; color: var(--primary); }
    .info .date { font-size: 28px; font-weight: 800; color: var(--primary-dark); margin: 8px 0 12px; }
    .info ul { margin: 0; padding-left: 18px; color: var(--muted); font-size: 14px; }
    .name { margin: 22px 0 0; background: #0f172a; color: white; text-align: center; padding: 14px; font-size: 20px; font-weight: 700; letter-spacing: 0.4px; }
    .contact { margin-top: 18px; border-top: 1px solid var(--border); padding-top: 16px; text-align: center; }
    .contact h4 { margin: 0 0 8px; color: var(--primary); text-transform: uppercase; letter-spacing: 1px; }
    .contact p { margin: 4px 0; font-weight: 700; font-size: 18px; }
    .footer-note { margin-top: 10px; font-size: 12px; color: var(--muted); }
    @media print { body { background: white; } .poster { border: none; } }
  `

  const buildPosterMarkup = () => {
    const contactPhone = caso.telefono_contacto?.trim()
    const contactEmail = caso.email_contacto?.trim()
    const contactVisible = caso.visibilidad_contacto !== 'privado'
    const locationLabel = caso.lugar_ultima_vez || caso.lugar_desaparicion || safeLocation
    const photoHtml = mainPhoto
      ? `<img src="${mainPhoto}" alt="Foto del caso" class="photo" crossorigin="anonymous" />`
      : `<div class="photo placeholder">Sin foto disponible</div>`
    return `
      <div class="poster">
        <div class="banner">${posterTitle}</div>
        <div class="body">
          <div class="row">
            <div>${photoHtml}</div>
            <div class="info">
              <h3>${posterTitle} desde</h3>
              <div class="date">${posterDate}</div>
              <ul>
                <li>Ciudad: ${caso.ciudad ?? 'No disponible'}</li>
                <li>Lugar: ${locationLabel ?? 'No disponible'}</li>
                <li>Numero de caso: ${caso.numero_caso}</li>
              </ul>
            </div>
          </div>
          <div class="name">${displayName}</div>
          <div class="contact">
            <h4>Para informacion</h4>
            ${contactVisible
              ? `${contactPhone ? `<p>${contactPhone}</p>` : ''}${contactEmail ? `<p>${contactEmail}</p>` : ''}`
              : '<p>Contacto reservado</p>'}
            <div class="footer-note">FindMe - Afiche generado desde la plataforma</div>
          </div>
        </div>
      </div>
    `
  }

  const openPosterPrint = () => {
    const html = `<!doctype html><html lang="es"><head><meta charset="utf-8" /><title>Afiche - ${displayName}</title><style>${posterStyles}</style></head><body>${buildPosterMarkup()}<script>window.onload = () => { setTimeout(() => window.print(), 300); };<\/script></body></html>`
    try {
      const iframe = document.createElement('iframe')
      iframe.setAttribute('aria-hidden', 'true')
      Object.assign(iframe.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' })
      iframe.srcdoc = html
      document.body.appendChild(iframe)
      iframe.onload = () => {
        try { iframe.contentWindow?.focus(); iframe.contentWindow?.print() }
        finally { setTimeout(() => iframe.remove(), 1000) }
      }
    } catch {
      setShareNotice({ type: 'warning', message: 'No se pudo abrir la impresion. Revisa permisos del navegador.' })
    }
  }

  const downloadPosterPdf = async () => {
    if (pdfLoading) return
    setPdfLoading(true)
    setShareNotice(null)
    let container: HTMLDivElement | null = null
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')])
      container = document.createElement('div')
      Object.assign(container.style, { position: 'fixed', left: '-10000px', top: '0', width: '820px', background: '#ffffff' })
      container.innerHTML = `<style>${posterStyles}</style>${buildPosterMarkup()}`
      document.body.appendChild(container)
      const posterElement = container.querySelector('.poster') as HTMLElement | null
      if (!posterElement) throw new Error('No se pudo preparar el afiche.')
      const canvas = await html2canvas(posterElement, { scale: 2, backgroundColor: '#ffffff', useCORS: true })
      const imgData = canvas.toDataURL('image/jpeg', 0.95)
      const pdf = new jsPDF({ orientation: canvas.width > canvas.height ? 'landscape' : 'portrait', unit: 'px', format: [canvas.width, canvas.height] })
      pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height)
      pdf.save(`Afiche-${caso.numero_caso}.pdf`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo descargar el PDF.'
      setShareNotice({ type: 'error', message })
    } finally {
      if (container) container.remove()
      setPdfLoading(false)
    }
  }

  const submitPublicComment = async () => {
    setCommentNotice(null)
    if (!commentsEnabled) { setCommentNotice({ type: 'warning', message: 'Los comentarios solo están habilitados en publicaciones activas.' }); return }
    if (!user?.id) { setCommentNotice({ type: 'warning', message: 'Inicia sesión para comentar.' }); return }
    const trimmed = publicCommentDraft.trim()
    if (trimmed.length < 3) { setCommentNotice({ type: 'warning', message: 'Escribe un comentario de al menos 3 caracteres.' }); return }
    setPublicCommentSubmitting(true)
    try {
      const payload = `${PUBLIC_COMMENT_PREFIX} ${trimmed}`
      const created = await createCaseComment(caso.id, user.id, payload)
      setPublicComments((prev) => [...prev, { id: created.id, caseId: caso.id, authorId: user.id, text: trimmed, createdAt: new Date().toISOString() }])
      const dName = [user.name, user.last_nmae].filter(Boolean).join(' ').trim()
      if (dName) setCommentAuthorById((prev) => ({ ...prev, [user.id]: dName }))
      setPublicCommentDraft('')
      setCommentNotice({ type: 'success', message: 'Comentario publicado.' })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo publicar el comentario.'
      setCommentNotice({ type: 'error', message })
    } finally {
      setPublicCommentSubmitting(false)
    }
  }

  const reportPublicComment = async (comment: PublicComment) => {
    setCommentNotice(null)
    if (!user?.id) { setCommentNotice({ type: 'warning', message: 'Inicia sesión para reportar comentarios.' }); return }
    const motivo = window.prompt('Motivo del reporte (ej: acoso, datos personales).')?.trim() ?? ''
    if (!motivo) return
    const detalle = window.prompt('Detalle adicional (opcional).')?.trim() ?? ''
    setReportingCommentId(comment.id)
    try {
      await reportarComentarioPublico({ casoId: caso.id, comentarioId: comment.id, motivo, descripcion: detalle, comentarioTexto: comment.text })
      setCommentNotice({ type: 'success', message: 'Comentario reportado. Gracias por ayudarnos.' })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo reportar el comentario.'
      setCommentNotice({ type: 'error', message })
    } finally {
      setReportingCommentId(null)
    }
  }

  const copyShareLink = async () => {
    const shareUrl = buildCaseShareUrl(caso.id)
    if (!navigator.clipboard?.writeText) { setShareNotice({ type: 'info', message: `Enlace: ${shareUrl}` }); return }
    try {
      await navigator.clipboard.writeText(shareUrl)
      setShareNotice({ type: 'success', message: 'Enlace copiado al portapapeles.' })
    } catch {
      setShareNotice({ type: 'warning', message: 'No se pudo copiar automáticamente.' })
    }
  }

  const shareCase = async () => {
    const shareUrl = buildCaseShareUrl(caso.id)
    const text = buildShareText(caso.numero_caso, displayName)
    if (typeof navigator.share === 'function') {
      try { await navigator.share({ title: `FindMe - ${caso.numero_caso}`, text, url: shareUrl }); return }
      catch (shareError) { if (shareError instanceof DOMException && shareError.name === 'AbortError') return }
    }
    await copyShareLink()
  }

  const shareOnSocial = (network: ShareNetwork) => {
    const shareUrl = buildCaseShareUrl(caso.id)
    const text = buildShareText(caso.numero_caso, displayName)
    window.open(buildSocialShareUrl(network, shareUrl, text), '_blank', 'noopener,noreferrer')
  }

  return (
    <>
      <UserNavbar />

      <main className="relative bg-background min-h-screen pb-16 px-4 overflow-hidden">
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/8 blur-3xl" />
        <div className="pointer-events-none absolute top-56 -left-24 h-72 w-72 rounded-full bg-info/6 blur-3xl" />

        <div className="max-w-5xl mx-auto space-y-6 relative pt-8">

          <Link
            to="/user"
            className="inline-flex items-center gap-1.5 text-xs text-text-secondary hover:text-primary transition-colors"
          >
            <ChevronLeft size={14} /> Volver al listado
          </Link>

          {/* ── Hero card ─────────────────────────────────────────────── */}
          <article className="rounded-3xl border border-border/50 bg-card overflow-hidden shadow-xl shadow-black/5">
            <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr]">
              {/* Photo */}
              <div className="relative min-h-[280px] bg-border/10 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent z-10" />
                <span className="absolute top-4 left-4 z-20 rounded-full bg-primary text-white text-[10px] font-black px-3 py-1.5 tracking-widest shadow-lg">
                  {posterTitle}
                </span>
                {mainPhoto ? (
                  <img src={mainPhoto} alt={`Foto de ${displayName}`} className="w-full h-full object-cover" />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center gap-3 text-text-secondary/40">
                    <UserSearch size={44} />
                    <span className="text-xs">Sin foto disponible</span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-6 lg:p-8 space-y-5 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.35em] text-text-secondary font-medium">
                        Caso {caso.numero_caso}
                      </p>
                      <h1 className="text-2xl font-bold text-text-primary mt-1 leading-tight">{displayName}</h1>
                    </div>
                    <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/8 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-primary">
                      {statusLabel}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <CaseChip label={ageLabel} />
                    <CaseChip label={genderLabel} />
                    <CaseChip icon={<Eye size={12} />} label={`${caso.vistas} vistas`} />
                    <CaseChip icon={<MapPin size={12} />} label={locationLabel} />
                  </div>

                  <div className="h-px bg-border/40" />

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <DetailItem label="Ojos" value={caso.color_ojos} />
                    <DetailItem label="Cabello" value={caso.color_cabello} />
                    <DetailItem label="Ciudad" value={caso.ciudad} />
                    <DetailItem label="País" value={caso.pais} />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <InfoTile icon={<Calendar size={15} />} label="Fecha desaparición" value={detailDate} />
                    <InfoTile icon={<Clock size={15} />} label="Hora aproximada" value={caso.hora_desaparicion} />
                  </div>
                </div>
              </div>
            </div>
          </article>

          {/* ── Description + Contact ─────────────────────────────────── */}
          <section className="grid grid-cols-1 lg:grid-cols-[1.4fr_0.9fr] gap-5">
            <div className="rounded-2xl border border-border/50 bg-card p-6 space-y-5 shadow-sm">
              <SectionTitle icon={<FileText size={16} />} title="Descripción y circunstancias" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <DetailItem label="Descripción general" value={caso.descripcion_general} valueClassName="font-medium" />
                <DetailItem label="Señas particulares" value={caso.senas_particulares} valueClassName="font-medium" />
                <DetailItem label="Ropa al momento" value={caso.ropa_descripcion} valueClassName="font-medium" />
                <DetailItem label="Circunstancias" value={caso.circunstancias} valueClassName="font-medium" />
                <DetailItem label="Último lugar visto" value={lastSeenLocation} valueClassName="font-medium" className="sm:col-span-2" />
              </div>
            </div>

            <div className="rounded-2xl border border-border/50 bg-card p-6 space-y-4 shadow-sm">
              <SectionTitle icon={<PhoneCall size={16} />} title="Contacto" />
              <div className="flex items-center gap-2 text-xs text-text-secondary">
                <span className="text-text-secondary/60">Visibilidad:</span>
                <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-widest ${visibilityClasses}`}>
                  {visibilityLabel}
                </span>
              </div>
              <div className="space-y-2.5">
                <InfoTile icon={<Phone size={15} />} label="Teléfono" value={caso.telefono_contacto} />
                <InfoTile icon={<Mail size={15} />} label="Email" value={caso.email_contacto} />
              </div>
            </div>
          </section>

          {/* ── Actions ───────────────────────────────────────────────── */}
          <section className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-text-primary">Acciones del caso</h2>
                <p className="text-xs text-text-secondary mt-0.5">
                  Reportar avistamiento, compartir o descargar el afiche oficial.
                </p>
              </div>

              <div className="relative shrink-0" ref={actionsMenuRef}>
                <button
                  type="button"
                  onClick={() => setActionsOpen((c) => !c)}
                  className="w-9 h-9 rounded-xl border border-border/60 bg-card text-text-secondary shadow-sm hover:bg-primary/8 hover:text-primary hover:border-primary/30 transition-colors flex items-center justify-center"
                  aria-label="Más acciones del caso"
                >
                  <MoreVertical size={18} strokeWidth={2.5} />
                </button>

                {actionsOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-card border border-border/60 rounded-2xl shadow-xl p-1.5 z-20 animate-in fade-in slide-in-from-top-2">
                    <Link
                      to={`/caso/${caso.id}/avistamiento`}
                      onClick={() => setActionsOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-text-primary hover:bg-primary/8 transition-colors"
                    >
                      <Eye size={14} className="text-primary" />
                      Reportar avistamiento
                    </Link>
                    <Link
                      to={`/caso/${caso.id}/reportar`}
                      onClick={() => setActionsOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-text-primary hover:bg-error/8 transition-colors"
                    >
                      <Flag size={14} className="text-error" />
                      Reportar contenido
                    </Link>
                    <div className="my-1 h-px bg-border/40 mx-2" />
                    <button
                      type="button"
                      onClick={() => { void copyShareLink(); setActionsOpen(false) }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-text-primary hover:bg-primary/8 transition-colors"
                    >
                      <Link2 size={14} className="text-text-secondary" />
                      Copiar enlace
                    </button>
                    <button
                      type="button"
                      onClick={() => { void shareCase(); setActionsOpen(false) }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-text-primary hover:bg-primary/8 transition-colors"
                    >
                      <Share2 size={14} className="text-text-secondary" />
                      Compartir
                    </button>
                    <div className="my-1 h-px bg-border/40 mx-2" />
                    <button
                      type="button"
                      onClick={() => { shareOnSocial('whatsapp'); setActionsOpen(false) }}
                      className="w-full text-left px-3 py-2.5 rounded-xl text-sm text-text-primary hover:bg-primary/8 transition-colors"
                    >
                      Compartir por WhatsApp
                    </button>
                    <button
                      type="button"
                      onClick={() => { shareOnSocial('x'); setActionsOpen(false) }}
                      className="w-full text-left px-3 py-2.5 rounded-xl text-sm text-text-primary hover:bg-primary/8 transition-colors"
                    >
                      Compartir en X
                    </button>
                    <button
                      type="button"
                      onClick={() => { shareOnSocial('facebook'); setActionsOpen(false) }}
                      className="w-full text-left px-3 py-2.5 rounded-xl text-sm text-text-primary hover:bg-primary/8 transition-colors"
                    >
                      Compartir en Facebook
                    </button>
                    <div className="my-1 h-px bg-border/40 mx-2" />
                    <button
                      type="button"
                      onClick={() => { openPosterPrint(); setActionsOpen(false) }}
                      className="w-full text-left px-3 py-2.5 rounded-xl text-sm text-text-primary hover:bg-primary/8 transition-colors"
                    >
                      Imprimir afiche (PDF)
                    </button>
                    <button
                      type="button"
                      onClick={() => { void downloadPosterPdf(); setActionsOpen(false) }}
                      className="w-full text-left px-3 py-2.5 rounded-xl text-sm text-text-primary hover:bg-primary/8 transition-colors"
                      disabled={pdfLoading}
                    >
                      {pdfLoading ? 'Descargando...' : 'Descargar PDF'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {shareNotice && <Alert type={shareNotice.type} message={shareNotice.message} />}
          </section>

          {/* ── Authority comments ────────────────────────────────────── */}
          <section className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm space-y-4">
            <SectionTitle icon={<MessageSquare size={16} />} title="Comentarios de autoridad" />

            {authorityComments.length === 0 && (
              <p className="text-sm text-text-secondary/70 py-2">Aún no hay comentarios de la autoridad para este caso.</p>
            )}

            {authorityComments.length > 0 && (
              <div className="space-y-3">
                {authorityComments.map((comentario) => (
                  <article key={comentario.id} className="rounded-xl border border-border/50 bg-background/60 p-4">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <p className="text-sm font-semibold text-text-primary">
                        {comentario.autor_id ? commentAuthorById[comentario.autor_id] ?? comentario.autor : comentario.autor}
                      </p>
                      <p className="text-xs text-text-secondary/70">{formatDateTime(comentario.created_at)}</p>
                    </div>
                    {comentario.estado && (
                      <span className="inline-flex mt-2 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-primary/10 text-primary capitalize">
                        {formatEstado(comentario.estado)}
                      </span>
                    )}
                    <p className="text-sm text-text-primary mt-2 whitespace-pre-wrap leading-relaxed">{comentario.contenido}</p>
                  </article>
                ))}
              </div>
            )}
          </section>

          {/* ── Public comments ───────────────────────────────────────── */}
          <section className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-text-primary inline-flex items-center gap-2">
              <MessageSquare size={17} className="text-primary" />
              Comentarios públicos
            </h2>

            {commentNotice && <Alert type={commentNotice.type} message={commentNotice.message} />}

            {publicCommentsLoading && (
              <div className="flex items-center gap-2 text-sm text-text-secondary py-2">
                <div className="w-4 h-4 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                Cargando comentarios...
              </div>
            )}

            {publicCommentsError && (
              <div className="rounded-xl border border-warning/25 bg-warning/5 p-3">
                <p className="text-xs text-text-secondary">{publicCommentsError}</p>
              </div>
            )}

            {!publicCommentsLoading && !publicCommentsError && publicComments.length === 0 && (
              <p className="text-sm text-text-secondary/70 py-2">Aún no hay comentarios públicos para este caso.</p>
            )}

            {publicComments.length > 0 && (
              <div className="space-y-3">
                {publicComments.map((comment) => (
                  <article key={comment.id} className="rounded-xl border border-border/50 bg-background/60 p-4">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <p className="text-sm font-semibold text-text-primary">
                        {commentAuthorById[comment.authorId] ?? getPublicCommentAuthorLabel(comment.authorId, user?.id)}
                      </p>
                      <p className="text-xs text-text-secondary/70">{formatPublicCommentDate(comment.createdAt)}</p>
                    </div>
                    <p className="text-sm text-text-primary mt-2 whitespace-pre-wrap leading-relaxed">{comment.text}</p>
                    <div className="mt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => void reportPublicComment(comment)}
                        className="inline-flex items-center gap-1 text-[11px] text-text-secondary/60 hover:text-error transition-colors"
                        disabled={reportingCommentId === comment.id}
                      >
                        <Flag size={11} />
                        {reportingCommentId === comment.id ? 'Reportando...' : 'Reportar'}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {commentsEnabled ? (
              <div className="space-y-2 pt-1">
                <textarea
                  rows={3}
                  value={publicCommentDraft}
                  onChange={(e) => setPublicCommentDraft(e.target.value.slice(0, 300))}
                  placeholder={user ? 'Escribe un comentario de apoyo o información útil...' : 'Inicia sesión para comentar'}
                  className="input-field resize-none rounded-xl"
                  disabled={!user || publicCommentSubmitting}
                />
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] text-text-secondary/60 tabular-nums">{publicCommentDraft.length}/300</p>
                  <button
                    type="button"
                    onClick={() => void submitPublicComment()}
                    className="btn-primary text-xs px-4 py-2 rounded-xl inline-flex items-center gap-1.5"
                    disabled={!user || !publicCommentDraft.trim() || publicCommentSubmitting}
                  >
                    <MessageSquare size={13} />
                    {publicCommentSubmitting ? 'Publicando...' : 'Comentar'}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-text-secondary/60 bg-border/20 rounded-xl px-4 py-3">
                Comentarios cerrados: solo se permite comentar en publicaciones activas.
              </p>
            )}
          </section>

          {/* ── Media ─────────────────────────────────────────────────── */}
          <section className="space-y-4">
            <h2 className="text-base font-bold text-text-primary">Media del caso</h2>

            {photos.length === 0 && !video && (
              <div className="rounded-2xl border border-dashed border-border/60 bg-card/40 p-8 text-center">
                <p className="text-sm text-text-secondary/70">No hay imágenes o video cargados para este caso.</p>
              </div>
            )}

            {photos.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {photos.map((photo) => (
                  <a
                    key={photo.id}
                    href={photo.url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-2xl overflow-hidden aspect-square border border-border/50 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 bg-border/10"
                  >
                    <img src={photo.url} alt="Foto del caso" className="w-full h-full object-cover" />
                  </a>
                ))}
              </div>
            )}

            {video && (
              <div className="rounded-2xl border border-border/50 bg-card p-4 space-y-3 shadow-sm">
                <p className="text-sm font-semibold text-text-primary inline-flex items-center gap-2">
                  <Video size={15} className="text-primary" />
                  Video del caso
                </p>
                <video controls className="w-full rounded-xl border border-border/50">
                  <source src={video.url} type={video.mime_type ?? 'video/mp4'} />
                </video>
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  )
}