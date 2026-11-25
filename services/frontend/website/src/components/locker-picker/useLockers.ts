import { useEffect, useState } from 'react'

import { REQUEST_TIMEOUT_MS } from '@/config/constants'
import { LOCKERS_PATH, parseLockers, type Locker } from './locker-filter'

export type LockersState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'loading' }
  | { readonly kind: 'ready'; readonly lockers: readonly Locker[] }
  | { readonly kind: 'error' }

let cache: Promise<readonly Locker[] | null> | null = null

/** Fetches the snapshot once per page load; a failure is remembered as null and retried on the next mount. */
export const loadLockers = (): Promise<readonly Locker[] | null> => {
  if (cache) return cache
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  cache = globalThis
    .fetch(LOCKERS_PATH, { headers: { accept: 'application/json' }, signal: controller.signal })
    .then(async (response) => (response.ok ? parseLockers(await response.json()) : null))
    .catch((err: unknown) => {
      console.error('[lockers] could not load the parcel locker list', err)
      return null
    })
    .then((result) => {
      clearTimeout(timer)
      if (result === null) cache = null
      return result
    })
  return cache
}

/** For tests: forget the fetched list. */
export const resetLockerCache = (): void => {
  cache = null
}

/** Starts loading when `active` first becomes true (the picker is opened), not before. */
export const useLockers = (active: boolean): LockersState => {
  const [state, setState] = useState<LockersState>({ kind: 'idle' })

  useEffect(() => {
    if (!active) return
    let live = true
    queueMicrotask(() => {
      if (live) setState((s) => (s.kind === 'ready' ? s : { kind: 'loading' }))
    })
    void loadLockers().then((lockers) => {
      if (live) setState(lockers === null ? { kind: 'error' } : { kind: 'ready', lockers })
    })
    return () => {
      live = false
    }
  }, [active])

  return state
}
