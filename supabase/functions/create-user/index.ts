// supabase/functions/create-user/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface CreateUserBody {
  name: string
  last_name: string
  email: string
  roles: string[]
  redirectTo?: string
}

interface RoleRow {
  id: string
  name: string
}

interface CallerRoleRow {
  roles: { name: string } | Array<{ name: string }> | null
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const jsonResponse = (status: number, payload: Record<string, unknown>) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

// inviteUserByEmail puede tardar 30-60s en plan free (SMTP compartido de Supabase)
const INVITE_TIMEOUT_MS = 120_000
const STEP_TIMEOUT_MS   = 20_000

function withTimeout<T>(step: string, promise: Promise<T>, ms = STEP_TIMEOUT_MS): Promise<T> {
  const startedAt = Date.now()
  return Promise.race([
    promise.then((r) => {
      console.log(`[create-user] ok:${step} (${Date.now() - startedAt}ms)`)
      return r
    }),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout:${step}`)), ms)
    ),
  ]).catch((err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[create-user] fail:${step} → ${msg}`)
    throw err
  })
}

async function assignRolesAndProfile(
  admin: ReturnType<typeof createClient>,
  userId: string,
  validRoles: RoleRow[],
  name: string,
  lastName: string,
  email?: string
) {
  const { error: deleteErr } = await withTimeout(
    'db.deleteExistingRoles',
    admin.from('user_roles').delete().eq('user_id', userId)
  )
  if (deleteErr) throw deleteErr

  const { error: insertErr } = await withTimeout(
    'db.insertRoles',
    admin.from('user_roles').insert(
      validRoles.map((role) => ({ user_id: userId, role_id: role.id }))
    )
  )
  if (insertErr) throw insertErr

  const profilePayload: Record<string, unknown> = {
    id: userId,
    name,
    last_name: lastName,
    activo: true,
  }
  if (email) profilePayload.email = email

  const { error: profileErr } = await withTimeout(
    'db.upsertProfile',
    admin.from('profiles').upsert(profilePayload, { onConflict: 'id' })
  )
  if (profileErr) {
    console.warn('[create-user] profile upsert warning:', profileErr.message)
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const requestId = crypto.randomUUID().slice(0, 8)
    console.log(`[create-user] ── ${requestId} started ──`)

    // 1. Validar token
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return jsonResponse(401, { error: 'No autorizado' })

    const accessToken = authHeader.replace(/^Bearer\s+/i, '').trim()
    if (!accessToken) return jsonResponse(401, { error: 'Token invalido' })

    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    )

    const { data: { user: caller }, error: callerError } = await withTimeout(
      'auth.getUser',
      supabaseAuth.auth.getUser(accessToken)
    )
    if (callerError || !caller) return jsonResponse(401, { error: 'Token invalido' })

    // 2. Verificar rol admin
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: callerRoles, error: callerRolesError } = await withTimeout(
      'db.fetchCallerRoles',
      supabaseAdmin.from('user_roles').select('roles(name)').eq('user_id', caller.id)
    )
    if (callerRolesError) throw callerRolesError

    const isAdmin = ((callerRoles ?? []) as CallerRoleRow[]).some((row) => {
      if (!row.roles) return false
      if (Array.isArray(row.roles)) return row.roles.some((r) => r.name === 'admin')
      return row.roles.name === 'admin'
    })

    if (!isAdmin) return jsonResponse(403, { error: 'Solo los admins pueden crear usuarios' })

    // 3. Parsear body
    const body = (await req.json()) as Partial<CreateUserBody>
    const name      = body.name?.trim()
    const lastName  = body.last_name?.trim()
    const email     = body.email?.trim().toLowerCase()
    const roles     = Array.isArray(body.roles) ? body.roles : []
    const redirectTo = typeof body.redirectTo === 'string' ? body.redirectTo : undefined

    if (!name || !lastName || !email) {
      return jsonResponse(400, { error: 'Nombre, apellido y correo son obligatorios.' })
    }
    if (roles.length === 0) {
      return jsonResponse(400, { error: 'Asigna al menos un rol.' })
    }

    console.log(`[create-user] ${requestId} email=${email} roles=${roles.join(',')}`)

    // 4. Validar roles primero (falla rápido antes del SMTP)
    const { data: rolesData, error: rolesError } = await withTimeout(
      'db.fetchTargetRoles',
      supabaseAdmin.from('roles').select('id, name').in('name', roles)
    )
    if (rolesError) throw rolesError

    const validRoles = (rolesData ?? []) as RoleRow[]
    if (validRoles.length === 0) {
      return jsonResponse(400, { error: 'No se encontraron roles validos para asignar.' })
    }

    // 5. Invitar usuario (el paso más lento por el SMTP)
    console.log(`[create-user] ${requestId} inviting user...`)

    const { data: inviteData, error: inviteError } = await withTimeout(
      'auth.inviteUserByEmail',
      supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: { name, last_name: lastName },
        redirectTo,
      }),
      INVITE_TIMEOUT_MS
    )

    if (inviteError) {
      const msg = inviteError.message.toLowerCase()

      if (msg.includes('already registered') || msg.includes('already been invited')) {
        console.warn(`[create-user] ${requestId} user exists, re-assigning roles`)

        const { data: listData, error: listError } = await withTimeout(
          'auth.listUsers',
          supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
        )
        if (listError) throw listError

        const foundUser = listData.users.find((u) => u.email === email)
        if (!foundUser) return jsonResponse(409, { error: 'El correo ya está registrado.' })

        await assignRolesAndProfile(supabaseAdmin, foundUser.id, validRoles, name, lastName, email)
        return jsonResponse(200, { user: foundUser, reInvited: true })
      }

      return jsonResponse(msg.includes('rate limit') ? 429 : 400, { error: inviteError.message })
    }

    if (!inviteData?.user) {
      return jsonResponse(500, { error: 'No se pudo crear el usuario invitado.' })
    }

    // 6. Asignar roles y perfil
    await assignRolesAndProfile(supabaseAdmin, inviteData.user.id, validRoles, name, lastName, email)

    console.log(`[create-user] ── ${requestId} done → ${inviteData.user.id} ──`)
    return jsonResponse(201, { user: inviteData.user })

  } catch (err: unknown) {
    if (err instanceof Error && err.message.startsWith('Timeout:')) {
      const step = err.message.replace('Timeout:', '')
      const hint = step === 'auth.inviteUserByEmail'
        ? 'El servidor de correo tardó demasiado. Configura SMTP propio en Supabase → Authentication → SMTP Settings (Resend.com tiene plan gratuito).'
        : `Timeout en "${step}". Revisa los logs de la Edge Function.`
      return jsonResponse(504, { error: hint })
    }
    const message = err instanceof Error ? err.message : 'Error interno'
    console.error('[create-user] error:', message)
    return jsonResponse(500, { error: message })
  }
})