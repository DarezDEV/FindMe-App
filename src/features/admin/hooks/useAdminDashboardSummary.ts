import { useQuery } from '@tanstack/react-query'
import { getAdminDashboardSummary } from '../../../lib/supabase/db'
import {
  ADMIN_DASHBOARD_SUMMARY_QUERY_KEY,
  ADMIN_QUERY_GC_TIME,
  ADMIN_QUERY_STALE_TIME,
} from './queryKeys'

export function useAdminDashboardSummary() {
  return useQuery({
    queryKey: ADMIN_DASHBOARD_SUMMARY_QUERY_KEY,
    queryFn: getAdminDashboardSummary,
    staleTime: ADMIN_QUERY_STALE_TIME,
    gcTime: ADMIN_QUERY_GC_TIME,
    refetchOnWindowFocus: false,
  })
}
