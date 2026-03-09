import { supabase } from '../../../lib/supabase/client'

export interface AvistamientoInput {
  casoId: string
  fecha: string
  hora: string
  lugar: string
  descripcion: string
  contacto?: string
}

export interface ReporteContenidoInput {
  casoId: string
  motivo: string
  descripcion: string
  evidenciaUrl?: string
}

function normalizeText(value: string) {
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

function normalizeOptionalUrl(value: string | undefined) {
  const normalized = normalizeText(value ?? '')
  if (!normalized) return null

  try {
    const parsed = new URL(normalized)
    return parsed.toString()
  } catch {
    throw new Error('La URL de evidencia no es valida.')
  }
}

function mapInsertErrorMessage(message: string) {
  const lower = message.toLowerCase()

  if (lower.includes('row-level security policy') || lower.includes('permission denied')) {
    return 'No tienes permisos para registrar este reporte.'
  }

  if (lower.includes('foreign key')) {
    return 'No se pudo vincular el reporte con el caso seleccionado.'
  }

  return message
}

async function getAuthenticatedUserId() {
  const { data, error } = await supabase.auth.getUser()

  if (error) {
    throw new Error('No se pudo validar la sesion del usuario.')
  }

  const userId = data.user?.id
  if (!userId) {
    throw new Error('Debes iniciar sesion para enviar este formulario.')
  }

  return userId
}

async function ensureCaseExists(casoId: string) {
  const { error } = await supabase
    .from('casos')
    .select('id')
    .eq('id', casoId)
    .limit(1)
    .single()

  if (error) {
    const lower = error.message.toLowerCase()

    if (lower.includes('row-level security policy') || lower.includes('permission denied')) {
      return
    }

    if (lower.includes('no rows')) {
      throw new Error('El caso seleccionado no existe o no esta disponible.')
    }

    throw new Error('No se pudo validar el caso seleccionado.')
  }
}

async function runInsertAttempts(attempts: Array<() => Promise<string | null>>) {
  const errors: string[] = []

  for (const attempt of attempts) {
    const errorMessage = await attempt()
    if (!errorMessage) return
    errors.push(errorMessage)
  }

  const lastError = errors[errors.length - 1]
  throw new Error(lastError ? mapInsertErrorMessage(lastError) : 'No se pudo registrar la informacion.')
}

export async function reportarAvistamiento(input: AvistamientoInput): Promise<void> {
  const casoId = normalizeText(input.casoId)
  const fecha = normalizeText(input.fecha)
  const hora = normalizeText(input.hora)
  const lugar = normalizeText(input.lugar)
  const descripcion = normalizeText(input.descripcion)
  const contacto = normalizeText(input.contacto ?? '')

  if (!casoId || !fecha || !hora || !lugar || !descripcion) {
    throw new Error('Completa todos los campos obligatorios para registrar el avistamiento.')
  }

  const userId = await getAuthenticatedUserId()
  await ensureCaseExists(casoId)

  await runInsertAttempts([
    async () => {
      const { error } = await supabase.from('caso_avistamientos').insert({
        caso_id: casoId,
        reportado_por: userId,
        fecha_avistamiento: fecha,
        hora_avistamiento: hora,
        lugar,
        descripcion,
        contacto,
      })
      return error?.message ?? null
    },
    async () => {
      const { error } = await supabase.from('avistamientos').insert({
        caso_id: casoId,
        user_id: userId,
        fecha,
        hora,
        ubicacion: lugar,
        descripcion,
        contacto,
      })
      return error?.message ?? null
    },
  ])
}

export async function reportarContenido(input: ReporteContenidoInput): Promise<void> {
  const casoId = normalizeText(input.casoId)
  const motivo = normalizeText(input.motivo)
  const descripcion = normalizeText(input.descripcion)
  const evidenciaUrl = normalizeOptionalUrl(input.evidenciaUrl)

  if (!casoId || !motivo || !descripcion) {
    throw new Error('Completa todos los campos obligatorios para reportar contenido.')
  }

  const userId = await getAuthenticatedUserId()
  await ensureCaseExists(casoId)

  await runInsertAttempts([
    async () => {
      const { error } = await supabase.from('reportes_contenido').insert({
        caso_id: casoId,
        reportado_por: userId,
        motivo,
        descripcion,
        evidencia_url: evidenciaUrl,
      })
      return error?.message ?? null
    },
    async () => {
      const { error } = await supabase.from('contenido_reportes').insert({
        caso_id: casoId,
        user_id: userId,
        razon: motivo,
        detalle: descripcion,
        evidencia_url: evidenciaUrl,
      })
      return error?.message ?? null
    },
    async () => {
      const { error } = await supabase.from('caso_reportes').insert({
        caso_id: casoId,
        autor_id: userId,
        motivo,
        descripcion,
        evidencia_url: evidenciaUrl,
      })
      return error?.message ?? null
    },
  ])
}
