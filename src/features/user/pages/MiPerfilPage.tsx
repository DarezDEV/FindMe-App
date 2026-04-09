import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { AtSign, Camera, ChevronLeft, Globe, KeyRound, Mail, Save, ShieldCheck, UserCircle2, X } from 'lucide-react'
import { useAuth } from '../../auth/hooks'
import { Alert, Spinner } from '../../../shared/components/ui'
import { supabase } from '../../../lib/supabase/client'
import UserNavbar from '../components/Usernavbar'
import { uploadAvatar } from '../../../shared/utils/storage'

interface ProfileFormState {
  name: string
  lastName: string
  avatarUrl: string
}

const MAX_AVATAR_SIZE = 5 * 1024 * 1024

async function updateProfileBasics(userId: string, form: ProfileFormState) {
  const now = new Date().toISOString()
  const name = form.name.trim()
  const lastName = form.lastName.trim()
  const avatarUrl = form.avatarUrl.trim() || null

  const nameKeys = ['name', 'nombre', 'nombres', 'first_name', 'full_name', 'display_name']
  const lastNameKeys = ['last_name', 'apellido', 'apellidos', 'last_nmae', 'surname']
  const avatarKeys = ['avatar_url', 'avatar', 'foto', 'photo_url']
  const updatedAtKeys = ['updated_at', 'updatedAt']

  const { data: profileRow, error: profileError } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()

  if (profileError) {
    const lowered = profileError.message.toLowerCase()
    if (lowered.includes('row-level security policy') || lowered.includes('permission denied')) {
      throw new Error('No tienes permisos para actualizar tu perfil. Revisa las politicas RLS de profiles.')
    }
  }

  const existingColumns = new Set<string>(profileRow ? Object.keys(profileRow as Record<string, unknown>) : [])
  const pickExisting = (keys: string[]) => keys.find((key) => existingColumns.has(key)) ?? null
  const payloads: Array<Record<string, string | null>> = []

  if (existingColumns.size > 0) {
    const nameKey = pickExisting(nameKeys)
    const lastKey = pickExisting(lastNameKeys)
    const avatarKey = pickExisting(avatarKeys)
    const updatedKey = pickExisting(updatedAtKeys)

    const payload: Record<string, string | null> = {}
    if (nameKey) payload[nameKey] = name
    if (lastKey) payload[lastKey] = lastName
    if (avatarKey) payload[avatarKey] = avatarUrl
    if (updatedKey) payload[updatedKey] = now

    if (Object.keys(payload).length > 0) payloads.push(payload)
  } else {
    for (const nameKey of nameKeys) {
      for (const lastKey of lastNameKeys) {
        const base = { [nameKey]: name, [lastKey]: lastName }
        payloads.push({ ...base })
        payloads.push({ ...base, avatar_url: avatarUrl })
        payloads.push({ ...base, updated_at: now })
        payloads.push({ ...base, avatar_url: avatarUrl, updated_at: now })
      }
    }
  }

  for (const payload of payloads) {
    const { data, error } = await supabase.from('profiles').update(payload).eq('id', userId).select('id').maybeSingle()
    if (!error && data) return
    if (error) {
      const message = error.message.toLowerCase()
      if (message.includes('column') && message.includes('does not exist')) continue
      if (message.includes('row-level security policy') || message.includes('permission denied')) {
        throw new Error('No tienes permisos para actualizar tu perfil. Revisa las politicas RLS de profiles.')
      }
      throw error
    }
  }

  throw new Error('No se pudo actualizar el perfil. Verifica las columnas de la tabla profiles.')
}

async function updateProfileAvatar(userId: string, avatarUrl: string | null) {
  const now = new Date().toISOString()
  const avatarKeys = ['avatar_url', 'avatar', 'foto', 'photo_url']
  const updatedAtKeys = ['updated_at', 'updatedAt']

  const { data: profileRow, error: profileError } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()

  if (profileError) {
    const lowered = profileError.message.toLowerCase()
    if (lowered.includes('row-level security policy') || lowered.includes('permission denied')) {
      throw new Error('No tienes permisos para actualizar tu perfil. Revisa las politicas RLS de profiles.')
    }
  }

  const existingColumns = new Set<string>(profileRow ? Object.keys(profileRow as Record<string, unknown>) : [])
  const pickExisting = (keys: string[]) => keys.find((key) => existingColumns.has(key)) ?? null
  const payloads: Array<Record<string, string | null>> = []

  if (existingColumns.size > 0) {
    const avatarKey = pickExisting(avatarKeys)
    const updatedKey = pickExisting(updatedAtKeys)
    const payload: Record<string, string | null> = {}
    if (avatarKey) payload[avatarKey] = avatarUrl
    if (updatedKey) payload[updatedKey] = now
    if (Object.keys(payload).length > 0) payloads.push(payload)
  } else {
    for (const avatarKey of avatarKeys) {
      payloads.push({ [avatarKey]: avatarUrl })
      payloads.push({ [avatarKey]: avatarUrl, updated_at: now })
    }
  }

  for (const payload of payloads) {
    const { data, error } = await supabase.from('profiles').update(payload).eq('id', userId).select('id').maybeSingle()
    if (!error && data) return
    if (error) {
      const message = error.message.toLowerCase()
      if (message.includes('column') && message.includes('does not exist')) continue
      if (message.includes('row-level security policy') || message.includes('permission denied')) {
        throw new Error('No tienes permisos para actualizar tu perfil. Revisa las politicas RLS de profiles.')
      }
      throw error
    }
  }

  throw new Error('No se pudo actualizar la foto de perfil. Verifica las columnas de la tabla profiles.')
}

function formatDate(value: string) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function MiPerfilPage() {
  const { user, loading: authLoading, refreshUser } = useAuth()
  const [form, setForm] = useState<ProfileFormState>({ name: '', lastName: '', avatarUrl: '' })
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<{ type: 'error' | 'success' | 'warning' | 'info'; message: string } | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const [avatarModalOpen, setAvatarModalOpen] = useState(false)
  const [removeAvatar, setRemoveAvatar] = useState(false)

  useEffect(() => {
    if (!user) return
    setForm({
      name: user.name ?? '',
      lastName:
        (user as { last_nmae?: string; last_name?: string; apellido?: string; apellidos?: string }).last_nmae ??
        (user as { last_name?: string; apellido?: string; apellidos?: string }).last_name ??
        (user as { apellido?: string; apellidos?: string }).apellido ??
        (user as { apellidos?: string }).apellidos ??
        '',
      avatarUrl: user.avatar_url ?? '',
    })
    setAvatarFile(null)
    setAvatarPreview(null)
    setAvatarError(null)
    setRemoveAvatar(false)
  }, [user])

  useEffect(() => {
    if (!avatarPreview) return
    return () => {
      if (avatarPreview.startsWith('blob:')) URL.revokeObjectURL(avatarPreview)
    }
  }, [avatarPreview])

  const roles = useMemo(() => user?.roles ?? [], [user?.roles])
  const currentAvatar = removeAvatar ? '' : avatarPreview ?? form.avatarUrl
  const avatarInputId = 'perfil-avatar-input'
  const emailValue = user?.email ?? ''
  const username = emailValue ? emailValue.split('@')[0] : 'usuario'

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    if (!file) return
    if (!file.type.startsWith('image/')) { setAvatarError('Solo se permiten imagenes.'); return }
    if (file.size > MAX_AVATAR_SIZE) { setAvatarError('La imagen supera el limite de 5 MB.'); return }
    setAvatarError(null)
    setRemoveAvatar(false)
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const handleRemoveAvatar = () => {
    setAvatarFile(null)
    setAvatarPreview(null)
    setForm((prev) => ({ ...prev, avatarUrl: '' }))
    setRemoveAvatar(true)
    setAvatarModalOpen(false)
  }

  const handleRemoveAvatarAndSave = async () => {
    if (!user?.id || saving) { handleRemoveAvatar(); return }
    handleRemoveAvatar()
    setSaving(true)
    setNotice(null)
    try {
      await updateProfileAvatar(user.id, null)
      await refreshUser()
      setNotice({ type: 'success', message: 'Foto eliminada correctamente.' })
      setRemoveAvatar(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo eliminar la foto.'
      setNotice({ type: 'error', message })
      await refreshUser()
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!user?.id || saving) return
    const name = form.name.trim()
    const lastName = form.lastName.trim()
    if (!name || !lastName) { setNotice({ type: 'warning', message: 'Nombre y apellido son obligatorios.' }); return }
    setSaving(true)
    setNotice(null)
    try {
      let avatarUrl = form.avatarUrl
      if (removeAvatar) avatarUrl = ''
      if (avatarFile) avatarUrl = await uploadAvatar(user.id, avatarFile)
      await updateProfileBasics(user.id, { ...form, avatarUrl })
      await refreshUser()
      setForm((prev) => ({ ...prev, avatarUrl }))
      setAvatarFile(null)
      setAvatarPreview(null)
      setRemoveAvatar(false)
      setNotice({ type: 'success', message: 'Perfil actualizado correctamente.' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo actualizar el perfil.'
      setNotice({ type: 'error', message })
    } finally {
      setSaving(false)
    }
  }

  if (authLoading || !user) {
    return (
      <>
        <UserNavbar />
        <Spinner fullScreen />
      </>
    )
  }

  return (
    <>
      <UserNavbar />

      <main className="min-h-screen bg-background py-8 px-4">
        <div className="max-w-5xl mx-auto space-y-6">

          <Link
            to="/user"
            className="inline-flex items-center gap-1.5 text-xs text-text-secondary hover:text-primary transition-colors"
          >
            <ChevronLeft size={14} />
            Volver al inicio
          </Link>

          <section className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6 items-start">

            {/* ── Sidebar ──────────────────────────────────────────────── */}
            <aside className="rounded-2xl border border-border/50 bg-card shadow-sm overflow-hidden">
              {/* Avatar zone */}
              <div className="bg-gradient-to-b from-primary/8 to-transparent px-5 pt-8 pb-5 flex flex-col items-center text-center gap-3">
                <div className="relative group">
                  <div className="h-24 w-24 rounded-full border-2 border-border bg-background overflow-hidden flex items-center justify-center shadow-sm">
                    {currentAvatar ? (
                      <img src={currentAvatar} alt="Avatar" className="h-full w-full object-cover" />
                    ) : (
                      <UserCircle2 size={38} className="text-text-secondary/50" />
                    )}
                  </div>
                  <label
                    htmlFor={avatarInputId}
                    className="absolute inset-0 rounded-full cursor-pointer flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors"
                    title="Cambiar foto"
                  >
                    <Camera size={18} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </label>
                  <input id={avatarInputId} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                </div>

                <div>
                  <p className="text-base font-bold text-text-primary">{user.name ?? 'Usuario'}</p>
                  <p className="text-xs text-text-secondary mt-0.5">@{username}</p>
                </div>

                <div className="flex items-center gap-2">
                  <label
                    htmlFor={avatarInputId}
                    className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    <Camera size={13} />
                    Cambiar foto
                  </label>
                  {currentAvatar && (
                    <>
                      <span className="text-border">·</span>
                      <button
                        type="button"
                        onClick={() => setAvatarModalOpen(true)}
                        className="text-xs text-text-secondary hover:text-primary transition-colors"
                      >
                        Ver
                      </button>
                    </>
                  )}
                </div>

                {avatarError && (
                  <p className="text-xs text-error bg-error/8 rounded-lg px-3 py-1.5 w-full text-center">{avatarError}</p>
                )}
                <p className="text-[10px] text-text-secondary/70">Máximo 5 MB · Se recorta automáticamente</p>
              </div>

              {/* Meta info */}
              <div className="px-5 pb-5 space-y-3 border-t border-border/40 pt-4">
                <div className="flex items-center gap-2.5 text-xs text-text-secondary">
                  <div className="w-7 h-7 rounded-lg bg-border/30 flex items-center justify-center shrink-0">
                    <Mail size={13} className="text-text-secondary/70" />
                  </div>
                  <span className="truncate">{emailValue}</span>
                </div>

                <div className="flex items-center gap-2.5 text-xs text-text-secondary">
                  <div className="w-7 h-7 rounded-lg bg-border/30 flex items-center justify-center shrink-0">
                    <ChevronLeft size={13} className="rotate-90 text-text-secondary/70" />
                  </div>
                  <span>Miembro desde {formatDate(user.created_at)}</span>
                </div>

                {roles.length > 0 && (
                  <div className="pt-1 space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Roles activos</p>
                    <div className="flex flex-wrap gap-1.5">
                      {roles.map((role) => (
                        <span
                          key={role}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-primary/10 text-primary"
                        >
                          <ShieldCheck size={11} />
                          {role}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </aside>

            {/* ── Main form ────────────────────────────────────────────── */}
            <div className="rounded-2xl border border-border/50 bg-card shadow-sm overflow-hidden">
              <div className="px-6 pt-6 pb-5 border-b border-border/40">
                <h1 className="text-lg font-bold text-text-primary">Editar perfil</h1>
                <p className="text-xs text-text-secondary mt-0.5">Actualiza tu información personal</p>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-7">
                {notice && <Alert type={notice.type} message={notice.message} />}

                {/* Información básica */}
                <fieldset className="space-y-4">
                  <legend className="text-[11px] font-bold uppercase tracking-widest text-text-secondary">
                    Información básica
                  </legend>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                        Nombre
                      </label>
                      <input
                        className="input-field"
                        value={form.name}
                        onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                        placeholder="Nombre"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                        Apellido
                      </label>
                      <input
                        className="input-field"
                        value={form.lastName}
                        onChange={(e) => setForm((prev) => ({ ...prev, lastName: e.target.value }))}
                        placeholder="Apellido"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                        Usuario
                      </label>
                      <input className="input-field bg-background/60 text-text-secondary" value={username} readOnly />
                    </div>
                  </div>
                </fieldset>

                <div className="h-px bg-border/40" />

                {/* Seguridad */}
                <fieldset className="space-y-4">
                  <div className="flex items-center justify-between">
                    <legend className="text-[11px] font-bold uppercase tracking-widest text-text-secondary">
                      Seguridad
                    </legend>
                    <Link
                      to="/forgot-password"
                      className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
                    >
                      <KeyRound size={12} />
                      Cambiar contraseña
                    </Link>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                        Contraseña
                      </label>
                      <input className="input-field bg-background/60 text-text-secondary" type="password" value="********" readOnly />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                        Confirmar contraseña
                      </label>
                      <input className="input-field bg-background/60 text-text-secondary" type="password" value="********" readOnly />
                    </div>
                  </div>
                </fieldset>

                <div className="h-px bg-border/40" />

                {/* Correo */}
                <fieldset className="space-y-4">
                  <legend className="text-[11px] font-bold uppercase tracking-widest text-text-secondary">
                    Correo electrónico
                  </legend>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                        Correo
                      </label>
                      <input className="input-field bg-background/60 text-text-secondary" value={emailValue} readOnly />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                        Confirmar correo
                      </label>
                      <input className="input-field bg-background/60 text-text-secondary" value={emailValue} readOnly />
                    </div>
                  </div>
                </fieldset>

                <div className="h-px bg-border/40" />

                {/* Perfil social */}
                <fieldset className="space-y-4">
                  <div>
                    <legend className="text-[11px] font-bold uppercase tracking-widest text-text-secondary">
                      Perfil social
                    </legend>
                    <p className="text-[11px] text-text-secondary/70 mt-1">Estos campos estarán disponibles pronto.</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary/50">
                        <Globe size={15} />
                      </span>
                      <input className="input-field pl-9 bg-background/40 text-text-secondary/50 cursor-not-allowed" placeholder="Facebook username" disabled />
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary/50">
                        <AtSign size={15} />
                      </span>
                      <input className="input-field pl-9 bg-background/40 text-text-secondary/50 cursor-not-allowed" placeholder="Twitter username" disabled />
                    </div>
                  </div>
                </fieldset>

                <div className="flex items-center justify-end pt-1">
                  <button
                    type="submit"
                    className="btn-primary inline-flex items-center gap-2 text-sm px-5 py-2.5 rounded-xl"
                    disabled={saving}
                  >
                    <Save size={14} />
                    {saving ? 'Guardando...' : 'Guardar cambios'}
                  </button>
                </div>
              </form>
            </div>
          </section>
        </div>
      </main>

      {/* Avatar modal */}
      {avatarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setAvatarModalOpen(false)}
          />
          <div className="relative w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-bold text-text-primary">Foto de perfil</p>
              <button
                type="button"
                onClick={() => setAvatarModalOpen(false)}
                className="w-7 h-7 rounded-full bg-border/40 hover:bg-border/70 text-text-secondary flex items-center justify-center transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            <div className="rounded-xl overflow-hidden border border-border/50 bg-background">
              {currentAvatar ? (
                <img src={currentAvatar} alt="Avatar" className="w-full h-64 object-cover" />
              ) : (
                <div className="h-64 flex flex-col items-center justify-center gap-2 text-text-secondary/50">
                  <UserCircle2 size={36} />
                  <span className="text-xs">Sin foto</span>
                </div>
              )}
            </div>

            {currentAvatar && (
              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleRemoveAvatarAndSave}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-error hover:bg-error/8 px-3 py-2 rounded-lg transition-colors border border-error/25"
                >
                  <X size={13} />
                  Quitar foto
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}