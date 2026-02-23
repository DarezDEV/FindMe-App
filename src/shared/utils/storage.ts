import { supabase } from '../../lib/supabase/client'

/** Sube un avatar de usuario y retorna la URL pública */
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop()
  const path = `avatars/${userId}.${ext}`

  const { error } = await supabase.storage.from('profiles').upload(path, file, {
    upsert: true,
    cacheControl: '3600',
  })
  if (error) throw error

  const { data } = supabase.storage.from('profiles').getPublicUrl(path)
  return data.publicUrl
}

/** Sube una foto de persona desaparecida */
export async function uploadMissingPersonPhoto(
  caseId: string,
  file: File
): Promise<string> {
  const ext = file.name.split('.').pop()
  const path = `cases/${caseId}/${Date.now()}.${ext}`

  const { error } = await supabase.storage.from('missing-persons').upload(path, file, {
    cacheControl: '3600',
  })
  if (error) throw error

  const { data } = supabase.storage.from('missing-persons').getPublicUrl(path)
  return data.publicUrl
}