import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, Mail, Save, ShieldCheck, UserCircle2 } from 'lucide-react'
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

    if (Object.keys(payload).length > 0) {
      payloads.push(payload)
    }
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
    const { data, error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', userId)
      .select('id')
      .maybeSingle()

    if (!error && data) return

    if (error) {
      const message = error.message.toLowerCase()
      if (message.includes('column') && message.includes('does not exist')) {
        continue
      }
      if (message.includes('row-level security policy') || message.includes('permission denied')) {
        throw new Error('No tienes permisos para actualizar tu perfil. Revisa las politicas RLS de profiles.')
      }
      throw error
    }
  }

  throw new Error('No se pudo actualizar el perfil. Verifica las columnas de la tabla profiles.')
}

function formatDate(value: string) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString('es-DO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
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
      lastName: (user as { last_nmae?: string; last_name?: string; apellido?: string; apellidos?: string }).last_nmae ??
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
      if (avatarPreview.startsWith('blob:')) {
        URL.revokeObjectURL(avatarPreview)
      }
    }
  }, [avatarPreview])

  const roles = useMemo(() => user?.roles ?? [], [user?.roles])
  const currentAvatar = removeAvatar ? '' : avatarPreview ?? form.avatarUrl
  const avatarInputId = 'perfil-avatar-input'

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setAvatarError('Solo se permiten imagenes.')
      return
    }

    if (file.size > MAX_AVATAR_SIZE) {
      setAvatarError('La imagen supera el limite de 5 MB.')
      return
    }

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

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!user?.id || saving) return

    const name = form.name.trim()
    const lastName = form.lastName.trim()
    if (!name || !lastName) {
      setNotice({ type: 'warning', message: 'Nombre y apellido son obligatorios.' })
      return
    }

    setSaving(true)
    setNotice(null)
    try {
      let avatarUrl = form.avatarUrl
      if (removeAvatar) {
        avatarUrl = ''
      }
      if (avatarFile) {
        avatarUrl = await uploadAvatar(user.id, avatarFile)
      }

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

          <section className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
            <aside className="card p-5 space-y-5 bg-primary text-white border-primary/30">
              <div className="flex flex-col items-center text-center gap-3">
                <div className="h-20 w-20 rounded-2xl border border-white/30 bg-white/10 overflow-hidden flex items-center justify-center text-white">
                  {currentAvatar ? (
                    <img src={currentAvatar} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    <UserCircle2 size={34} />
                  )}
                </div>
                <div>
                  <p className="text-base font-semibold text-white">{user.name ?? 'Usuario'}</p>
                  <p className="text-xs text-white/70">Miembro desde {formatDate(user.created_at)}</p>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <Link to="/mis-casos" className="block px-3 py-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10">
                  Mis casos
                </Link>
                <Link to="/reportar" className="block px-3 py-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10">
                  Reportar contenido
                </Link>
              </div>

              <div className="rounded-xl border border-white/20 bg-white/10 p-3 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Roles activos</p>
                <div className="flex flex-wrap gap-2">
                  {roles.map((role) => (
                    <span
                      key={role}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-white/15 text-white"
                    >
                      <ShieldCheck size={12} />
                      {role}
                    </span>
                  ))}
                </div>
              </div>
            </aside>

            <div className="card overflow-hidden border border-border/70">
              <div className="bg-primary text-white px-6 py-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-white/80">Perfil</p>
                    <h1 className="text-xl font-semibold mt-1">{user.name ?? 'Mi perfil'}</h1>
                  </div>
                  <Link to="/forgot-password" className="text-xs text-white/80 hover:text-white underline underline-offset-4">
                    Cambiar la contraseña
                  </Link>
                </div>
              </div>

              <div className="px-6 pb-6 pt-0">
                <div className="-mt-10 flex items-center gap-4">
                  <div className="relative h-20 w-20 rounded-full border-4 border-white bg-background overflow-hidden shadow-md flex items-center justify-center">
                    {currentAvatar ? (
                      <img src={currentAvatar} alt="Avatar" className="h-full w-full object-cover" />
                    ) : (
                      <UserCircle2 size={34} className="text-text-secondary" />
                    )}
                    <label
                      htmlFor={avatarInputId}
                      className="absolute -right-1 -bottom-1 h-8 w-8 rounded-full bg-primary-hover text-white text-[10px] font-semibold flex items-center justify-center shadow cursor-pointer"
                    >
                      Edit
                    </label>
                    <input
                      id={avatarInputId}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-text-primary">{user.name ?? 'Usuario'}</p>
                    <p className="text-xs text-text-secondary">{user.email}</p>
                    {currentAvatar && (
                      <button
                        type="button"
                        onClick={() => setAvatarModalOpen(true)}
                        className="text-xs text-primary hover:underline"
                      >
                        Ver foto
                      </button>
                    )}
                  </div>
                </div>

                {notice && <div className="mt-4"><Alert type={notice.type} message={notice.message} /></div>}
                {avatarError && <p className="mt-3 text-xs text-error">{avatarError}</p>}

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                        Nombre
                      </label>
                      <input
                        className="input-field"
                        value={form.name}
                        onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
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
                        onChange={(event) => setForm((prev) => ({ ...prev, lastName: event.target.value }))}
                        placeholder="Apellido"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-xl border border-border bg-background p-4 space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Correo</p>
                      <p className="text-sm text-text-primary inline-flex items-center gap-2">
                        <Mail size={14} className="text-primary" />
                        {user.email}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border bg-background p-4 space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Estado de cuenta</p>
                      <p className="text-sm text-text-primary">Activa</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end">
                    <button type="submit" className="btn-primary inline-flex items-center gap-2 text-sm" disabled={saving}>
                      <Save size={14} />
                      {saving ? 'Guardando...' : 'Guardar cambios'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </section>
        </div>
      </main>

      {avatarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            onClick={() => setAvatarModalOpen(false)}
          />
          <div className="relative w-full max-w-sm rounded-2xl border border-border bg-card p-4 shadow-xl">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-text-primary">Foto de perfil</p>
              <button
                type="button"
                onClick={() => setAvatarModalOpen(false)}
                className="text-xs text-text-secondary hover:text-text-primary"
              >
                Cerrar
              </button>
            </div>
            <div className="mt-4 rounded-xl border border-border bg-background overflow-hidden">
              {currentAvatar ? (
                <img src={currentAvatar} alt="Avatar" className="w-full h-64 object-cover" />
              ) : (
                <div className="h-64 flex items-center justify-center text-text-secondary">
                  Sin foto
                </div>
              )}
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              {currentAvatar && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  className="btn-secondary text-error border-error/30 hover:bg-error/5"
                >
                  Quitar foto
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
