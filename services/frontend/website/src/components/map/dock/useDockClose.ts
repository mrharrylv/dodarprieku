import { useCallback, useEffect, useRef, useState } from 'react'

import type { Dock } from '@/lib/map-route'
import { dockMotionMs } from './dock-motion'

/**
 * Where the browser is right now. The router updates its own location in a
 * transition, a few frames after the history entry changes, so the history
 * is what tells whether the visitor has already gone somewhere else.
 */
const historyEntry = (): string => {
  try {
    const state: unknown = window.history.state
    const key = typeof state === 'object' && state !== null && 'key' in state ? String(state.key) : ''
    return `${window.location.href}#${key}`
  } catch {
    return ''
  }
}

/**
 * Closing the dock in one motion: `close()` marks the open dock as closing,
 * which slides it out while the map takes its room back, and calls `finish`
 * (leave its address) once the slide is over. It stays closing until the
 * dock has actually changed: the router commits the new address a few frames
 * after `finish`, and clearing it sooner would slide the dock back in for
 * those frames. With reduced motion it finishes at once. Opening another dock,
 * or leaving the address some other way, while it slides out cancels the
 * pending finish, even before the router has caught up. `Dock` values are the
 * route table's own objects, so identity names the dock.
 */
export const useDockClose = (dock: Dock | null, finish: () => void): { closing: boolean; close: () => void } => {
  const [closing, setClosing] = useState<Dock | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Another dock, or none, took its place: it is no longer the one closing.
  if (closing !== null && closing !== dock) setClosing(null)

  useEffect(() => {
    if (closing !== null || timer.current === null) return
    clearTimeout(timer.current)
    timer.current = null
  }, [closing])

  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current)
    },
    [],
  )

  const close = useCallback(() => {
    if (dock === null || closing !== null || timer.current !== null) return
    const ms = dockMotionMs()
    if (ms === 0) {
      finish()
      return
    }
    setClosing(dock)
    const from = historyEntry()
    timer.current = setTimeout(() => {
      timer.current = null
      if (historyEntry() === from) finish()
    }, ms)
  }, [dock, closing, finish])

  return { closing: closing !== null && closing === dock, close }
}
