import { useEffect, useSyncExternalStore } from 'react'

import { STORAGE_KEYS } from '@/config/site'
import { fetchMe } from '@/lib/account-api'
import { readRaw, remove, writeRaw } from '@/lib/storage'

/**
 * Whether this browser has a session: any logged-in user (a charity on the
 * public host; admins log in on their own host) does not need "+ Kļūt par
 * saņēmēju". `null` until it is known. One store for the page, so the account
 * panel's login and logout reach the map's buttons at once.
 *
 * The session cookie is HttpOnly, so a local hint, written whenever a session
 * is seen and cleared when one is not, says whether to ask at all: an anonymous
 * visitor is answered at once and never sends a request that ends in 401, and
 * a signed-in one has the button hidden from the first hydrated paint while
 * `GET /api/auth/me` confirms it. The hint is a convenience, never trusted for
 * anything else: the API still decides every request on the cookie.
 */
type SignedIn = boolean | null

export const SIGNED_IN_HINT = STORAGE_KEYS.signedIn

let current: SignedIn = null
let probing: Promise<void> | null = null
const listeners = new Set<() => void>()

export const setSignedIn = (next: boolean): void => {
  if (next) writeRaw(SIGNED_IN_HINT, '1')
  else remove(SIGNED_IN_HINT)
  if (current === next) return
  current = next
  for (const listener of listeners) listener()
}

/** Answers from the hint; asks the API only when it says signed in. A failure of any kind counts as signed out. */
const probe = (): Promise<void> => {
  if (probing) return probing
  if (current !== null) return (probing = Promise.resolve())
  if (readRaw(SIGNED_IN_HINT) !== '1') {
    setSignedIn(false)
    return (probing = Promise.resolve())
  }
  setSignedIn(true)
  probing = fetchMe().then((me) => {
    // The account panel may have answered meanwhile; a failed check still signs out.
    if (!me.ok) setSignedIn(false)
  })
  return probing
}

/** Tests only: forget what is known. */
export const resetSignedIn = (): void => {
  current = null
  probing = null
  listeners.clear()
  remove(SIGNED_IN_HINT)
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** `enabled` after hydration: the prerendered page knows nothing of the cookie, so it is `null` there. */
export const useSignedIn = (enabled: boolean): SignedIn => {
  const value = useSyncExternalStore(subscribe, () => current, () => null)
  useEffect(() => {
    if (enabled) void probe()
  }, [enabled])
  return enabled ? value : null
}
