import { supabase } from '../../lib/supabase/client'
import { toAppError } from './errors'

/**
 * Helper genérico para queries de Supabase con manejo de errores consistente.
 * Uso: const data = await query('profiles').select('*').eq('id', userId)
 */
export function query(table: string) {
  return supabase.from(table)
}

/** Sube un archivo al bucket especificado y retorna la URL pública */
export async function uploadFile(
  bucket: string,
  path: string,
  file: File,
): Promise<string> {
  try {
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      upsert: false,
      cacheControl: '3600',
      contentType: file.type || undefined,
    })

    if (error) throw error

    const { data } = supabase.storage.from(bucket).getPublicUrl(path)
    return data.publicUrl
  } catch (error) {
    throw toAppError(error, 'No se pudo subir el archivo. Inténtalo nuevamente.', 'uploadFile')
  }
}
