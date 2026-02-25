import { supabase } from '../../lib/supabase/client'

const CASES_BUCKET   = import.meta.env.VITE_CASES_BUCKET ?? 'casos-media'
const AVATARS_BUCKET = 'avatars'

/** Sube un avatar de usuario y retorna la URL pública */
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const ext  = file.name.split('.').pop()
  const path = `${userId}/avatar.${ext}`

  const { error } = await supabase.storage
    .from(AVATARS_BUCKET)
    .upload(path, file, { upsert: true, cacheControl: '3600' })

  if (error) throw error

  const { data } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

/** Sube una foto de caso y retorna la URL pública */
export async function uploadCasoFoto(caseId: string, file: File): Promise<string> {
  const ext  = file.name.split('.').pop()
  const path = `${caseId}/${Date.now()}.${ext}`

  const { error } = await supabase.storage
    .from(CASES_BUCKET)
    .upload(path, file, { cacheControl: '3600' })

  if (error) throw error

  const { data } = supabase.storage.from(CASES_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

/** Sube un video de caso y retorna la URL pública */
export async function uploadCasoVideo(caseId: string, file: File): Promise<string> {
  const ext  = file.name.split('.').pop()
  const path = `${caseId}/video_${Date.now()}.${ext}`

  const { error } = await supabase.storage
    .from(CASES_BUCKET)
    .upload(path, file, { cacheControl: '3600' })

  if (error) throw error

  const { data } = supabase.storage.from(CASES_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

/** Elimina un archivo del bucket de casos */
export async function deleteCasoFile(path: string): Promise<void> {
  const { error } = await supabase.storage.from(CASES_BUCKET).remove([path])
  if (error) throw error
}