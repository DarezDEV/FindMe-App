import { supabase } from './client'
import { logError, toAppError } from '../../shared/utils/errors'

export interface ProfileBasicsInput {
  name: string
  lastName: string
  avatarUrl: string
}

export async function updateProfileBasics(userId: string, input: ProfileBasicsInput) {
  const now = new Date().toISOString()
  const name = input.name.trim()
  const lastName = input.lastName.trim()
  const avatarUrl = input.avatarUrl.trim() || null

  const nameKeys = ['name', 'nombre', 'nombres', 'first_name', 'full_name', 'display_name']
  const lastNameKeys = ['last_name', 'apellido', 'apellidos', 'last_nmae', 'surname']
  const avatarKeys = ['avatar_url', 'avatar', 'foto', 'photo_url']
  const updatedAtKeys = ['updated_at', 'updatedAt']

  const { data: profileRow, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  const profileErrorMessage = profileError?.message?.toLowerCase() ?? ''
  const shouldSkipIntrospection =
    profileErrorMessage.includes('row-level security policy') || profileErrorMessage.includes('permission denied')

  if (profileError) {
    logError('updateProfileBasics.profileLookup', profileError, { shouldSkipIntrospection })
  }

  const existingColumns = new Set<string>(
    profileRow && !shouldSkipIntrospection ? Object.keys(profileRow as Record<string, unknown>) : [],
  )

  const pickExisting = (keys: string[]) => keys.find((key) => existingColumns.has(key)) ?? null

  const payloads: Array<Record<string, string | null>> = []
  const seenPayloads = new Set<string>()

  const pushPayload = (payload: Record<string, string | null>) => {
    const key = JSON.stringify(payload)
    if (seenPayloads.has(key)) return
    seenPayloads.add(key)
    payloads.push(payload)
  }

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
      pushPayload(payload)
    }
  } else {
    const candidatePairs = [
      { nameKey: 'name', lastKey: 'last_nmae' },
      { nameKey: 'name', lastKey: 'last_name' },
      { nameKey: 'nombres', lastKey: 'apellidos' },
      { nameKey: 'nombre', lastKey: 'apellido' },
    ] as const

    const avatarKeyCandidates = ['avatar_url', 'avatar'] as const
    const updatedKeyCandidates = ['updated_at', 'updatedAt'] as const

    for (const pair of candidatePairs) {
      const base: Record<string, string | null> = { [pair.nameKey]: name, [pair.lastKey]: lastName }
      pushPayload({ ...base })

      for (const avatarKey of avatarKeyCandidates) {
        pushPayload({ ...base, [avatarKey]: avatarUrl })
      }

      for (const updatedKey of updatedKeyCandidates) {
        pushPayload({ ...base, [updatedKey]: now })
      }

      for (const avatarKey of avatarKeyCandidates) {
        for (const updatedKey of updatedKeyCandidates) {
          pushPayload({ ...base, [avatarKey]: avatarUrl, [updatedKey]: now })
        }
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
        throw toAppError(error, 'No tienes permisos para actualizar tu perfil.', 'updateProfileBasics')
      }
      throw toAppError(error, 'No se pudo actualizar tu perfil. Inténtalo nuevamente.', 'updateProfileBasics')
    }
  }

  throw new Error('No se pudo actualizar el perfil. Verifica las columnas de la tabla profiles.')
}
