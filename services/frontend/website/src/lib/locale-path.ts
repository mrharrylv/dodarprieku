import { LOCALES, LOCALE_CODES, DEFAULT_LOCALE, type LocaleCode } from '@/config/site'

/**
 * URL shape for locales.
 *
 * A multilingual site that serves every language from ONE url can only ever get
 * its default language indexed: a crawler has no way to reach, or to
 * distinguish, the others. So each language gets its own path: `/en/about`,
 * `/lv/about`, `/ru/about`, plus `hreflang` alternates tying them together.
 *
 * A SINGLE-locale site gets no prefix at all. `/about` stays `/about`, because
 * `/en/about` on a site with one language is noise in every URL for no benefit.
 * Everything here keys off `LOCALES.length`, so adding or removing a locale in
 * `config/site.ts` reshapes the URLs and needs no other change.
 */

/** Whether URLs carry a `/<lang>` prefix. */
export const isPrefixed = (): boolean => LOCALES.length > 1

export const isLocaleCode = (value: unknown): value is LocaleCode =>
  typeof value === 'string' && (LOCALE_CODES as readonly string[]).includes(value)

/**
 * Build the href for a route in a given locale.
 *
 * `path` is always the unprefixed route from `ROUTES`: callers never assemble
 * a prefix themselves.
 */
export const localePath = (path: string, locale: LocaleCode): string => {
  if (!isPrefixed()) return path
  // ROUTES.home is '/', which would otherwise produce '/en/'.
  return path === '/' ? `/${locale}` : `/${locale}${path}`
}

/**
 * Strip the locale prefix from a pathname, returning the bare route.
 *
 * Used by the language switcher: it needs "which page is this?" so it can offer
 * the same page in another language rather than dumping the visitor on the home
 * page, which is what a switcher that just links to `/lv` does.
 */
export const stripLocale = (pathname: string): string => {
  if (!isPrefixed()) return pathname || '/'

  const segments = pathname.split('/').filter(Boolean)
  const [first, ...rest] = segments

  if (first !== undefined && isLocaleCode(first)) {
    return rest.length === 0 ? '/' : `/${rest.join('/')}`
  }
  return pathname || '/'
}

/** The locale a pathname is for, or the default when it carries no prefix. */
export const localeFromPath = (pathname: string): LocaleCode => {
  if (!isPrefixed()) return DEFAULT_LOCALE

  const [first] = pathname.split('/').filter(Boolean)
  return first !== undefined && isLocaleCode(first) ? first : DEFAULT_LOCALE
}

/**
 * Swap the locale of a pathname, keeping the page.
 *
 * `/en/about` → `/lv/about`, not `/lv`.
 */
export const switchLocale = (pathname: string, next: LocaleCode): string =>
  localePath(stripLocale(pathname), next)

/** Anything shaped like a language tag: `de`, `pt-BR`. */
const LOCALE_SHAPED = /^[a-z]{2}(-[A-Za-z0-9]{2,8})?$/

/**
 * Where to send a request whose first segment is not a supported locale.
 *
 * Two different mistakes arrive here and they need opposite treatment:
 *
 *   `/services`: an unprefixed path, probably an old link or one typed by
 *                     hand. The page exists; keep it and add the prefix.
 *                     → `/en/services`
 *
 *   `/de/services`: a language we do not publish. Drop the language, keep the
 *                     page, so a German speaker lands on the page they wanted
 *                     in a language we do have. → `/en/services`
 *
 * Sending both to the home page instead, which is what a naive redirect does,
 * loses the destination in each case.
 *
 * The CloudFront Function applies the same rule to every request, with a 301
 * (infrastructure/terraform/functions/viewer-request.js, held to this
 * function by scripts/viewer-request.test.mjs), so in production only the dev
 * server's pages and in-app navigations reach `LocaleLayout`'s use of it.
 */
export const fallbackPath = (pathname: string, locale: LocaleCode = DEFAULT_LOCALE): string => {
  const segments = pathname.split('/').filter(Boolean)
  const [first] = segments

  const remainder =
    first !== undefined && LOCALE_SHAPED.test(first) ? segments.slice(1) : segments

  return localePath(remainder.length === 0 ? '/' : `/${remainder.join('/')}`, locale)
}

/**
 * The language to send the bare root to: the one i18next detected from storage
 * or the browser, when it is one the site publishes, else the default.
 */
export const rootLocale = (resolvedLanguage: string | undefined): LocaleCode =>
  isLocaleCode(resolvedLanguage) ? resolvedLanguage : DEFAULT_LOCALE

/**
 * One spelling per page: a single leading slash, no trailing slash, no
 * `/index.html`.
 *
 * The edge answers every other spelling with a 301 to this one
 * (viewer-request.js), but the dev server, and any host that serves a page's
 * file at `/lv/about/` or `/lv/about/index.html`, gives the browser the right
 * page's markup at the wrong address. Backslashes count as slashes, as they
 * do to the browser's URL parser. Repeated leading slashes are collapsed first:
 * `//evil.com` is a scheme-relative URL, and `history.replaceState` throws on
 * one that names another origin.
 */
const canonicalPathname = (pathname: string): string => {
  const single = `/${pathname.replace(/\\/g, '/').replace(/^\/+/, '')}`
  const bare = single.replace(/\/+$/, '').replace(/\/index\.html$/, '').replace(/\/+$/, '')
  return bare === '' ? '/' : bare
}

/**
 * The address a page load should be at before React starts, or null when it
 * already is.
 *
 * - The address is spelled one way (`canonicalPathname`): `/lv/about/` and
 *   `/lv/about/index.html` are `/lv/about`. The router's matching does not
 *   treat them as the same URL, so hydrating the page at another spelling
 *   would not match the markup it was built with, and at `/index.html` the
 *   router would find no route at all and show the 404.
 * - The bare `/` of a multi-locale site (and `/index.html`) goes to the
 *   visitor's language, the decision `RootRedirect` makes for an in-app
 *   navigation. `public/theme-init.js` makes it earlier still, before the
 *   first paint, for a language other than the default.
 *
 * The result always starts with exactly one slash, so it can only ever name
 * a path on this origin.
 *
 * `main.tsx` applies this with `history.replaceState`, so the prerendered
 * page can be hydrated rather than replaced.
 */
export const startupRedirect = (pathname: string, resolvedLanguage: string | undefined): string | null => {
  const canonical = canonicalPathname(pathname)
  if (isPrefixed() && canonical === '/') return localePath('/', rootLocale(resolvedLanguage))
  return canonical === pathname ? null : canonical
}
