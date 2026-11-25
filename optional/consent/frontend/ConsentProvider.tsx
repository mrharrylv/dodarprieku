import { useCallback, useMemo, useState, type ReactNode } from 'react'

import { CONSENT_TTL_DAYS } from '@/config/constants'
import { STORAGE_KEYS } from '@/config/site'
import { ENV } from '@/config/env'
import { readJson, writeJson } from '@/lib/storage'
import {
  ConsentContext,
  DEFAULT_CONSENT,
  type ConsentState,
} from './consent-context'

interface StoredConsent {
  readonly consent: ConsentState
  /** Epoch ms. A decision expires so the visitor is asked again eventually. */
  readonly at: number
  /** Which version of the policy was agreed to. */
  readonly version: number
}

/**
 * Bump this when the categories change, or when the policy changes materially.
 *
 * A stored decision from an older version is treated as no decision at all: the
 * visitor agreed to something else, and carrying that agreement forward to a
 * new set of purposes is not consent.
 */
export const CONSENT_VERSION = 1

const isStored = (value: unknown): value is StoredConsent => {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Partial<StoredConsent>
  return (
    typeof v.at === 'number' &&
    typeof v.version === 'number' &&
    typeof v.consent === 'object' &&
    v.consent !== null
  )
}

const load = (): StoredConsent | null => {
  const stored = readJson(STORAGE_KEYS.consent, isStored)
  if (stored === null) return null

  if (stored.version !== CONSENT_VERSION) return null

  const ageMs = Date.now() - stored.at
  if (ageMs > CONSENT_TTL_DAYS * 24 * 60 * 60 * 1000) return null

  // Merge over the defaults so a category added since the decision was stored
  // defaults to false rather than to undefined.
  return { ...stored, consent: { ...DEFAULT_CONSENT, ...stored.consent } }
}

/**
 * Records the decision server-side, when an endpoint is configured.
 *
 * GDPR Art. 7(1) requires the controller to be able to DEMONSTRATE consent, and
 * a value in the visitor's own browser demonstrates nothing: they can edit it,
 * and it is gone the moment they clear site data.
 *
 * Best-effort and deliberately unawaited by the caller: if the record fails,
 * the visitor's choice still applies immediately in their browser. Blocking the
 * UI on a network call here would mean a banner that hangs.
 */
const record = (consent: ConsentState): void => {
  const endpoint = ENV.consentEndpoint
  if (endpoint === null) return

  void fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ consent, version: CONSENT_VERSION, at: Date.now() }),
    keepalive: true,
  }).catch((error: unknown) => {
    // Logged, never surfaced: the visitor's choice has already been applied,
    // and a failure to write the audit record is our problem, not theirs.
    console.error('[consent] could not record the decision', error)
  })
}

export const ConsentProvider = ({ children }: { children: ReactNode }) => {
  const [stored, setStored] = useState<StoredConsent | null>(load)
  const [reopened, setReopened] = useState(false)

  const commit = useCallback((choices: Partial<ConsentState>) => {
    const next: StoredConsent = {
      // `necessary` is spread last so it cannot be turned off by a caller.
      consent: { ...DEFAULT_CONSENT, ...choices, necessary: true },
      at: Date.now(),
      version: CONSENT_VERSION,
    }

    setStored(next)
    setReopened(false)
    writeJson(STORAGE_KEYS.consent, next)
    record(next.consent)
  }, [])

  const value = useMemo(
    () => ({
      consent: stored?.consent ?? DEFAULT_CONSENT,
      decided: stored !== null && !reopened,
      acceptAll: () => commit({ analytics: true, embeds: true }),
      rejectAll: () => commit({ analytics: false, embeds: false }),
      save: commit,
      reopen: () => setReopened(true),
    }),
    [commit, reopened, stored],
  )

  return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>
}
