import { useCallback, useEffect, useState } from 'react'

import type { AccountView, Me } from '@shared/contracts'

import { fetchAccount, fetchMe, logout as apiLogout, type ApiFailureKind } from '@/lib/account-api'
import { setSignedIn } from './useSignedIn'

export type AccountSession =
  | { readonly kind: 'loading' }
  | { readonly kind: 'anon' }
  | { readonly kind: 'error'; readonly error: ApiFailureKind }
  | { readonly kind: 'not_charity'; readonly me: Me }
  | { readonly kind: 'ready'; readonly me: Me; readonly account: AccountView }

/** What `GET /api/auth/me` then `GET /api/account` add up to. Pure, so each branch is testable. */
export const loadSession = async (): Promise<AccountSession> => {
  const me = await fetchMe()
  if (!me.ok) return me.error === 'unauthorized' ? { kind: 'anon' } : { kind: 'error', error: me.error }
  if (me.data.role !== 'charity') return { kind: 'not_charity', me: me.data }
  const account = await fetchAccount()
  if (account.ok) return { kind: 'ready', me: me.data, account: account.data }
  if (account.error === 'unauthorized') return { kind: 'anon' }
  if (account.error === 'forbidden') return { kind: 'not_charity', me: me.data }
  return { kind: 'error', error: account.error }
}

/**
 * The charity's session on `/konts`. Starts loading only when `enabled`
 * (after hydration: the prerendered page knows nothing of the cookie).
 */
export const useAccountSession = (enabled: boolean) => {
  const [session, setSession] = useState<AccountSession>({ kind: 'loading' })
  const [loggingOut, setLoggingOut] = useState(false)
  const [generation, setGeneration] = useState(0)

  useEffect(() => {
    if (!enabled) return
    let live = true
    void loadSession().then((next) => {
      if (next.kind === 'anon') setSignedIn(false)
      if (next.kind === 'ready' || next.kind === 'not_charity') setSignedIn(true)
      if (live) setSession(next)
    })
    return () => {
      live = false
    }
  }, [enabled, generation])

  const reload = useCallback(() => {
    setSession({ kind: 'loading' })
    setGeneration((g) => g + 1)
  }, [])

  const replaceAccount = useCallback(
    (account: AccountView) => setSession((s) => (s.kind === 'ready' ? { ...s, account } : s)),
    [],
  )

  /** Resolves to null when logged out, or the failure (the session is then kept: the cookie still holds). */
  const logout = useCallback(async (): Promise<ApiFailureKind | null> => {
    setLoggingOut(true)
    const result = await apiLogout()
    setLoggingOut(false)
    if (result.ok || result.error === 'unauthorized') {
      setSignedIn(false)
      setSession({ kind: 'anon' })
      return null
    }
    console.error('[account] logout failed', result.error)
    return result.error
  }, [])

  return { session, reload, replaceAccount, logout, loggingOut }
}
