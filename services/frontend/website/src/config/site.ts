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

/* =============================================================================
 * Locales
 * ========================================================================== */

/**
 * The order is the order the language switcher renders in, and nothing more:
 * which language is the default is `DEFAULT_LOCALE`, below.
 *
 * Removing a locale means deleting its folder under `i18n/locales/` too: the
 * parity test walks this list.
 *
 * Dod ar prieku is Latvian only (doc/specs/dodarprieku.md), so there is one
 * entry: `isPrefixed()` is false and no URL carries a `/lv` segment.
 */
export const LOCALES = [{ code: 'lv', label: 'Latviešu', short: 'LV', htmlLang: 'lv' }] as const

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
  name: 'Dod ar prieku',
  /** Used where the brand needs qualifying, e.g. the <title> suffix. */
  shortName: 'Dod ar prieku',
  /** Domain without protocol, for display, not for linking. */
  domain: 'dodarprieku.hagroup.lv',
  /** Two-letter country of operation, for structured data. */
  country: 'LV',
  /** Default locale's ISO code, for `<html lang>` before i18n boots. */
  defaultLang: DEFAULT_LOCALE,
} as const

/* =============================================================================
 * Contact
 * ========================================================================== */

/**
 * The public contact. The phone is still the template's placeholder (not
 * known), so nothing shows it prominently and `isPlaceholder()` keeps it out
 * of the structured data, `llms.txt` and the company page. There is no
 * WhatsApp number, so the bubble is off.
 */
export const CONTACT = {
  email: 'info@hagroup.lv',
  phone: '+371 20 000 000',
  /** E.164, digits only: what `tel:` links need. */
  phoneE164: '+37120000000',
  /** The WhatsApp button's number. `''` removes the button: no number is known. */
  whatsapp: '',
  address: {
    street: 'Koku iela 10-59',
    city: 'Rīga',
    postalCode: 'LV-1004',
    country: 'Latvia',
  },
} as const

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
 * The operator of the site. The IBAN and bank are deliberately empty: they are
 * not published here.
 */
export const COMPANY = {
  legalName: 'SIA HA Group',
  registrationNumber: '40203724866',
  vatNumber: 'LV40203724866',
  iban: '',
  bank: '',
  registeredAddress: 'Koku iela 10-59, Rīga, LV-1004, Latvia',
} as const

/* =============================================================================
 * HA Group's other projects
 * ========================================================================== */

/**
 * The footer's "Citi HA Group projekti" row. `icon` names an inline SVG in
 * `components/ui/Icon.tsx`; the names are proper nouns and stay as
 * written.
 */
export const HA_GROUP_PROJECTS = [
  { id: 'unveil', name: 'Unveil', url: 'https://unveil.hagroup.lv', icon: 'sparkle' },
  { id: 'eventapp', name: 'Event App', url: 'https://eventapp.lv', icon: 'ticket' },
  { id: 'balticgp', name: 'Baltic GP', url: 'https://balticgp.hagroup.lv', icon: 'flag' },
  { id: 'hagroup', name: 'HA Group', url: 'https://www.hagroup.lv', icon: 'building' },
] as const

export type ProjectIconName = (typeof HA_GROUP_PROJECTS)[number]['icon']

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
  /** The charity page's prerendered shell; a charity lives at `charityPath(slug)`. */
  charity: '/organizacija',
  register: '/registreties',
  account: '/konts',
  setPassword: '/konts/parole',
  forgotPassword: '/konts/aizmirsu',
  about: '/par-projektu',
  privacy: '/legal/privacy',
  cookies: '/legal/cookies',
  terms: '/legal/terms',
  company: '/legal/company',
} as const

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES]

/** The router's dynamic segment under `ROUTES.charity`. */
export const CHARITY_SLUG_PARAM = 'slug'

/** One charity's page: `/organizacija/<slug>`, the slug URL-encoded. */
export const charityPath = (slug: string): string => `${ROUTES.charity}/${encodeURIComponent(slug)}`

/** The primary navigation, in order. Labels come from the `common` namespace. */
export const NAV_LINKS = [
  { to: ROUTES.home, labelKey: 'nav.map' },
  { to: ROUTES.about, labelKey: 'nav.about' },
  { to: ROUTES.account, labelKey: 'nav.account' },
] as const

/** The header's call to action: become a recipient. Label from `common`. */
export const REGISTER_CTA = { to: ROUTES.register, labelKey: 'cta.register' } as const

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
  /** Session storage: the charity pages already counted as viewed in this tab. */
  viewedCharities: 'dodarprieku.viewed',
  /** Session storage: the unfinished registration form, so a reload does not lose it. */
  registerDraft: 'dodarprieku.register-draft',
} as const

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS]
