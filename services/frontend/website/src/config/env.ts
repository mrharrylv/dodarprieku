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
 * A misconfigured endpoint is worse than an absent one: a malformed one produces a
 * request that fails at run time, long after the build said nothing.
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

/** A GA4 measurement id: `G-` and upper-case letters or digits. */
const GA_MEASUREMENT_ID = /^G-[A-Z0-9]{4,20}$/

/**
 * The Google Analytics measurement id, or `null`. Only the prod GitHub
 * Environment sets `VITE_GA_MEASUREMENT_ID`; a malformed one is logged and
 * means off. Even with an id, GA loads only in a production build and only
 * after the visitor consents (`hasGoogleAnalytics()`, the consent banner).
 */
export const parseGaMeasurementId = (raw: unknown): string | null => {
  if (!isNonEmpty(raw)) return null
  const id = raw.trim()
  if (GA_MEASUREMENT_ID.test(id)) return id
  console.error(`[config] VITE_GA_MEASUREMENT_ID is not a GA4 id: "${raw}". Google Analytics is off.`)
  return null
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

  /** Google Analytics (GA4) id; set only on the prod environment. */
  gaMeasurementId: parseGaMeasurementId(import.meta.env.VITE_GA_MEASUREMENT_ID),

  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
} as const

/** True when consent decisions are recorded server-side as well as locally. */
export const hasConsentBackend = (): boolean => ENV.consentEndpoint !== null

/** True when page views are reported to the CRM. The legal pages say so when it is. */
export const hasAnalytics = (): boolean => ENV.analyticsEndpoint !== null

/**
 * True when this build may offer Google Analytics: a production build with a
 * valid measurement id. It still loads only after consent. The privacy and
 * cookie policies describe GA exactly when this is true.
 */
export const hasGoogleAnalytics = (
  env: { readonly isProd: boolean; readonly gaMeasurementId: string | null } = ENV,
): boolean => env.isProd && env.gaMeasurementId !== null

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
