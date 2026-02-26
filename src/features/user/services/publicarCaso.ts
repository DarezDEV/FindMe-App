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
  subido_por: string
  storage_path: string
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
const UPLOAD_CONCURRENCY = 1
const QUERY_TIMEOUT_MS = 25_000
const UPLOAD_TIMEOUT_MS = 60_000
const CLEANUP_TIMEOUT_MS = 12_000

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
  const parsed = Number(value.replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeHeightCm(value: string) {
  const parsed = nullableNumber(value)
  if (parsed === null) return null

  // If user typed meters (e.g. 1.70), convert to centimeters.
  const normalized = parsed > 0 && parsed <= 3 ? parsed * 100 : parsed
  return Math.round(normalized)
}

function normalizeWeightKg(value: string) {
  const parsed = nullableNumber(value)
  if (parsed === null) return null
  return Math.round(parsed * 10) / 10
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

function mapCasoMediaInsertErrorMessage(message: string) {
  const lower = message.toLowerCase()

  if (lower.includes('row-level security policy')) {
    return 'No tienes permisos para registrar la media en la tabla "caso_media". Revisa policies INSERT/SELECT en public.caso_media para usuarios autenticados.'
  }

  if (lower.includes('storage_path') && lower.includes('not-null')) {
    return 'No se pudo registrar la ruta del archivo (storage_path) en caso_media.'
  }

  if (lower.includes('subido_por') && lower.includes('not-null')) {
    return 'No se pudo registrar el usuario que sube la media (subido_por) en caso_media.'
  }

  if (lower.includes('foreign key')) {
    return 'No se pudo relacionar la media con el caso. Verifica que el caso exista y que la referencia caso_id sea valida.'
  }

  const missingColumnMatch = message.match(/null value in column "([^"]+)"/i)
  if (lower.includes('not-null constraint') && missingColumnMatch?.[1]) {
    return `Falta un campo obligatorio en caso_media: ${missingColumnMatch[1]}.`
  }

  return message
}

function mapCasoInsertErrorMessage(message: string) {
  const lower = message.toLowerCase()

  if (lower.includes('casos_estatura_cm_check')) {
    return 'La estatura no cumple el formato permitido. Ingresa estatura en cm (ejemplo: 170) o en metros (1.70).'
  }

  if (lower.includes('casos_peso_kg_check')) {
    return 'El peso no cumple el formato permitido. Ingresa el peso en kg (ejemplo: 65).'
  }

  if (lower.includes('check constraint')) {
    return 'Uno de los datos numericos no cumple las reglas del caso. Revisa edad, estatura y peso.'
  }

  return mapStorageErrorMessage(message)
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

function validateBodyMetrics(formData: FormData) {
  const rawHeight = formData.estatura.trim()
  if (!rawHeight) {
    throw new Error('La estatura es obligatoria para publicar el caso.')
  }

  const height = normalizeHeightCm(rawHeight)
  if (height === null) {
    throw new Error('La estatura debe ser un numero valido.')
  }

  if (height < 40 || height > 300) {
    throw new Error('La estatura debe estar entre 40 cm y 300 cm.')
  }

  const weight = normalizeWeightKg(formData.peso)
  if (weight !== null && (weight < 2 || weight > 500)) {
    throw new Error('El peso debe estar entre 2 kg y 500 kg.')
  }
}

async function withTimeout<T>(
  operation: PromiseLike<T> | T,
  timeoutMs: number,
  timeoutMessage: string
) {
  let timer: ReturnType<typeof setTimeout> | null = null

  try {
    return await Promise.race([
      Promise.resolve(operation),
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
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
  try {
    const { error } = await withTimeout(
      Promise.resolve(supabase.storage.from(ACTIVE_CASES_BUCKET).remove(paths)),
      CLEANUP_TIMEOUT_MS,
      'Timeout limpiando archivos temporales.'
    )
    if (error) {
      console.warn('[publicarCaso] No se pudieron limpiar archivos subidos:', error.message)
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido en limpieza de archivos.'
    console.warn('[publicarCaso] No se pudieron limpiar archivos subidos:', message)
  }
}

async function uploadCaseMedia(caseId: string, uploadedBy: string, formData: FormData) {
  if (formData.fotos.length === 0 && !formData.video) return

  const tasks: Array<() => Promise<UploadedMedia>> = []

  for (const [index, file] of formData.fotos.entries()) {
    tasks.push(async () => {
      const ext = getFileExtension(file, 'jpg')
      const path = `cases/${caseId}/images/${createMediaToken()}-${index}.${ext}`
      const url = await withTimeout(
        uploadFile(ACTIVE_CASES_BUCKET, path, file),
        UPLOAD_TIMEOUT_MS,
        `Se agoto el tiempo al subir "${file.name}". Intenta nuevamente con mejor conexion o con un archivo mas pequeno.`
      )

      return {
        path,
        row: {
          caso_id: caseId,
          subido_por: uploadedBy,
          storage_path: path,
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
      const url = await withTimeout(
        uploadFile(ACTIVE_CASES_BUCKET, path, formData.video as File),
        UPLOAD_TIMEOUT_MS,
        `Se agoto el tiempo al subir el video "${formData.video?.name ?? 'sin-nombre'}". Intenta nuevamente con mejor conexion o menor tamano.`
      )

      return {
        path,
        row: {
          caso_id: caseId,
          subido_por: uploadedBy,
          storage_path: path,
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

  const { error } = await withTimeout(
    Promise.resolve(supabase.from('caso_media').insert(mediaRows)),
    QUERY_TIMEOUT_MS,
    'Se agoto el tiempo al guardar la media del caso.'
  )
  if (error) {
    await deleteUploadedFiles(successfulUploads.map(upload => upload.path))
    throw new Error(`No se pudo guardar la media del caso: ${mapCasoMediaInsertErrorMessage(error.message)}`)
  }
}

async function rollbackCase(caseId: string) {
  try {
    const { error } = await withTimeout(
      Promise.resolve(supabase.from('casos').delete().eq('id', caseId)),
      QUERY_TIMEOUT_MS,
      'Timeout al revertir caso fallido.'
    )
    if (error) {
      console.warn('[publicarCaso] No se pudo revertir caso fallido:', error.message)
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido al revertir caso fallido.'
    console.warn('[publicarCaso] No se pudo revertir caso fallido:', message)
  }
}

export async function publicarCaso(formData: FormData): Promise<PublishCaseResult> {
  validateMediaPayload(formData)
  validateBodyMetrics(formData)

  const { data, error: userError } = await withTimeout(
    supabase.auth.getUser(),
    QUERY_TIMEOUT_MS,
    'Se agoto el tiempo al validar la sesion. Recarga la pagina e intenta de nuevo.'
  )
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
    estatura_cm: normalizeHeightCm(formData.estatura),
    peso_kg: normalizeWeightKg(formData.peso),
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

  const { data: createdCase, error: caseError } = await withTimeout(
    Promise.resolve(
      supabase
        .from('casos')
        .insert(payload)
        .select('id, numero_caso')
        .single()
    ),
    QUERY_TIMEOUT_MS,
    'Se agoto el tiempo al crear el caso. Intenta nuevamente.'
  )

  if (caseError) {
    throw new Error(`No se pudo crear el caso: ${mapCasoInsertErrorMessage(caseError.message)}`)
  }

  const caseRow = createdCase as CreatedCaseRow

  try {
    await uploadCaseMedia(caseRow.id, user.id, formData)
  } catch (error) {
    await rollbackCase(caseRow.id)
    throw error
  }

  return {
    caseId: caseRow.id,
    caseNumber: caseRow.numero_caso,
  }
}
