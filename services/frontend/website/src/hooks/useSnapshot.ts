import { useCallback, useEffect, useState } from 'react'

import type { PublicSnapshot } from '@shared/contracts'
import { fetchSnapshot, type ApiFailure } from '@/lib/public-api'

export type SnapshotState =
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly snapshot: PublicSnapshot }
  | { readonly status: 'error'; readonly error: ApiFailure }

/**
 * One load per page view, shared by the map and the charity pages: moving
 * from the map to a charity and back does not download it again.
 */
let cached: PublicSnapshot | null = null
let inFlight: Promise<SnapshotState> | null = null

const load = (): Promise<SnapshotState> => {
  inFlight ??= fetchSnapshot().then((result) => {
    inFlight = null
    if (!result.ok) return { status: 'error', error: result.error }
    cached = result.data
    return { status: 'ready', snapshot: result.data }
  })
  return inFlight
}

/** Tests only: forget the cached snapshot. */
export const resetSnapshotCache = (): void => {
  cached = null
  inFlight = null
}

/**
 * The public snapshot, loaded in an effect. The first render is always
 * `loading` while hydrating, because the prerender knew no snapshot; on a
 * client navigation with a cached snapshot it is `ready` at once.
 */
export const useSnapshot = (): SnapshotState & { readonly retry: () => void } => {
  const [state, setState] = useState<SnapshotState>(() =>
    cached === null ? { status: 'loading' } : { status: 'ready', snapshot: cached },
  )
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (cached !== null) return
    let live = true
    void load().then((next) => {
      if (live) setState(next)
    })
    return () => {
      live = false
    }
  }, [attempt])

  const retry = useCallback(() => {
    setState({ status: 'loading' })
    setAttempt((n) => n + 1)
  }, [])

  return { ...state, retry }
}
