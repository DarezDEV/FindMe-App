import { supabase } from '../../../lib/supabase/client'
import { uploadFile } from '../../../shared/utils/api'
import { type FormData } from '../types'

interface CasoInsertRow {
  numero_caso: string
  publicado_por: string
  nombres: string
  apellidos: string
  edad: number | null
  genero: string | null
  estatura_cm: number | null
  peso_kg: number | null
  color_piel: string | null
  color_cabello: string | null
  color_ojos: string | null
  senas_particulares: string | null
  descripcion_general: string | null
  lugar_desaparicion: string | null
  ubicacion: string | null
  ciudad: string | null
  pais: string | null
  fecha_desaparicion: string | null
  hora_desaparicion: string | null
  lugar_ultima_vez: string | null
  circunstancias: string | null
  ropa_descripcion: string | null
  idioma: string | null
  visibilidad_contacto: 'publico' | 'autoridades' | 'privado'
  telefono_contacto: string | null
  email_contacto: string | null
  status: 'activo'
}

interface CasoMediaInsertRow {
  caso_id: string
  tipo: 'foto' | 'video'
  url: string
  es_principal: boolean
  orden: number
  mime_type: string | null
}

interface UploadedMedia {
  row: CasoMediaInsertRow
  path: string
}

interface CreatedCaseRow {
  id: string
  numero_caso: string
}

interface PublishCaseResult {
  caseId: string
  caseNumber: string
}

const CASES_BUCKET = 'casos-media'
const CONFIGURED_CASES_BUCKET = (import.meta.env.VITE_CASES_BUCKET as string | undefined)?.trim()
const ACTIVE_CASES_BUCKET = CONFIGURED_CASES_BUCKET || CASES_BUCKET

const MAX_PHOTOS = 10
const MAX_PHOTO_SIZE = 10 * 1024 * 1024
const MAX_VIDEO_SIZE = 50 * 1024 * 1024
const UPLOAD_CONCURRENCY = 3

function nullableText(value: string) {
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

function normalizeEnumValue(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
}

function nullableNumber(value: string) {
  if (!value.trim()) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeGenero(value: string) {
  const normalized = normalizeEnumValue(value)
  const valid = new Set(['masculino', 'femenino', 'no_binario', 'prefiero_no_decir'])
  return valid.has(normalized) ? normalized : null
}

function normalizeColorPiel(value: string) {
  const normalized = normalizeEnumValue(value)
  const valid = new Set(['clara', 'media', 'oliva', 'morena', 'oscura'])
  return valid.has(normalized) ? normalized : null
}

function normalizeColorCabello(value: string) {
  const normalized = normalizeEnumValue(value)
  const valid = new Set(['negro', 'castano', 'rubio', 'rojo', 'gris', 'blanco', 'otro'])
  return valid.has(normalized) ? normalized : null
}

function normalizeColorOjos(value: string) {
  const normalized = normalizeEnumValue(value)
  const valid = new Set(['negros', 'cafes', 'verdes', 'azules', 'grises', 'miel'])
  return valid.has(normalized) ? normalized : null
}

function parseCityAndCountry(location: string) {
  const parts = location
    .split(',')
    .map(part => part.trim())
    .filter(Boolean)

  if (parts.length === 0) return { ciudad: null, pais: null }
  if (parts.length === 1) return { ciudad: parts[0], pais: null }

  return {
    ciudad: parts[parts.length - 2] ?? null,
    pais: parts[parts.length - 1] ?? null,
  }
}

function buildCaseNumber() {
  const randomPart = Math.floor(1000 + Math.random() * 9000)
  return `FM-${Date.now().toString().slice(-6)}${randomPart}`
}

function getFileExtension(file: File, fallback: string) {
  const fromName = file.name.split('.').pop()?.toLowerCase()
  if (fromName) return fromName
  if (file.type.includes('/')) return file.type.split('/')[1] ?? fallback
  return fallback
}

function createMediaToken() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`
}

function buildUbicacion(formData: FormData) {
  if (!formData.coordenadas) return null
  const { lat, lng } = formData.coordenadas
  return `POINT(${lng} ${lat})`
}

function buildStorageBucketMessage() {
  return `No existe el bucket "${ACTIVE_CASES_BUCKET}". Crea ese bucket en Supabase Storage o define VITE_CASES_BUCKET con un bucket existente.`
}

function mapStorageErrorMessage(message: string) {
  const lower = message.toLowerCase()

  if (lower.includes('bucket not found')) {
    return buildStorageBucketMessage()
  }

  if (lower.includes('row-level security policy')) {
    return `No tienes permisos para subir archivos al bucket "${ACTIVE_CASES_BUCKET}". Revisa las policies de storage.objects (INSERT/SELECT para usuarios autenticados).`
  }

  return message
}

function validateMediaPayload(formData: FormData) {
  if (formData.fotos.length > MAX_PHOTOS) {
    throw new Error(`Solo se permiten ${MAX_PHOTOS} fotos por caso.`)
  }

  const invalidPhoto = formData.fotos.find(file => !file.type.startsWith('image/'))
  if (invalidPhoto) {
    throw new Error(`"${invalidPhoto.name}" no es una imagen valida.`)
  }

  const largePhoto = formData.fotos.find(file => file.size > MAX_PHOTO_SIZE)
  if (largePhoto) {
    throw new Error(`"${largePhoto.name}" supera el limite de 10 MB.`)
  }

  if (formData.video) {
    if (!formData.video.type.startsWith('video/')) {
      throw new Error('El archivo de video no tiene un formato valido.')
    }
    if (formData.video.size > MAX_VIDEO_SIZE) {
      throw new Error('El video supera el limite de 50 MB.')
    }
  }
}

async function runWithConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  concurrency: number
): Promise<Array<PromiseSettledResult<T>>> {
  const results: Array<PromiseSettledResult<T>> = new Array(tasks.length)
  let cursor = 0

  async function worker() {
    while (true) {
      const index = cursor
      cursor += 1
      if (index >= tasks.length) return

      try {
        const value = await tasks[index]()
        results[index] = { status: 'fulfilled', value }
      } catch (error) {
        results[index] = { status: 'rejected', reason: error }
      }
    }
  }

  const totalWorkers = Math.max(1, Math.min(concurrency, tasks.length))
  await Promise.all(Array.from({ length: totalWorkers }, () => worker()))
  return results
}

async function deleteUploadedFiles(paths: string[]) {
  if (paths.length === 0) return
  const { error } = await supabase.storage.from(ACTIVE_CASES_BUCKET).remove(paths)
  if (error) {
    console.warn('[publicarCaso] No se pudieron limpiar archivos subidos:', error.message)
  }
}

async function uploadCaseMedia(caseId: string, formData: FormData) {
  if (formData.fotos.length === 0 && !formData.video) return

  const tasks: Array<() => Promise<UploadedMedia>> = []

  for (const [index, file] of formData.fotos.entries()) {
    tasks.push(async () => {
      const ext = getFileExtension(file, 'jpg')
      const path = `cases/${caseId}/images/${createMediaToken()}-${index}.${ext}`
      const url = await uploadFile(ACTIVE_CASES_BUCKET, path, file)

      return {
        path,
        row: {
          caso_id: caseId,
          tipo: 'foto',
          url,
          es_principal: index === 0,
          orden: index + 1,
          mime_type: file.type || null,
        },
      }
    })
  }

  if (formData.video) {
    tasks.push(async () => {
      const ext = getFileExtension(formData.video as File, 'mp4')
      const path = `cases/${caseId}/videos/${createMediaToken()}.${ext}`
      const url = await uploadFile(ACTIVE_CASES_BUCKET, path, formData.video as File)

      return {
        path,
        row: {
          caso_id: caseId,
          tipo: 'video',
          url,
          es_principal: false,
          orden: formData.fotos.length + 1,
          mime_type: formData.video?.type || null,
        },
      }
    })
  }

  const settled = await runWithConcurrency(tasks, UPLOAD_CONCURRENCY)
  const successfulUploads = settled
    .filter((result): result is PromiseFulfilledResult<UploadedMedia> => result.status === 'fulfilled')
    .map(result => result.value)

  const firstFailure = settled.find(
    (result): result is PromiseRejectedResult => result.status === 'rejected'
  )

  if (firstFailure) {
    await deleteUploadedFiles(successfulUploads.map(upload => upload.path))
    const message =
      firstFailure.reason instanceof Error
        ? mapStorageErrorMessage(firstFailure.reason.message)
        : 'Error al subir archivos del caso.'
    throw new Error(message)
  }

  const mediaRows = successfulUploads.map(upload => upload.row)
  if (mediaRows.length === 0) return

  const { error } = await supabase.from('caso_media').insert(mediaRows)
  if (error) {
    await deleteUploadedFiles(successfulUploads.map(upload => upload.path))
    throw new Error(`No se pudo guardar la media del caso: ${mapStorageErrorMessage(error.message)}`)
  }
}

async function rollbackCase(caseId: string) {
  const { error } = await supabase.from('casos').delete().eq('id', caseId)
  if (error) {
    console.warn('[publicarCaso] No se pudo revertir caso fallido:', error.message)
  }
}

export async function publicarCaso(formData: FormData): Promise<PublishCaseResult> {
  validateMediaPayload(formData)

  const { data, error: userError } = await supabase.auth.getUser()
  if (userError) {
    throw new Error('No se pudo validar la sesion del usuario.')
  }

  const user = data.user
  if (!user?.id) {
    throw new Error('Debes iniciar sesion para publicar un caso.')
  }

  const caseNumber = buildCaseNumber()
  const { ciudad, pais } = parseCityAndCountry(formData.lugarDesaparicion)

  const payload: CasoInsertRow = {
    numero_caso: caseNumber,
    publicado_por: user.id,
    nombres: formData.nombres.trim(),
    apellidos: formData.apellidos.trim(),
    edad: nullableNumber(formData.edad),
    genero: normalizeGenero(formData.genero),
    estatura_cm: nullableNumber(formData.estatura),
    peso_kg: nullableNumber(formData.peso),
    color_piel: normalizeColorPiel(formData.colorPiel),
    color_cabello: normalizeColorCabello(formData.colorCabello),
    color_ojos: normalizeColorOjos(formData.colorOjos),
    senas_particulares: nullableText(formData.senasParticulares),
    descripcion_general: nullableText(formData.descripcion),
    lugar_desaparicion: nullableText(formData.lugarDesaparicion),
    ubicacion: buildUbicacion(formData),
    ciudad,
    pais,
    fecha_desaparicion: nullableText(formData.fechaDesaparicion),
    hora_desaparicion: nullableText(formData.horaDesaparicion),
    lugar_ultima_vez: nullableText(formData.lugarUltimaVez),
    circunstancias: nullableText(formData.descripcionCircunstancias),
    ropa_descripcion: nullableText(formData.ropaDescripcion),
    idioma: nullableText(formData.idioma),
    visibilidad_contacto: formData.visibilidadContacto,
    telefono_contacto: nullableText(formData.telefonoContacto),
    email_contacto: nullableText(formData.emailContacto),
    status: 'activo',
  }

  const { data: createdCase, error: caseError } = await supabase
    .from('casos')
    .insert(payload)
    .select('id, numero_caso')
    .single()

  if (caseError) {
    throw new Error(`No se pudo crear el caso: ${mapStorageErrorMessage(caseError.message)}`)
  }

  const caseRow = createdCase as CreatedCaseRow

  try {
    await uploadCaseMedia(caseRow.id, formData)
  } catch (error) {
    await rollbackCase(caseRow.id)
    throw error
  }

  return {
    caseId: caseRow.id,
    caseNumber: caseRow.numero_caso,
  }
}
