// src/features/admin/components/users/UserFormModal.tsx
import { useState } from 'react'
import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import { X, Check, UserCheck, UserX } from 'lucide-react'
import { supabase } from '../../../lib/supabase/client'
import {
  ADMIN_DASHBOARD_SUMMARY_QUERY_KEY,
  ADMIN_USERS_QUERY_KEY,
} from '../hooks/queryKeys'
import { ROLE_OPTIONS, roleLabel, type Role } from './role-meta'
import type { UserRow } from './UserTableRow'

interface Props {
  mode: 'create' | 'edit'
  user: UserRow | null
  onClose: () => void
  onSuccess: () => void
}

interface CreateUserResponse {
  user?: { id: string }
  error?: string
}

interface RoleDbRow {
  id: string
  name: string
}

const SESSION_TIMEOUT_MS = 10000
const INVOKE_TIMEOUT_MS = 45000

const withTimeout = async <T,>(
  promise: PromiseLike<T>,
  ms = SESSION_TIMEOUT_MS,
  step = 'operation'
): Promise<T> => {
  let timeoutId: number | undefined

  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeoutId = window.setTimeout(() => reject(new Error(`Timeout:${step}`)), ms)
      }),
    ])
  } finally {
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId)
    }
  }
}

const parseFunctionError = async (error: FunctionsHttpError) => {
  const response = error.context
  const status = response.status

  try {
    const payload = (await response.clone().json()) as { error?: string }
    if (payload?.error) return payload.error
  } catch {
    // ignore parsing errors and fallback to generic message
  }

  try {
    const text = await response.clone().text()
    if (text) return text
  } catch {
    // ignore parsing errors and fallback to generic message
  }

  if (status === 401) {
    return 'Tu sesion expiro o no estas autorizado. Inicia sesion nuevamente.'
  }
  if (status === 403) {
    return 'Solo los administradores pueden crear usuarios.'
  }
  if (status === 504) {
    return 'La funcion create-user tardo demasiado. Revisa sus logs e intenta nuevamente.'
  }

  return 'No se pudo crear el usuario.'
}

export function UserFormModal({ mode, user, onClose, onSuccess }: Props) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    name: user?.name ?? '',
    last_name: user?.last_name ?? '',
    email: user?.email ?? '',
    activo: user?.activo ?? true,
    roles: (user?.roles ?? ['user']) as Role[],
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const toggleRole = (role: Role) => {
    set(
      'roles',
      form.roles.includes(role)
        ? form.roles.filter((r) => r !== role)
        : [...form.roles, role]
    )
  }

  const handleSubmit = async () => {
    if (loading) return

    setError(null)

    const name = form.name.trim()
    const lastName = form.last_name.trim()
    const email = form.email.trim().toLowerCase()

    if (!name || !lastName || !email) {
      setError('Nombre, apellido y correo son obligatorios.')
      return
    }

    if (form.roles.length === 0) {
      setError('Asigna al menos un rol.')
      return
    }

    setLoading(true)
    try {
      if (mode === 'create') {
        const { data: sessionData, error: sessionError } = await withTimeout(
          supabase.auth.getSession(),
          SESSION_TIMEOUT_MS,
          'auth.getSession'
        )
        if (sessionError) throw sessionError

        const accessToken = sessionData.session?.access_token
        if (!accessToken) {
          throw new Error('Tu sesion expiro o no estas autorizado. Inicia sesion nuevamente.')
        }

        supabase.functions.setAuth(accessToken)

        const { data, error: invokeError } = await supabase.functions.invoke<CreateUserResponse>(
          'create-user',
          {
            timeout: INVOKE_TIMEOUT_MS,
            body: {
              name,
              last_name: lastName,
              email,
              roles: form.roles,
              redirectTo: `${window.location.origin}/reset-password`,
            },
          }
        )

        if (invokeError) {
          if (invokeError instanceof FunctionsHttpError) {
            throw new Error(await parseFunctionError(invokeError))
          }
          if (invokeError instanceof FunctionsRelayError) {
            throw new Error('No se pudo contactar la funcion create-user. Verifica su despliegue.')
          }
          if (invokeError instanceof FunctionsFetchError) {
            throw new Error('No se pudo conectar con el servidor. Verifica tu conexion e intenta nuevamente.')
          }
          throw new Error(invokeError.message || 'No se pudo crear el usuario.')
        }

        if (data?.error) throw new Error(data.error)
        if (!data?.user?.id) {
          throw new Error('No se recibio el usuario creado por el servidor.')
        }
      } else if (mode === 'edit' && user) {
        const { error: profileError } = await withTimeout(
          supabase
            .from('profiles')
            .update({ name, last_name: lastName, activo: form.activo })
            .eq('id', user.id)
        )
        if (profileError) throw profileError

        const { data: rolesData, error: rolesError } = await withTimeout(
          supabase
            .from('roles')
            .select('id, name')
            .in('name', form.roles)
        )
        if (rolesError) throw rolesError

        const roleRows = (rolesData ?? []) as RoleDbRow[]

        const { error: deleteRolesError } = await withTimeout(
          supabase
            .from('user_roles')
            .delete()
            .eq('user_id', user.id)
        )
        if (deleteRolesError) throw deleteRolesError

        if (roleRows.length > 0) {
          const { error: insertRolesError } = await withTimeout(
            supabase.from('user_roles').insert(
              roleRows.map((role) => ({
                user_id: user.id,
                role_id: role.id,
              }))
            )
          )
          if (insertRolesError) throw insertRolesError
        }
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ADMIN_USERS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: ADMIN_DASHBOARD_SUMMARY_QUERY_KEY }),
      ])

      onSuccess()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error inesperado.'
      if (message.startsWith('Timeout:')) {
        const step = message.replace('Timeout:', '')
        if (step === 'auth.getSession') {
          setError('No se pudo validar tu sesion a tiempo. Intenta recargar la pagina.')
        } else {
          setError('La operacion tardo demasiado. Intenta nuevamente.')
        }
      } else {
        setError(message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-md">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h3 className="font-bold text-text-primary text-lg">
            {mode === 'create' ? 'Crear usuario' : 'Editar usuario'}
          </h3>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
          {error && <div className="alert-error">{error}</div>}

          {/* Nombre y apellido */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Nombre <span className="text-error">*</span>
              </label>
              <input
                className="input-field"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="Juan"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Apellido <span className="text-error">*</span>
              </label>
              <input
                className="input-field"
                value={form.last_name}
                onChange={(e) => set('last_name', e.target.value)}
                placeholder="Perez"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Correo electronico <span className="text-error">*</span>
            </label>
            <input
              className={`input-field ${mode === 'edit' ? 'opacity-60 cursor-not-allowed' : ''}`}
              type="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              placeholder="usuario@correo.com"
              disabled={mode === 'edit'}
            />
            {mode === 'edit' && (
              <p className="text-xs text-text-secondary mt-1">El correo no se puede cambiar.</p>
            )}
          </div>

          {mode === 'create' && (
            <div className="rounded-lg border border-info/30 bg-info/8 p-3 text-sm text-text-secondary">
              Se enviara un correo de invitacion para crear la contrasena en
              {' '}<span className="font-medium text-text-primary">{form.email.trim().toLowerCase() || 'el correo indicado'}</span>.
              {' '}Este proceso puede tardar hasta 1 minuto.
            </div>
          )}

          {/* Roles */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Roles <span className="text-error">*</span>
            </label>
            <div className="flex gap-2 flex-wrap">
              {ROLE_OPTIONS.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => toggleRole(role)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all
                    ${form.roles.includes(role)
                      ? 'bg-primary text-white border-primary'
                      : 'bg-card text-text-secondary border-border hover:border-primary hover:text-primary'
                    }`}
                >
                  {form.roles.includes(role) && <Check size={13} />}
                  {roleLabel(role)}
                </button>
              ))}
            </div>
          </div>

          {/* Estado (solo editar) */}
          {mode === 'edit' && (
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">Estado</label>
              <div className="flex gap-2">
                {([true, false] as const).map((val) => (
                  <button
                    key={String(val)}
                    type="button"
                    onClick={() => set('activo', val)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all
                      ${form.activo === val
                        ? val
                          ? 'bg-success/10 text-success border-success/30'
                          : 'bg-error/10 text-error border-error/30'
                        : 'bg-card text-text-secondary border-border hover:border-primary'
                      }`}
                  >
                    {val ? <UserCheck size={15} /> : <UserX size={15} />}
                    {val ? 'Activo' : 'Inactivo'}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-border">
          <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
          <button onClick={handleSubmit} disabled={loading} className="btn-primary flex-1">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                {mode === 'create' ? 'Enviando invitacion...' : 'Guardando...'}
              </span>
            ) : mode === 'create' ? 'Crear y enviar invitacion' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}
