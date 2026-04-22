import { useEffect, useRef } from 'react'
import { subscribeToCasesRealtime, type CaseRealtimePayload } from '../../../lib/supabase/db'

interface UseRealtimeCasesOptions {
  enabled?: boolean
  onEvent?: (payload: CaseRealtimePayload) => void
  onInsert?: (payload: CaseRealtimePayload) => void
  onUpdate?: (payload: CaseRealtimePayload) => void
  onDelete?: (payload: CaseRealtimePayload) => void
}

type CasesListener = (payload: CaseRealtimePayload) => void

const listeners = new Set<CasesListener>()
let unsubscribe: (() => void) | null = null
let subscribers = 0

function ensureSubscription() {
  if (unsubscribe) return

  unsubscribe = subscribeToCasesRealtime((payload) => {
    listeners.forEach((listener) => {
      listener(payload)
    })
  })
}

function releaseSubscription() {
  if (subscribers > 0 || !unsubscribe) return
  unsubscribe()
  unsubscribe = null
}

export function useRealtimeCases(options: UseRealtimeCasesOptions = {}) {
  const enabled = options.enabled ?? true
  const onEventRef = useRef(options.onEvent)
  const onInsertRef = useRef(options.onInsert)
  const onUpdateRef = useRef(options.onUpdate)
  const onDeleteRef = useRef(options.onDelete)

  useEffect(() => {
    onEventRef.current = options.onEvent
  }, [options.onEvent])

  useEffect(() => {
    onInsertRef.current = options.onInsert
  }, [options.onInsert])

  useEffect(() => {
    onUpdateRef.current = options.onUpdate
  }, [options.onUpdate])

  useEffect(() => {
    onDeleteRef.current = options.onDelete
  }, [options.onDelete])

  useEffect(() => {
    if (!enabled) return

    const listener: CasesListener = (payload) => {
      onEventRef.current?.(payload)

      if (payload.eventType === 'INSERT') {
        onInsertRef.current?.(payload)
        return
      }

      if (payload.eventType === 'UPDATE') {
        onUpdateRef.current?.(payload)
        return
      }

      onDeleteRef.current?.(payload)
    }

    listeners.add(listener)
    subscribers += 1
    ensureSubscription()

    return () => {
      listeners.delete(listener)
      subscribers = Math.max(0, subscribers - 1)
      releaseSubscription()
    }
  }, [enabled])
}
