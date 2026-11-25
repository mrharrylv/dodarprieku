import { CONSENT_TTL_DAYS } from '@/config/constants'
import { STORAGE_KEYS } from '@/config/site'
import { readJson, writeJson } from '@/lib/storage'

/**
 * The visitor's answer to the Google Analytics question, kept only in their
 * browser (`STORAGE_KEYS.consent`, in the cookie policy's table). No consent
 * backend: nothing about the choice is sent anywhere.
 */
export interface StoredConsent {
  readonly analytics: boolean
  /** Epoch ms. A decision expires so the visitor is asked again eventually. */
  readonly at: number
  readonly version: number
}

/** Bump when what is asked changes: an older answer then counts as none. */
export const CONSENT_VERSION = 1

const DAY_MS = 24 * 60 * 60 * 1000

export const isStoredConsent = (v: unknown): v is StoredConsent =>
  typeof v === 'object' &&
  v !== null &&
  typeof (v as StoredConsent).analytics === 'boolean' &&
  typeof (v as StoredConsent).at === 'number' &&
  typeof (v as StoredConsent).version === 'number'

/** The standing decision, or `null` when there is none, it is stale, or from another version. */
export const loadConsent = (now: number = Date.now()): StoredConsent | null => {
  const stored = readJson(STORAGE_KEYS.consent, isStoredConsent)
  if (stored === null || stored.version !== CONSENT_VERSION) return null
  return now - stored.at > CONSENT_TTL_DAYS * DAY_MS ? null : stored
}

export const saveConsent = (analytics: boolean, now: number = Date.now()): StoredConsent => {
  const next: StoredConsent = { analytics, at: now, version: CONSENT_VERSION }
  writeJson(STORAGE_KEYS.consent, next)
  return next
}
