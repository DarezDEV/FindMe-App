import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, Mail, Save, ShieldCheck, UserCircle2 } from 'lucide-react'
import { useAuth } from '../../auth/hooks'
import { Alert, Spinner } from '../../../shared/components/ui'
import { supabase } from '../../../lib/supabase/client'
import UserNavbar from '../components/UserNavbar'

interface ProfileFormState {
  name: string
  lastName: string
  avatarUrl: string
}

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
  }, [user])

  const roles = useMemo(() => user?.roles ?? [], [user?.roles])

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
      await updateProfileBasics(user.id, form)
      await refreshUser()
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
        <div className="max-w-3xl mx-auto space-y-6">
          <Link
            to="/user"
            className="inline-flex items-center gap-1.5 text-xs text-text-secondary hover:text-primary transition-colors"
          >
            <ChevronLeft size={14} />
            Volver al inicio
          </Link>

          <section className="card p-6 sm:p-7 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary-soft text-primary flex items-center justify-center ring-4 ring-primary/10">
                  <UserCircle2 size={22} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-text-primary">Mi perfil</h1>
                  <p className="text-sm text-text-secondary mt-1">
                    Gestiona tus datos personales y revisa la informacion de tu cuenta.
                  </p>
                </div>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs text-text-secondary">
                Miembro desde <span className="font-semibold text-text-primary">{formatDate(user.created_at)}</span>
              </div>
            </div>

            {notice && <Alert type={notice.type} message={notice.message} />}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

            <div className="rounded-xl border border-border bg-background p-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Roles activos</p>
              <div className="flex flex-wrap gap-2">
                {roles.map((role) => (
                  <span
                    key={role}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary-soft text-primary"
                  >
                    <ShieldCheck size={12} />
                    {role}
                  </span>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
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

              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                  URL de avatar (opcional)
                </label>
                <input
                  className="input-field"
                  value={form.avatarUrl}
                  onChange={(event) => setForm((prev) => ({ ...prev, avatarUrl: event.target.value }))}
                  placeholder="https://..."
                />
              </div>

              <div className="flex items-center justify-end">
                <button type="submit" className="btn-primary inline-flex items-center gap-2 text-sm" disabled={saving}>
                  <Save size={14} />
                  {saving ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </section>
        </div>
      </main>
    </>
  )
}
