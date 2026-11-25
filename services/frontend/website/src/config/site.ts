/**
 * Every site-specific value lives here.
 *
 * A component never hardcodes an address, a phone number, a route path or a
 * social URL: it imports from this file. That is what makes the template
 * re-skinnable: one file to edit, and a grep for a stale value finds every use.
 *
 * User-visible PROSE does not belong here; it belongs in the locale files.
 * What belongs here is data that is the same in every language: a phone number,
 * an email address, a route, a registration number.
 */

import { googleMap, type MapConfig } from '@/lib/map'
import { isPlaceholder } from '@/lib/placeholder'

/* =============================================================================
 * Locales
 * ========================================================================== */

/**
 * The order is the order the language switcher renders in, and nothing more:
 * which language is the default is `DEFAULT_LOCALE`, below.
 *
 * Removing a locale means deleting its folder under `i18n/locales/` too: the
 * parity test walks this list.
 */
export const LOCALES = [
  { code: 'lv', label: 'Latviešu', short: 'LV', htmlLang: 'lv' },
  { code: 'en', label: 'English', short: 'EN', htmlLang: 'en' },
  { code: 'ru', label: 'Русский', short: 'RU', htmlLang: 'ru' },
] as const

export type LocaleCode = (typeof LOCALES)[number]['code']

/**
 * The default language, and the only thing that decides it: the page written
 * as the bare root, the 404 page, the i18n fallback, where an unprefixed or
 * unpublished-language URL is sent, and every page's `hreflang="x-default"`.
 * `default-locale.test.ts` moves it off the first entry of `LOCALES` and
 * checks that all of them follow. Keep it a quoted literal:
 * `scripts/generate-images.mjs` reads it from this file as text.
 */
export const DEFAULT_LOCALE: LocaleCode = 'lv'

export const LOCALE_CODES: readonly LocaleCode[] = LOCALES.map((l) => l.code)

/* =============================================================================
 * Identity
 * ========================================================================== */

export const SITE = {
  /** Brand name, as shown to visitors. */
  name: 'Dodar prieku',
  /** Used where the brand needs qualifying, e.g. the <title> suffix. */
  shortName: 'Dodar prieku',
  /** Domain without protocol, for display, not for linking. */
  domain: 'example.com',
  /** Two-letter country of operation, for structured data. */
  country: 'LV',
  /** Default locale's ISO code, for `<html lang>` before i18n boots. */
  defaultLang: DEFAULT_LOCALE,
} as const

/* =============================================================================
 * Contact
 * ========================================================================== */

/**
 * PLACEHOLDERS. Replace before the site is shown to anyone.
 *
 * A fake phone number on a live contact page is worse than no phone number: the
 * fallback banner shown when the form is unavailable points customers straight
 * at it. See doc/content.md.
 */
export const CONTACT = {
  email: 'hello@example.com',
  phone: '+371 20 000 000',
  /** E.164, digits only: what `tel:` and WhatsApp links need. */
  phoneE164: '+37120000000',
  /**
   * The WhatsApp button, on by default on every site (Harry, 2026-11-06):
   * normally the same mobile number as `phone`, digits only with the
   * country code. `''` removes the button.
   */
  whatsapp: '37120000000',
  address: {
    street: 'Example street 1',
    city: 'Rīga',
    postalCode: 'LV-1010',
    country: 'Latvia',
  },
  /** Shown on the contact page. Keys are i18n'd; values are data. */
  hours: {
    weekdays: '09:00–18:00',
    saturday: '10:00–15:00',
    sunday: null,
  },
} as const

/**
 * The contact page's map, shown straight away with no click, and the target
 * of the footer address's "Show on the map" button (Harry's standing choice,
 * 2026-11-06). On by default: it is built from `CONTACT.address`, so a site
 * with a real address has a map with no further step. While the address is
 * still the template's placeholder there is no map, rather than a map of
 * "Example street".
 *
 * The Terraform allows https://www.google.com in the CSP's frame-src by
 * default (`frame_origins`), and the cookie and privacy pages name the Google
 * map whenever `MAP` is set (`cookies.thirdParty.map`, `privacy.sharing.map`).
 * To turn it off: `export const MAP: MapConfig | null = null`, and
 * `frame_origins = []` in the tfvars. See doc/content.md, "The map".
 */
export const MAP: MapConfig | null = isPlaceholder(CONTACT.address.street)
  ? null
  : googleMap(`${CONTACT.address.street}, ${CONTACT.address.postalCode} ${CONTACT.address.city}`)

export const SOCIAL = {
  facebook: '',
  instagram: '',
  linkedin: '',
} as const

/** Only the platforms that were actually filled in. */
export const activeSocial = (): ReadonlyArray<[keyof typeof SOCIAL, string]> =>
  Object.entries(SOCIAL).filter(([, url]) => url.length > 0) as Array<
    [keyof typeof SOCIAL, string]
  >

/* =============================================================================
 * Developer credit
 * ========================================================================== */

/**
 * Shown in every style's footer, translated around the name. The name is a
 * proper noun and stays as written.
 */
export const DEVELOPER = {
  name: 'HA Group',
  url: 'https://hagroup.lv',
} as const

/* =============================================================================
 * Visit statistics
 * ========================================================================== */

/**
 * Where every page view is reported: HA Group's private CRM, which shows when
 * a site was opened, which pages, for how long, from where and on what kind of
 * device. Cookieless and anonymous; what is sent is `lib/analytics.ts`, the
 * contract the CRM implements is doc/visit-tracking.md.
 *
 * `null` turns it off, and so does the build variable
 * `VITE_ANALYTICS_ENDPOINT=off`; a URL in that variable replaces this one.
 * The origin must also be `analytics_origin` in
 * infrastructure/terraform/variables.tf, or the browser's CSP blocks the
 * request (`analytics-origin.test.ts` holds the two together).
 */
export const ANALYTICS_ENDPOINT: string | null = 'https://crm.hagroup.lv/api/track'

/* =============================================================================
 * Legal entity
 * ========================================================================== */

/**
 * PLACEHOLDERS: every X must be replaced with the real value before a legal
 * page goes live. A plausible-looking fake registration number on a published
 * privacy policy is a genuine legal problem, not a cosmetic one.
 */
export const COMPANY = {
  legalName: 'SIA "Example"',
  registrationNumber: '40203XXXXXX',
  vatNumber: 'LV40203XXXXXX',
  iban: 'LV00XXXX0000000000000',
  bank: '',
  registeredAddress: 'Example street 1, Rīga, LV-1010, Latvia',
} as const

/* =============================================================================
 * Routes
 * ========================================================================== */

/**
 * The single source of truth for every path. Never write a route as a string
 * literal in a component: a renamed page then breaks silently in the one place
 * you forgot.
 */
export const ROUTES = {
  home: '/',
  about: '/about',
  services: '/services',
  contact: '/contact',
  privacy: '/legal/privacy',
  cookies: '/legal/cookies',
  terms: '/legal/terms',
  company: '/legal/company',
} as const

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES]

/** The primary navigation, in order. Labels come from the `common` namespace. */
export const NAV_LINKS = [
  { to: ROUTES.home, labelKey: 'nav.home' },
  { to: ROUTES.services, labelKey: 'nav.services' },
  { to: ROUTES.about, labelKey: 'nav.about' },
  { to: ROUTES.contact, labelKey: 'nav.contact' },
] as const

/** Legal links, shown in the footer's bottom bar. */
export const LEGAL_LINKS = [
  { to: ROUTES.privacy, labelKey: 'legal.privacy' },
  { to: ROUTES.cookies, labelKey: 'legal.cookies' },
  { to: ROUTES.terms, labelKey: 'legal.terms' },
  { to: ROUTES.company, labelKey: 'legal.company' },
] as const

/* =============================================================================
 * Local storage
 * ========================================================================== */

/**
 * EVERY key the site writes to local storage must be listed here AND in the
 * cookie policy's table, in every locale.
 *
 * That is not bookkeeping for its own sake: the cookie policy states exactly
 * what is stored, and a key that exists in code but not in the policy makes the
 * published policy false. Adding a key is a legal-copy change, not just a line
 * of TypeScript.
 */
export const STORAGE_KEYS = {
  theme: 'dodarprieku.theme',
  locale: 'dodarprieku.locale',
  consent: 'dodarprieku.consent',
  contactRateLimit: 'dodarprieku.contact.attempts',
} as const

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS]
