/**
 * Policy numbers and limits.
 *
 * Anything a person might reasonably want to change without touching logic
 * belongs here rather than inline: a magic `500` buried in a validator is a
 * value nobody can find and nobody dares edit.
 */

/**
 * Field length limits, in characters.
 *
 * These MUST mirror whatever the backend enforces, exactly. A frontend that
 * allows 5000 characters into a field the Lambda truncates at 2000 loses the
 * end of the message silently; a frontend stricter than the backend just
 * annoys people. When one side changes, change both in the same commit.
 */
export const FIELD_LIMITS = {
  name: { min: 2, max: 100 },
  email: { min: 5, max: 254 },
  phone: { min: 6, max: 32 },
  subject: { min: 2, max: 150 },
  message: { min: 10, max: 2000 },
} as const

/**
 * Client-side submission throttle.
 *
 * This is a courtesy guard against a double-click and a casual script, nothing
 * more: it lives in local storage, so anyone who wants to bypass it can. The
 * real limit belongs at the endpoint. Do not treat this as a security control.
 */
export const RATE_LIMIT = {
  maxAttempts: 3,
  windowMs: 10 * 60 * 1000, // 10 minutes
} as const

/**
 * How long a request may run before the UI gives up.
 *
 * `fetch` has no default timeout. Without this an unreachable backend leaves
 * the button on "Sending…" forever, showing neither a success nor an error,
 * the single worst outcome for someone trying to contact a business.
 */
export const REQUEST_TIMEOUT_MS = 15_000

/**
 * How long the mocked contact form pretends to be sending.
 *
 * Only used in `mock` mode. Long enough that the pending state is visible,
 * short enough not to feel broken.
 */
export const CONTACT_MOCK_LATENCY_MS = 700

/**
 * The longest `public/theme-init.js` keeps a page hidden before its first
 * paint: a page in the wrong language for its address, or the bare root on
 * its way to the visitor's language.
 *
 * `main.tsx` shows the page as soon as it has rendered, well inside this. It
 * is for the load where that never happens (the bundle failed or was
 * blocked, or the redirect never landed), so a visitor is not left with a
 * page hidden for good. The script cannot import this; its copy is held to
 * it by `src/context/theme-init.test.ts`.
 */
export const HIDDEN_PAGE_TIMEOUT_MS = 3_000

/**
 * Visit statistics sent to HA Group's CRM (`lib/analytics.ts`).
 *
 * The limits are the contract in doc/visit-tracking.md: the CRM rejects a
 * field longer than these, so a change here is a change there too, and
 * `schemaVersion` goes up when a field changes meaning.
 */
export const ANALYTICS = {
  schemaVersion: 1,
  /** Query parameters reported from the landing address; every other one is dropped. */
  campaignParams: ['utm_source', 'utm_medium', 'utm_campaign', 'ref'],
  maxCampaign: 100,
  maxPath: 512,
  maxHost: 253,
  maxLanguage: 35,
  maxTimeZone: 64,
  /** Six hours: a tab left open overnight is not a six-hour read. */
  maxEngagedMs: 6 * 60 * 60 * 1000,
} as const

/** How long a consent decision stands before the banner asks again. */
export const CONSENT_TTL_DAYS = 365

/**
 * Breakpoints, matching Tailwind's defaults.
 *
 * Duplicated here only for JavaScript that must agree with CSS (a media-query
 * hook, say). CSS itself uses the Tailwind variants, never these.
 */
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
} as const

/**
 * The generated images the head and the structured data point at.
 *
 * `scripts/generate-images.mjs` writes them at exactly these sizes, and
 * `scripts/generate-images.test.mjs` checks the committed files. A crawler
 * given an `og:image` with its width and height can lay out the card before
 * it has downloaded the image, and one without them sometimes shows none.
 */
export const SHARE_IMAGE = {
  path: '/og-image.png',
  width: 1200,
  height: 630,
  type: 'image/png',
  /** WhatsApp drops a preview image over about 300 KB; the build fails above this. */
  maxBytes: 300 * 1024,
} as const

/** MIME type by extension, for `og:image:type` on an image the generator did not draw. */
export const IMAGE_TYPES: Readonly<Record<string, string>> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
}

/**
 * `og:locale` wants language_TERRITORY ("lv_LV"); a bare "lv" is not what
 * Facebook documents. A language missing here gets its own code as territory
 * ("de" becomes "de_DE"); add a line only where that is wrong ("en_GB").
 */
export const OG_LOCALES: Readonly<Record<string, string>> = { en: 'en_US', lv: 'lv_LV', ru: 'ru_RU' }

/** Organization.logo: square, opaque, legible on a white page and a dark one. */
export const LOGO_IMAGE = { path: '/logo.png', width: 512, height: 512 } as const
