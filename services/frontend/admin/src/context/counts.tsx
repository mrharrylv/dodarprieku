/** Sidebar badge counts, refreshed after every mutation that changes them. */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { charityCounts, type Counts } from '../lib/dashboard'
import { useApi } from './api'

interface CountsApi {
  readonly counts: Counts | undefined
  readonly refresh: () => void
}

const CountsContext = createContext<CountsApi>({ counts: undefined, refresh: () => undefined })

export const CountsProvider = ({ children }: { readonly children: ReactNode }) => {
  const api = useApi()
  const [counts, setCounts] = useState<Counts | undefined>()
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let live = true
    Promise.all([api.charities(), api.listRequests()]).then(
      ([charities, requests]) => live && setCounts(charityCounts(charities, requests)),
      // Badges are a convenience: each page shows its own load error.
      (e: unknown) => console.warn('[counts] could not load badge counts', e),
    )
    return () => {
      live = false
    }
  }, [api, version])

  const refresh = useCallback(() => setVersion((v) => v + 1), [])
  const value = useMemo(() => ({ counts, refresh }), [counts, refresh])
  return <CountsContext.Provider value={value}>{children}</CountsContext.Provider>
}

export const useCounts = (): CountsApi => useContext(CountsContext)
