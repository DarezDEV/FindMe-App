import { useState, useEffect } from 'react'
import { getLoginPageStats, type LoginStats } from '../../../lib/supabase/db'

export function useLoginPageStats() {
  const [stats, setStats] = useState<LoginStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const data = await getLoginPageStats()
        if (!cancelled) {
          setStats(data)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Error al cargar estadísticas')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [])

  return { stats, loading, error }
}