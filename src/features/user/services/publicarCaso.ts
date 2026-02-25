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

interface CreatedCaseRow {
  id: string
  numero_caso: string
}

interface PublishCaseResult {
  caseId: string
  caseNumber: string
}

const CASES_BUCKET = 'missing-persons'
const CONFIGURED_CASES_BUCKET = (import.meta.env.VITE_CASES_BUCKET as string | undefined)?.trim()
const ACTIVE_CASES_BUCKET = CONFIGURED_CASES_BUCKET || CASES_BUCKET

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
  if (file.type.includes('/')) {
    return file.type.split('/')[1] ?? fallback
  }
  return fallback
}

function buildUbicacion(formData: FormData) {
  if (!formData.coordenadas) return null
  const { lat, lng } = formData.coordenadas
  // PostGIS expects geometry text; store WKT POINT(longitude latitude).
  return `POINT(${lng} ${lat})`
}

function buildStorageBucketMessage() {
  return `No existe el bucket "${ACTIVE_CASES_BUCKET}". Crea ese bucket en Supabase Storage o define VITE_CASES_BUCKET con un bucket existente.`
}

function mapStorageErrorMessage(message: string) {
  if (message.toLowerCase().includes('bucket not found')) {
    return buildStorageBucketMessage()
  }
  return message
}

async function uploadCaseMedia(caseId: string, formData: FormData) {
  if (formData.fotos.length === 0 && !formData.video) return

  const mediaRows: CasoMediaInsertRow[] = []

  for (const [index, file] of formData.fotos.entries()) {
    const ext = getFileExtension(file, 'jpg')
    const path = `cases/${caseId}/images/${Date.now()}-${index}.${ext}`
    let url: string

    try {
      url = await uploadFile(ACTIVE_CASES_BUCKET, path, file)
    } catch (error) {
      const message = error instanceof Error ? mapStorageErrorMessage(error.message) : 'Error al subir foto del caso.'
      throw new Error(message)
    }

    mediaRows.push({
      caso_id: caseId,
      tipo: 'foto',
      url,
      es_principal: index === 0,
      orden: index + 1,
      mime_type: file.type || null,
    })
  }

  if (formData.video) {
    const ext = getFileExtension(formData.video, 'mp4')
    const path = `cases/${caseId}/videos/${Date.now()}.${ext}`
    let url: string

    try {
      url = await uploadFile(ACTIVE_CASES_BUCKET, path, formData.video)
    } catch (error) {
      const message = error instanceof Error ? mapStorageErrorMessage(error.message) : 'Error al subir video del caso.'
      throw new Error(message)
    }

    mediaRows.push({
      caso_id: caseId,
      tipo: 'video',
      url,
      es_principal: false,
      orden: formData.fotos.length + 1,
      mime_type: formData.video.type || null,
    })
  }

  if (mediaRows.length === 0) return

  const { error } = await supabase.from('caso_media').insert(mediaRows)
  if (error) {
    throw new Error(`No se pudo guardar la media del caso: ${mapStorageErrorMessage(error.message)}`)
  }
}

export async function publicarCaso(formData: FormData): Promise<PublishCaseResult> {
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
  await uploadCaseMedia(caseRow.id, formData)

  return {
    caseId: caseRow.id,
    caseNumber: caseRow.numero_caso,
  }
}
