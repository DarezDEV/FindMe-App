import { useEffect, useRef } from 'react'
import { subscribeToCaseCommentsRealtime, type CaseCommentRealtimePayload } from '../../../lib/supabase/db'

interface UseRealtimeCaseCommentsOptions {
  enabled?: boolean
  onEvent?: (payload: CaseCommentRealtimePayload) => void
  onInsert?: (payload: CaseCommentRealtimePayload) => void
  onUpdate?: (payload: CaseCommentRealtimePayload) => void
  onDelete?: (payload: CaseCommentRealtimePayload) => void
}

type CaseCommentsListener = (payload: CaseCommentRealtimePayload) => void

const listeners = new Set<CaseCommentsListener>()
let unsubscribe: (() => void) | null = null
let subscribers = 0

function ensureSubscription() {
  if (unsubscribe) return

  unsubscribe = subscribeToCaseCommentsRealtime((payload) => {
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

export function useRealtimeCaseComments(options: UseRealtimeCaseCommentsOptions = {}) {
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

    const listener: CaseCommentsListener = (payload) => {
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
