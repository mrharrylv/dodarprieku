/**
 * Build-time environment, validated once at the boundary.
 *
 * Vite inlines `import.meta.env.VITE_*` at build time, so anything here is
 * PUBLIC: it ships in the bundle and is readable by anyone. Never put a
 * credential in a VITE_ variable. Server-side secrets belong in the Lambda's
 * own environment or in Secrets Manager.
 *
 * Every value is optional: an unset variable means the corresponding feature is
 * simply off, and the site must still work. That is what lets a fresh copy of
 * the template deploy and run before any backend exists.
 */

import { ANALYTICS_ENDPOINT } from './site'

/** A feature endpoint that was configured, or `null` when the feature is off. */
export type OptionalEndpoint = string | null

const isNonEmpty = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0

/**
 * Accepts a value only if it is an absolute https:// URL.
 *
 * A misconfigured endpoint is worse than an absent one: an absent endpoint
 * shows the "call or email us instead" fallback, while a malformed one produces
 * a fetch that fails at submit time, after the visitor has typed everything.
 * Reject it here, at build time's first read, and treat it as off.
 */
const parseEndpoint = (raw: unknown, name: string): OptionalEndpoint => {
  if (!isNonEmpty(raw)) return null

  try {
    const url = new URL(raw)
    if (url.protocol !== 'https:') {
      console.error(
        `[config] ${name} must be an https:// URL, got "${url.protocol}". Treating the feature as disabled.`,
      )
      return null
    }
    return url.toString()
  } catch {
    console.error(
      `[config] ${name} is not a valid URL: "${raw}". Treating the feature as disabled.`,
    )
    return null
  }
}

/** How the contact form behaves. See `contactMode()` for the resolution. */
export type ContactMode = 'mock' | 'live' | 'off'

const parseContactMode = (raw: unknown): ContactMode => {
  if (!isNonEmpty(raw)) return 'mock'
  const value = raw.trim().toLowerCase()
  if (value === 'mock' || value === 'live' || value === 'off') return value
  console.error(
    `[config] VITE_CONTACT_MODE must be "mock", "live" or "off", got "${raw}". Using "mock".`,
  )
  return 'mock'
}

/**
 * Where visit statistics go. Unset: `ANALYTICS_ENDPOINT` from `site.ts`, so
 * every site reports to the CRM without anyone remembering to configure it.
 * `off` (or `none`, `false`, `0`): nowhere. Anything else must be an https
 * URL; a malformed one is logged and means off, never a guess.
 */
export const parseAnalyticsEndpoint = (raw: unknown, fallback: string | null): OptionalEndpoint => {
  if (!isNonEmpty(raw)) return fallback === null ? null : parseEndpoint(fallback, 'ANALYTICS_ENDPOINT')
  if (['off', 'none', 'false', '0'].includes(raw.trim().toLowerCase())) return null
  return parseEndpoint(raw, 'VITE_ANALYTICS_ENDPOINT')
}

const parseSiteUrl = (raw: unknown): string => {
  if (!isNonEmpty(raw)) return ''
  try {
    // Canonical URLs are compared as strings, so a trailing slash on the origin
    // would produce "https://example.com//about".
    return new URL(raw).origin
  } catch {
    console.error(`[config] VITE_SITE_URL is not a valid URL: "${raw}". Ignoring.`)
    return ''
  }
}

export const ENV = {
  /**
   * Canonical origin, e.g. `https://example.com`. Used for canonical links,
   * Open Graph URLs and the sitemap. Empty in local development, where the
   * runtime origin is used instead.
   */
  siteUrl: parseSiteUrl(import.meta.env.VITE_SITE_URL),

  /** Contact-form endpoint. `null` disables the form and shows the fallback. */
  contactEndpoint: parseEndpoint(
    import.meta.env.VITE_CONTACT_ENDPOINT,
    'VITE_CONTACT_ENDPOINT',
  ),

  /**
   * The requested contact-form mode. `mock` (the default) renders the real
   * form and discards what it is given after a short pause, so a site can be
   * shown and reviewed before any backend exists. See `contactMode()` for how
   * this combines with the endpoint.
   */
  contactMode: parseContactMode(import.meta.env.VITE_CONTACT_MODE),

  /** Consent-record endpoint. `null` keeps consent local to the browser. */
  consentEndpoint: parseEndpoint(
    import.meta.env.VITE_CONSENT_ENDPOINT,
    'VITE_CONSENT_ENDPOINT',
  ),

  /** Visit-statistics endpoint (HA Group's CRM). `null` sends nothing. */
  analyticsEndpoint: parseAnalyticsEndpoint(
    import.meta.env.VITE_ANALYTICS_ENDPOINT,
    ANALYTICS_ENDPOINT,
  ),

  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
} as const

/**
 * What the form actually does, resolved once.
 *
 * - `off` wins over everything: the operator turned it off.
 * - A valid endpoint means `live`, whatever the mode says. A form that could
 *   deliver and instead pretends would lose real enquiries.
 * - An endpoint that was PROVIDED but rejected (not https, malformed) means
 *   `off`, not `mock`: the operator meant live, and a demo form in its place
 *   would hide the misconfiguration behind a cheerful "Message sent".
 * - `live` with no endpoint at all is `off`, and says so once.
 * - Otherwise `mock`.
 */
const resolveContactMode = (): ContactMode => {
  if (ENV.contactMode === 'off') return 'off'
  if (ENV.contactEndpoint !== null) return 'live'
  if (isNonEmpty(import.meta.env.VITE_CONTACT_ENDPOINT)) return 'off'
  if (ENV.contactMode === 'live') {
    console.error(
      '[config] VITE_CONTACT_MODE is "live" but VITE_CONTACT_ENDPOINT is not set. The form is off.',
    )
    return 'off'
  }
  return 'mock'
}

const RESOLVED_CONTACT_MODE: ContactMode = resolveContactMode()

export const contactMode = (): ContactMode => RESOLVED_CONTACT_MODE

/** True when the form should be rendered at all, mocked or real. */
export const hasContactBackend = (): boolean => RESOLVED_CONTACT_MODE !== 'off'

/** True when the form is rendered but goes nowhere, so the UI must say so. */
export const isContactMocked = (): boolean => RESOLVED_CONTACT_MODE === 'mock'

/** True when consent decisions are recorded server-side as well as locally. */
export const hasConsentBackend = (): boolean => ENV.consentEndpoint !== null

/** True when page views are reported to the CRM. The legal pages say so when it is. */
export const hasAnalytics = (): boolean => ENV.analyticsEndpoint !== null

/**
 * The canonical origin to build absolute URLs from.
 *
 * Falls back to the runtime origin so local development and preview
 * deployments produce sensible links instead of `undefined/about`.
 */
export const originUrl = (): string => {
  if (ENV.siteUrl) return ENV.siteUrl
  if (typeof window !== 'undefined') return window.location.origin
  return ''
}
