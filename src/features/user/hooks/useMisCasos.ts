import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase/client'

type CasoStatus = 'activo' | 'en_revision' | 'avistado' | 'encontrado'

export interface CasoReciente {
  id: string
  numero_caso: string
  nombres: string
  apellidos: string
  status: CasoStatus
  fecha_desaparicion: string | null
  ciudad: string | null
  foto_principal_url: string | null
  vistas: number
  total_avistamientos: number
  total_fotos: number
  created_at: string | null
}

interface CasoStatsRow {
  status: CasoStatus
  vistas: number | null
}

const CASOS_SELECT = `
  id,
  numero_caso,
  nombres,
  apellidos,
  status,
  fecha_desaparicion,
  ciudad,
  foto_principal_url,
  vistas,
  total_avistamientos,
  total_fotos,
  created_at
`

const QUERY_STALE_TIME = 1000 * 60 * 2

async function fetchCasos(limit: number, userId?: string): Promise<CasoReciente[]> {
  let query = supabase
    .from('casos_con_media')
    .select(CASOS_SELECT)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (userId) {
    query = query.eq('publicado_por', userId)
  }

  const { data, error } = await query

  if (error) throw error
  return (data ?? []) as CasoReciente[]
}

export function useMisCasos(userId: string, limit = 3) {
  return useQuery({
    queryKey: ['mis-casos', userId, limit],
    queryFn: () => fetchCasos(limit, userId),
    enabled: !!userId,
    staleTime: QUERY_STALE_TIME,
  })
}

export function useCasosGenerales(limit = 6) {
  return useQuery({
    queryKey: ['casos-generales', limit],
    queryFn: () => fetchCasos(limit),
    staleTime: QUERY_STALE_TIME,
  })
}

// Hook para estadisticas del usuario (conteos)
export function useMisEstadisticas(userId: string) {
  return useQuery({
    queryKey: ['mis-estadisticas', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('casos')
        .select('status, vistas')
        .eq('publicado_por', userId)
        .eq('eliminado', false)

      if (error) throw error

      const casos = (data ?? []) as CasoStatsRow[]
      return {
        total: casos.length,
        activos: casos.filter(c => c.status === 'activo' || c.status === 'en_revision').length,
        encontrados: casos.filter(c => c.status === 'encontrado').length,
        totalVistas: casos.reduce((acc, c) => acc + (c.vistas ?? 0), 0),
      }
    },
    enabled: !!userId,
    staleTime: QUERY_STALE_TIME,
  })
}
