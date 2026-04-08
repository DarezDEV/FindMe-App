import { supabase } from '../../lib/supabase/client'

const CASES_BUCKET   = import.meta.env.VITE_CASES_BUCKET ?? 'casos-media'
const AVATARS_BUCKET = import.meta.env.VITE_AVATARS_BUCKET ?? 'avatars'

/** Sube un avatar de usuario y retorna la URL pública */
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const ext  = file.name.split('.').pop()
  const path = `${userId}/avatar.${ext}`

  const { error } = await supabase.storage
    .from(AVATARS_BUCKET)
    .upload(path, file, { upsert: true, cacheControl: '3600' })

  if (error) {
    const lower = error.message.toLowerCase()
    if (lower.includes('bucket') && lower.includes('not found')) {
      throw new Error(
        `No existe el bucket "${AVATARS_BUCKET}". Crea ese bucket en Supabase Storage o define VITE_AVATARS_BUCKET.`,
      )
    }
    if (lower.includes('row-level security policy') || lower.includes('permission denied')) {
      throw new Error(
        `No tienes permisos para subir fotos en el bucket "${AVATARS_BUCKET}". Revisa las policies de storage.objects.`,
      )
    }
    throw error
  }

  const { data } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(path)
  const cacheBuster = Date.now()
  return `${data.publicUrl}${data.publicUrl.includes('?') ? '&' : '?'}v=${cacheBuster}`
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
