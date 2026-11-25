import { useCallback, useEffect, useState } from 'react'

import type { CharityStats } from '@shared/contracts'
import { fetchStats, type ApiFailure } from '@/lib/public-api'

export type StatsState =
  | { readonly status: 'idle' | 'loading' }
  | { readonly status: 'ready'; readonly stats: CharityStats }
  | { readonly status: 'error'; readonly error: ApiFailure }

interface Entry {
  readonly id: string
  readonly attempt: number
  readonly state: StatsState
}

/**
 * A charity's live pledge counts and public supporters. `id` undefined:
 * nothing to load yet. A reload keeps showing the last counts until the new
 * ones arrive, so the numbers never blink out after a pledge.
 */
export const useCharityStats = (id: string | undefined): StatsState & { readonly reload: () => void } => {
  const [attempt, setAttempt] = useState(0)
  const [entry, setEntry] = useState<Entry | null>(null)

  useEffect(() => {
    if (id === undefined) return
    let live = true
    void fetchStats(id).then((result) => {
      if (!live) return
      const state: StatsState = result.ok
        ? { status: 'ready', stats: result.data }
        : { status: 'error', error: result.error }
      setEntry({ id, attempt, state })
    })
    return () => {
      live = false
    }
  }, [id, attempt])

  const reload = useCallback(() => setAttempt((n) => n + 1), [])

  const state: StatsState =
    id === undefined
      ? { status: 'idle' }
      : entry !== null && entry.id === id && (entry.attempt === attempt || entry.state.status === 'ready')
        ? entry.state
        : { status: 'loading' }
  return { ...state, reload }
}
