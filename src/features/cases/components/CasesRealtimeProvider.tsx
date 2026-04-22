import { useQueryClient } from '@tanstack/react-query'
import { type ReactNode } from 'react'
import {
  normalizeAuthorityCaseRow,
  normalizeCaseCommentRow,
  type AuthorityDashboardSummary,
  type CaseMediaRealtimePayload,
  type CaseRealtimePayload,
  type CaseRealtimeRow,
} from '../../../lib/supabase/db'
import { ADMIN_DASHBOARD_SUMMARY_QUERY_KEY } from '../../admin/hooks/queryKeys'
import { applyCaseSummaryRealtime, shouldReloadCaseSummary } from '../utils/summaryRealtime'
import {
  CASO_DETALLE_QUERY_KEY,
  CASOS_GENERALES_QUERY_KEY,
  MIS_CASOS_QUERY_KEY,
  MIS_ESTADISTICAS_QUERY_KEY,
  normalizeStatus,
  normalizeWorkflowStatus,
  shouldIncludeCase,
  type CasoComentario,
  type CasoDetalle,
  type CasoMedia,
  type CasoReciente,
} from '../../user/hooks/useMisCasos'
import { useRealtimeCaseComments } from '../hooks/useRealtimeCaseComments'
import { useRealtimeCaseMedia } from '../hooks/useRealtimeCaseMedia'
import { useRealtimeCases } from '../hooks/useRealtimeCases'

type MisCasosKey = ReturnType<typeof MIS_CASOS_QUERY_KEY>
type CasosGeneralesKey = ReturnType<typeof CASOS_GENERALES_QUERY_KEY>
type CasoDetalleKey = ReturnType<typeof CASO_DETALLE_QUERY_KEY>
type MisEstadisticasKey = ReturnType<typeof MIS_ESTADISTICAS_QUERY_KEY>

function isMisCasosKey(value: unknown): value is MisCasosKey {
  return Array.isArray(value) && value.length === 3 && value[0] === 'mis-casos'
}

function isCasosGeneralesKey(value: unknown): value is CasosGeneralesKey {
  return Array.isArray(value) && value.length === 5 && value[0] === 'casos-generales'
}

function isCasoDetalleKey(value: unknown): value is CasoDetalleKey {
  return Array.isArray(value) && value.length === 2 && value[0] === 'caso-detalle'
}

function isMisEstadisticasKey(value: unknown): value is MisEstadisticasKey {
  return Array.isArray(value) && value.length === 2 && value[0] === 'mis-estadisticas'
}

function toIsoTime(value: string | null | undefined) {
  if (!value) return 0
  const parsed = new Date(value).getTime()
  return Number.isNaN(parsed) ? 0 : parsed
}

function sortCases(list: CasoReciente[]) {
  return [...list].sort((a, b) => toIsoTime(b.created_at) - toIsoTime(a.created_at))
}

function toCasoReciente(row: Partial<CaseRealtimeRow>, current?: CasoReciente): CasoReciente | null {
  const normalized = normalizeAuthorityCaseRow(row)
  if (!normalized) return null

  return {
    id: normalized.id,
    numero_caso: normalized.numero_caso,
    nombres: normalized.nombres,
    apellidos: normalized.apellidos,
    status: normalizeStatus(normalized.status),
    workflow_status: normalizeWorkflowStatus(normalized.workflow_status),
    fecha_desaparicion: normalized.fecha_desaparicion,
    ciudad: normalized.ciudad,
    foto_principal_url: current?.foto_principal_url ?? null,
    vistas: typeof row.vistas === 'number' ? row.vistas : (current?.vistas ?? 0),
    total_fotos: current?.total_fotos ?? 0,
    created_at: normalized.created_at,
  }
}

function mergeCasoDetalle(current: CasoDetalle, row: Partial<CaseRealtimeRow>): CasoDetalle | null {
  const normalized = normalizeAuthorityCaseRow(row)
  if (!normalized) return null

  return {
    ...current,
    id: normalized.id,
    person_id: row.person_id ?? current.person_id ?? null,
    numero_caso: normalized.numero_caso,
    nombres: normalized.nombres,
    apellidos: normalized.apellidos,
    edad: typeof row.edad === 'number' ? row.edad : current.edad,
    genero: row.genero ?? current.genero,
    status: normalizeStatus(normalized.status),
    workflow_status: normalizeWorkflowStatus(normalized.workflow_status),
    vistas: typeof row.vistas === 'number' ? row.vistas : current.vistas,
    fecha_desaparicion: normalized.fecha_desaparicion,
    hora_desaparicion: row.hora_desaparicion ?? current.hora_desaparicion,
    lugar_desaparicion: row.lugar_desaparicion ?? current.lugar_desaparicion,
    lugar_ultima_vez: normalized.lugar_ultima_vez,
    ciudad: normalized.ciudad,
    pais: row.pais ?? current.pais,
    color_piel: row.color_piel ?? current.color_piel,
    color_cabello: row.color_cabello ?? current.color_cabello,
    color_ojos: row.color_ojos ?? current.color_ojos,
    senas_particulares: row.senas_particulares ?? current.senas_particulares,
    descripcion_general: row.descripcion_general ?? current.descripcion_general,
    circunstancias: row.circunstancias ?? current.circunstancias,
    ropa_descripcion: row.ropa_descripcion ?? current.ropa_descripcion,
    idioma: row.idioma ?? current.idioma,
    visibilidad_contacto: row.visibilidad_contacto ?? current.visibilidad_contacto,
    telefono_contacto: row.telefono_contacto ?? current.telefono_contacto,
    email_contacto: row.email_contacto ?? current.email_contacto,
    created_at: normalized.created_at,
  }
}

function recalculatePhotoState(media: CasoMedia[], currentUrl: string | null) {
  const photos = media.filter((item) => item.tipo === 'foto')
  const principal = photos.find((item) => item.es_principal) ?? photos[0]

  return {
    foto_principal_url: principal?.url ?? currentUrl ?? null,
    total_fotos: photos.length,
  }
}

function toCaseMedia(payload: Partial<CaseMediaRealtimePayload['new'] | CaseMediaRealtimePayload['old']>): CasoMedia | null {
  const id = typeof payload.id === 'string' ? payload.id : ''
  const casoId = typeof payload.caso_id === 'string' ? payload.caso_id : ''
  const tipo = payload.tipo === 'foto' || payload.tipo === 'video' ? payload.tipo : null
  const url = typeof payload.url === 'string' ? payload.url : ''

  if (!id || !casoId || !tipo || !url) return null

  return {
    id,
    caso_id: casoId,
    tipo,
    url,
    es_principal: Boolean(payload.es_principal),
    orden: typeof payload.orden === 'number' ? payload.orden : 0,
    mime_type: typeof payload.mime_type === 'string' ? payload.mime_type : null,
    created_at: typeof payload.created_at === 'string' ? payload.created_at : null,
  }
}

function mapAuthorityCommentToDetalleComment(comment: { id: string; caso_id: string; autor_id: string; comentario: string; created_at: string }): CasoComentario | null {
  const contenido = comment.comentario.trim()
  const upper = contenido.toUpperCase()

  if (!contenido) return null
  if (
    upper.startsWith('[PUBLICO]') ||
    upper.startsWith('[AVISTAMIENTO]') ||
    upper.startsWith('[REPORTE_CONTENIDO]') ||
    upper.startsWith('[CIERRE]')
  ) {
    return null
  }

  return {
    id: comment.id,
    autor_id: comment.autor_id || null,
    autor: comment.autor_id ? `Autoridad ${comment.autor_id.slice(0, 8)}` : 'Autoridad',
    contenido,
    estado: null,
    created_at: comment.created_at,
  }
}

function upsertComment(list: CasoComentario[], next: CasoComentario) {
  const withoutCurrent = list.filter((item) => item.id !== next.id)
  return [...withoutCurrent, next].sort((a, b) => toIsoTime(a.created_at) - toIsoTime(b.created_at))
}

function applyCaseListPayload(
  list: CasoReciente[],
  payload: CaseRealtimePayload,
  options: { ownerId?: string | null; limit: number; hideResolved?: boolean; hideRejected?: boolean; approvedOnly?: boolean },
) {
  const caseId = payload.new.id || payload.old.id
  if (!caseId) return list

  const nextCase = toCasoReciente(payload.new, list.find((item) => item.id === caseId))
  const newOwnerId = payload.new.publicado_por ?? null
  const includeByOwner = !options.ownerId || newOwnerId === options.ownerId
  const includeByFilters =
    nextCase !== null &&
    shouldIncludeCase(nextCase.status, nextCase.workflow_status, {
      hideResolved: options.hideResolved,
      hideRejected: options.hideRejected,
      approvedOnly: options.approvedOnly,
    })

  if (payload.eventType === 'DELETE' || payload.new.eliminado === true || !nextCase || !includeByOwner || !includeByFilters) {
    return sortCases(list.filter((item) => item.id !== caseId)).slice(0, options.limit)
  }

  const nextList = [nextCase, ...list.filter((item) => item.id !== caseId)]
  return sortCases(nextList).slice(0, options.limit)
}

function adjustStatsValue(
  current: { total: number; activos: number; encontrados: number; totalVistas: number },
  row: Partial<CaseRealtimeRow>,
  direction: 1 | -1,
) {
  const status = (row.status ?? '').trim().toLowerCase()

  current.total += direction
  current.totalVistas += (row.vistas ?? 0) * direction

  if (status === 'activo' || status === 'en_revision') {
    current.activos += direction
  }

  if (status === 'encontrado') {
    current.encontrados += direction
  }
}

function shouldInvalidateStats(payload: CaseRealtimePayload) {
  const hasAffectedOwner = Boolean(payload.old.publicado_por || payload.new.publicado_por)
  if (!hasAffectedOwner) return false

  if (payload.eventType !== 'INSERT' && (!payload.old.publicado_por || !payload.old.status || payload.old.vistas === null)) {
    return true
  }

  if (payload.eventType !== 'DELETE' && payload.new.eliminado !== true && !payload.new.status) {
    return true
  }

  if (payload.eventType === 'UPDATE' && !payload.new.publicado_por) {
    return true
  }

  return false
}

export function CasesRealtimeProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()

  useRealtimeCases({
    onEvent: (payload) => {
      const caseId = payload.new.id || payload.old.id
      if (!caseId) return

      const misCasosEntries = queryClient.getQueriesData({ queryKey: ['mis-casos'] })
      misCasosEntries.forEach(([key, data]) => {
        if (!isMisCasosKey(key)) return
        const [, ownerId, limit] = key
        const current = Array.isArray(data) ? (data as CasoReciente[]) : []
        queryClient.setQueryData(key, applyCaseListPayload(current, payload, { ownerId, limit }))
      })

      const generalesEntries = queryClient.getQueriesData({ queryKey: ['casos-generales'] })
      generalesEntries.forEach(([key, data]) => {
        if (!isCasosGeneralesKey(key)) return
        const [, limit, hideResolved, hideRejected, approvedOnly] = key
        const current = Array.isArray(data) ? (data as CasoReciente[]) : []
        queryClient.setQueryData(
          key,
          applyCaseListPayload(current, payload, { limit, hideResolved, hideRejected, approvedOnly }),
        )
      })

      const detailEntries = queryClient.getQueriesData({ queryKey: ['caso-detalle'] })
      detailEntries.forEach(([key, data]) => {
        if (!isCasoDetalleKey(key) || !data || typeof data !== 'object') return

        const detail = data as { caso: CasoDetalle; media: CasoMedia[]; comentarios: CasoComentario[] }
        if (detail.caso.id !== caseId) return
        if (payload.eventType === 'DELETE' || payload.new.eliminado === true) {
          void queryClient.invalidateQueries({ queryKey: key, exact: true })
          return
        }

        const nextCaso = mergeCasoDetalle(detail.caso, payload.new)
        if (!nextCaso) return

        queryClient.setQueryData(key, {
          ...detail,
          caso: nextCaso,
        })
      })

      const statsEntries = queryClient.getQueriesData({ queryKey: ['mis-estadisticas'] })
      if (shouldInvalidateStats(payload)) {
        void queryClient.invalidateQueries({ queryKey: ['mis-estadisticas'] })
      } else {
        statsEntries.forEach(([key, data]) => {
          if (!isMisEstadisticasKey(key) || !data || typeof data !== 'object') return

          const [, ownerId] = key
          const nextValue = {
            total: typeof (data as { total?: unknown }).total === 'number' ? (data as { total: number }).total : 0,
            activos: typeof (data as { activos?: unknown }).activos === 'number' ? (data as { activos: number }).activos : 0,
            encontrados:
              typeof (data as { encontrados?: unknown }).encontrados === 'number'
                ? (data as { encontrados: number }).encontrados
                : 0,
            totalVistas:
              typeof (data as { totalVistas?: unknown }).totalVistas === 'number'
                ? (data as { totalVistas: number }).totalVistas
                : 0,
          }

          if (payload.old.publicado_por === ownerId && payload.old.eliminado !== true) {
            adjustStatsValue(nextValue, payload.old, -1)
          }

          if (payload.new.publicado_por === ownerId && payload.new.eliminado !== true) {
            adjustStatsValue(nextValue, payload.new, 1)
          }

          nextValue.total = Math.max(0, nextValue.total)
          nextValue.activos = Math.max(0, nextValue.activos)
          nextValue.encontrados = Math.max(0, nextValue.encontrados)
          nextValue.totalVistas = Math.max(0, nextValue.totalVistas)

          queryClient.setQueryData(key, nextValue)
        })
      }

      if (shouldReloadCaseSummary(payload)) {
        void queryClient.invalidateQueries({ queryKey: ADMIN_DASHBOARD_SUMMARY_QUERY_KEY, exact: true })
      } else {
        queryClient.setQueryData(ADMIN_DASHBOARD_SUMMARY_QUERY_KEY, (current: unknown) => {
          if (!current || typeof current !== 'object') return current
          return applyCaseSummaryRealtime(current as AuthorityDashboardSummary, payload)
        })
      }
    },
  })

  useRealtimeCaseComments({
    onEvent: (payload) => {
      const caseId = payload.new.caso_id || payload.old.caso_id
      if (!caseId) return

      const detailEntries = queryClient.getQueriesData({ queryKey: ['caso-detalle'] })
      detailEntries.forEach(([key, data]) => {
        if (!isCasoDetalleKey(key) || !data || typeof data !== 'object') return

        const detail = data as { caso: CasoDetalle; media: CasoMedia[]; comentarios: CasoComentario[] }
        if (detail.caso.id !== caseId) return

        if (payload.eventType === 'DELETE') {
          queryClient.setQueryData(key, {
            ...detail,
            comentarios: detail.comentarios.filter((item) => item.id !== payload.old.id),
          })
          return
        }

        const normalized = normalizeCaseCommentRow({
          id: payload.new.id,
          caso_id: payload.new.caso_id,
          autor_id: payload.new.autor_id,
          comentario: payload.new.comentario,
          created_at: payload.new.created_at,
        })
        const nextComment = mapAuthorityCommentToDetalleComment(normalized)
        if (!nextComment) return

        queryClient.setQueryData(key, {
          ...detail,
          comentarios: upsertComment(detail.comentarios, nextComment),
        })
      })
    },
  })

  useRealtimeCaseMedia({
    onEvent: (payload: CaseMediaRealtimePayload) => {
      const caseId = payload.new.caso_id || payload.old.caso_id
      if (!caseId) return

      const detailEntries = queryClient.getQueriesData({ queryKey: ['caso-detalle'] })
      let detailPhotoState: ReturnType<typeof recalculatePhotoState> | null = null
      detailEntries.forEach(([key, data]) => {
        if (!isCasoDetalleKey(key) || !data || typeof data !== 'object') return

        const detail = data as { caso: CasoDetalle; media: CasoMedia[]; comentarios: CasoComentario[] }
        if (detail.caso.id !== caseId) return

        let nextMedia = detail.media

        if (payload.eventType === 'DELETE') {
          nextMedia = detail.media.filter((item) => item.id !== payload.old.id)
        } else {
          const nextItem = toCaseMedia(payload.new)
          if (!nextItem) return
          nextMedia = [...detail.media.filter((item) => item.id !== nextItem.id), nextItem].sort(
            (a, b) => a.orden - b.orden,
          )
        }

        const photoState = recalculatePhotoState(nextMedia, detail.caso.foto_principal_url)
        detailPhotoState = photoState

        queryClient.setQueryData(key, {
          ...detail,
          caso: {
            ...detail.caso,
            ...photoState,
          },
          media: nextMedia,
        })
      })

      const updateListPhotoState = (list: CasoReciente[]) =>
        list.map((item) => {
          if (item.id !== caseId) return item

          if (detailPhotoState) {
            return {
              ...item,
              ...detailPhotoState,
            }
          }

          if (payload.eventType === 'DELETE') {
            const isRemovingPhoto = payload.old.tipo === 'foto'
            const nextTotal = isRemovingPhoto ? Math.max(0, item.total_fotos - 1) : item.total_fotos
            const shouldClearPhoto = payload.old.url === item.foto_principal_url
            return {
              ...item,
              total_fotos: nextTotal,
              foto_principal_url: shouldClearPhoto ? null : item.foto_principal_url,
            }
          }

          const isPhoto = payload.new.tipo === 'foto'
          if (!isPhoto) return item

          return {
            ...item,
            total_fotos: payload.eventType === 'INSERT' ? item.total_fotos + 1 : item.total_fotos,
            foto_principal_url:
              payload.new.es_principal || !item.foto_principal_url ? payload.new.url ?? item.foto_principal_url : item.foto_principal_url,
          }
        })

      queryClient.setQueriesData({ queryKey: ['mis-casos'] }, (current: unknown) =>
        Array.isArray(current) ? updateListPhotoState(current as CasoReciente[]) : current,
      )

      queryClient.setQueriesData({ queryKey: ['casos-generales'] }, (current: unknown) =>
        Array.isArray(current) ? updateListPhotoState(current as CasoReciente[]) : current,
      )
    },
  })

  return <>{children}</>
}
