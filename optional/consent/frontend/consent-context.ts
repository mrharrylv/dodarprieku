import { createContext } from 'react'

/**
 * Consent categories.
 *
 * `necessary` is always on and is not a choice: it covers the theme and
 * language settings the site cannot work without, which need no consent under
 * the ePrivacy Directive Art. 5(3) "strictly necessary" exemption.
 *
 * Add a category only when something on the site actually depends on it. A
 * banner offering four toggles for a site that uses one of them is a dark
 * pattern in the other direction: it manufactures a decision nobody needs.
 */
export type ConsentCategory = 'necessary' | 'analytics' | 'embeds'

export type ConsentState = Record<ConsentCategory, boolean>

export const DEFAULT_CONSENT: ConsentState = {
  necessary: true,
  // Everything else starts FALSE. Consent must be opt-in: pre-ticked boxes and
  // implied consent from "continuing to browse" are not valid consent under
  // GDPR Art. 4(11) (Planet49, C-673/17).
  analytics: false,
  embeds: false,
}

export interface ConsentContextValue {
  readonly consent: ConsentState
  /** False until the visitor has answered, so the banner knows to show. */
  readonly decided: boolean
  readonly acceptAll: () => void
  readonly rejectAll: () => void
  readonly save: (choices: Partial<ConsentState>) => void
  /** Reopens the banner, for the "change your choices" link in the footer. */
  readonly reopen: () => void
}

export const ConsentContext = createContext<ConsentContextValue | undefined>(undefined)

export const isConsentState = (value: unknown): value is ConsentState =>
  typeof value === 'object' &&
  value !== null &&
  Object.keys(DEFAULT_CONSENT).every(
    (key) => typeof (value as Record<string, unknown>)[key] === 'boolean',
  )
