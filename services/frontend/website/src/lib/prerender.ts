import { DEFAULT_LOCALE, LOCALES, ROUTES, type LocaleCode } from '@/config/site'
import type { DeclaredPage } from '@/lib/crawler-files'
import { alternatesOf, canonicalOf, escapeHtml, headHtml, metaContent, type PageHead } from '@/lib/head'
import { isLocaleCode, isPrefixed, localeFromPath, localePath, startupRedirect, stripLocale } from '@/lib/locale-path'

/**
 * Which pages the build prerenders, where each one is written, how the
 * browser recognises one, and what makes one fit to ship.
 *
 * Pure: `entry-server.tsx` renders, `scripts/prerender.mjs` reads and writes
 * the files, and everything that decides anything is here, where it can be
 * tested without a build.
 */

/**
 * Set twice in every prerendered page. On `#root`, naming the page it holds,
 * which `main.tsx` hydrates only when it matches the address. On `<html>`,
 * empty, marking the document as one the build wrote: `public/theme-init.js`
 * hides a page served in another language than its address only then, so the
 * dev server's `index.html`, which is always `lang="en"`, is never hidden.
 */
export const PRERENDER_ATTR = 'data-prerendered'

/**
 * Set on `<html>` by `public/theme-init.js` when it has already sent the page
 * to another address (the bare root, to the visitor's language). React does
 * not start on a page that is on its way out.
 */
export const REDIRECTING_ATTR = 'data-redirecting'

/**
 * The route the 404 page is rendered at: one no route matches, so the router
 * shows the not-found page exactly as it would for a mistyped URL.
 */
export const NOT_FOUND_PROBE = '/404'

/** CloudFront answers every missing key with this file and a real 404 status. */
export const NOT_FOUND_FILE = '404.html'

export interface PrerenderPage {
  /** What `#root` is marked with. `main.tsx` hydrates only when it matches the URL. */
  readonly key: string
  /** The URL the router renders. */
  readonly url: string
  readonly locale: LocaleCode
  /** The route it renders, or null for the 404 page. */
  readonly route: string | null
  /** Where the HTML is written, relative to `dist/`. */
  readonly files: readonly string[]
}

/** What rendering one page produced. */
export interface RenderedPage {
  /** The HTML inside `#root`. */
  readonly body: string
  /** What the page's `<Seo>` computed, or null when it rendered none. */
  readonly head: PageHead | null
}

const ROUTE_LIST: readonly string[] = Object.values(ROUTES)

export const pageKey = (locale: LocaleCode, route: string | null): string => `${locale}:${route ?? '404'}`

/** `/en/about` is `en/about/index.html`, `/` is `index.html`. */
export const fileForUrl = (url: string): string => {
  const trimmed = url.replace(/^\/+|\/+$/g, '')
  return trimmed === '' ? 'index.html' : `${trimmed}/index.html`
}

/**
 * Every route in every locale, plus the 404 page.
 *
 * The bare `/` of a multi-locale site has no page of its own: it is the
 * default locale's home page, written a second time as `index.html`. A crawler
 * gets a real page with a canonical pointing at `/<default>`; a browser is
 * sent on to the visitor's own language before the first paint
 * (`public/theme-init.js`), or, for the default language, has its address
 * moved before React starts (`startupPlan`).
 */
export const prerenderPages = (): readonly PrerenderPage[] => {
  const pages = LOCALES.flatMap(({ code }) =>
    ROUTE_LIST.map((route): PrerenderPage => {
      const url = localePath(route, code)
      const isRoot = isPrefixed() && route === ROUTES.home && code === DEFAULT_LOCALE
      return {
        key: pageKey(code, route),
        url,
        locale: code,
        route,
        files: isRoot ? [fileForUrl(url), 'index.html'] : [fileForUrl(url)],
      }
    }),
  )

  const notFound: PrerenderPage = {
    key: pageKey(DEFAULT_LOCALE, null),
    url: localePath(NOT_FOUND_PROBE, DEFAULT_LOCALE),
    locale: DEFAULT_LOCALE,
    route: null,
    files: [NOT_FOUND_FILE],
  }

  return [...pages, notFound]
}

/**
 * The key of the page a browser at `pathname` would render, or null when that
 * URL renders no prerendered page at all: the bare root and an unknown
 * language, which both redirect.
 *
 * `main.tsx` hydrates only when this equals the key on `#root`. Anything else
 * (the default-language 404 page served for `/lv/nope`) is rendered from
 * scratch, because hydrating markup for a different page is a mismatch.
 */
export const keyForPathname = (pathname: string): string | null => {
  if (isPrefixed()) {
    const [first] = pathname.split('/').filter(Boolean)
    if (!isLocaleCode(first)) return null
  }

  const stripped = stripLocale(pathname)
  const route = stripped.length > 1 ? stripped.replace(/\/+$/, '') || '/' : '/'
  return pageKey(localeFromPath(pathname), ROUTE_LIST.includes(route) ? route : null)
}

/** What `main.tsx` does with a page load. */
export type StartupPlan =
  | { readonly mount: false }
  | {
      readonly mount: true
      /** Where `history.replaceState` moves the address first, or null. */
      readonly address: string | null
      /** Whether `#root` holds this address's page, so it can be hydrated. */
      readonly hydrate: boolean
    }

export interface StartupInput {
  readonly pathname: string
  /** What i18next detected: decides where the bare root goes. */
  readonly resolvedLanguage: string | undefined
  /** `#root`'s `PRERENDER_ATTR`, or null on a page that has none. */
  readonly prerendered: string | null
  /** Whether `<html>` carries `REDIRECTING_ATTR`. */
  readonly redirecting: boolean
}

/**
 * The browser's first decision, before React starts.
 *
 * - A page `theme-init.js` is already sending elsewhere is left alone.
 * - Otherwise the address is moved to its one spelling (`startupRedirect`),
 *   and the page is hydrated when `#root` holds the page that address
 *   renders, or rendered from scratch when it does not: the dev server's
 *   empty `#root`, the default-language 404 page served for `/lv/nope`.
 */
export const startupPlan = ({ pathname, resolvedLanguage, prerendered, redirecting }: StartupInput): StartupPlan => {
  if (redirecting) return { mount: false }
  const address = startupRedirect(pathname, resolvedLanguage)
  return { mount: true, address, hydrate: prerendered !== null && prerendered === keyForPathname(address ?? pathname) }
}

const TITLE = /<title>[^<]*<\/title>/
const COMMENT = /\n?[ \t]*<!--[\s\S]*?-->/g
const BLANK_LINES = /\n(?:[ \t]*\n)+/g
const MARKED = /\n?[ \t]*<(?:meta|link)\b[^>]*\sdata-seo\b[^>]*>/g
const HTML_LANG = /<html lang="[^"]*">/
const EMPTY_ROOT = '<div id="root"></div>'

/**
 * One page's HTML: the built `index.html` with this page's language, head and
 * body put in, and `<html>` marked as prerendered (`PRERENDER_ATTR`).
 *
 * The template's own `data-seo` tags (the home page's, for development) are
 * removed and this page's head goes where its `<title>` was. The replacements
 * are functions, not strings, because a `$&` in page copy would otherwise be
 * read as a replacement pattern.
 */
export const pageDocument = (template: string, page: PrerenderPage, rendered: RenderedPage): string => {
  if (rendered.head === null) throw new Error(`${page.url}: rendered no <Seo>, so there is no head to write`)
  if (!template.includes(EMPTY_ROOT)) {
    throw new Error(`the template has no empty ${EMPTY_ROOT}: is dist/index.html already prerendered? Run vite build first.`)
  }
  if (!TITLE.test(template) || !HTML_LANG.test(template)) {
    throw new Error('the template has no <title> or no <html lang>: index.html is not the file this expects')
  }

  const head = rendered.head
  const root = `<div id="root" ${PRERENDER_ATTR}="${escapeHtml(page.key)}">${rendered.body}</div>`
  const [top = '', bottom = ''] = template.split('</head>')

  // The template's comments are notes for whoever edits index.html, and
  // would ship in every page. Only the head's: in the body, React's own
  // comment markers are what hydration walks.
  const pageTop = top
    .replace(HTML_LANG, () => `<html lang="${escapeHtml(head.lang)}" ${PRERENDER_ATTR}>`)
    .replace(COMMENT, '')
    .replace(MARKED, '')
    .replace(BLANK_LINES, '\n')
    .replace(TITLE, () => headHtml(head))

  return `${pageTop}</head>${bottom.replace(EMPTY_ROOT, () => root)}`
}

const countOf = (pattern: RegExp, text: string): number => (text.match(pattern) ?? []).length

const bodyProblems = (body: string): readonly string[] => {
  const h1s = countOf(/<h1[\s>]/g, body)
  return [
    ...(body.trim() === '' ? ['rendered an empty #root'] : []),
    ...(h1s !== 1 ? [`has ${h1s} <h1> elements, not exactly one`] : []),
    ...(/<script\b/i.test(body) ? ['has a <script> in its body, which the CSP (script-src self) would block'] : []),
  ]
}

const notFoundProblems = (head: PageHead): readonly string[] => [
  ...(!(metaContent(head, 'robots') ?? '').includes('noindex') ? ['is the 404 page but is not noindex'] : []),
  ...(canonicalOf(head) !== null ? ['is the 404 page but declares a canonical'] : []),
]

/**
 * A page's canonical is its own URL, or its language's home page: the one
 * other answer a style may give, when every route renders the same document
 * (`long-scroll`). Anything else (another language, another origin, a relative
 * URL on a build that has an origin, two canonicals, none) is wrong.
 */
const addressProblems = (page: PrerenderPage, route: string, head: PageHead, siteUrl: string): readonly string[] => {
  const own = `${siteUrl}${localePath(route, page.locale)}`
  const allowed = [own, `${siteUrl}${localePath(ROUTES.home, page.locale)}`]
  const canonical = canonicalOf(head)
  const image = metaContent(head, 'og:image') ?? ''
  const hrefLangs = head.tags.flatMap((tag) => (tag.kind === 'link' && tag.rel === 'alternate' ? [tag.hrefLang] : []))
  const missingLangs = [...LOCALES.map((locale) => locale.htmlLang), 'x-default'].filter(
    (lang) => !hrefLangs.includes(lang),
  )

  return [
    ...((metaContent(head, 'robots') ?? '').includes('noindex') ? ['is noindex'] : []),
    ...(canonical === null ? ['declares no canonical, or more than one'] : []),
    ...(canonical !== null && !allowed.includes(canonical) ? [`declares canonical ${canonical}, expected ${own}`] : []),
    ...(metaContent(head, 'og:url') !== canonical ? ['has an og:url that is not its canonical'] : []),
    ...(siteUrl !== '' && !image.startsWith(`${siteUrl}/`) ? [`has og:image ${image}, not an absolute URL on ${siteUrl}`] : []),
    ...(missingLangs.length > 0 ? [`has no hreflang alternate for ${missingLangs.join(', ')}`] : []),
  ]
}

/**
 * Why a rendered page must not ship, or an empty list when it may.
 *
 * `siteUrl` is the origin the build was given (`VITE_SITE_URL`), or empty,
 * in which case every URL in the head is root-relative and that is expected.
 */
export const validatePage = (page: PrerenderPage, rendered: RenderedPage, siteUrl: string): readonly string[] => {
  const { body, head } = rendered
  if (head === null) return [...bodyProblems(body), 'rendered no <Seo>, so it has no title, description or canonical']

  const lang = LOCALES.find((locale) => locale.code === page.locale)?.htmlLang
  const common = [
    ...bodyProblems(body),
    ...(head.title.trim() === '' ? ['has an empty title'] : []),
    ...((metaContent(head, 'description') ?? '').trim() === '' ? ['has no description'] : []),
    ...(head.lang !== lang ? [`declares lang "${head.lang}", expected "${lang ?? page.locale}"`] : []),
  ]

  return page.route === null
    ? [...common, ...notFoundProblems(head)]
    : [...common, ...addressProblems(page, page.route, head, siteUrl)]
}

/**
 * What the rendered pages declare about their own addresses, for the crawler
 * files: each page with a route, its absolute URL, the canonical its head
 * names and the `hreflang` alternates it lists. The 404 page, and a page that
 * declares no canonical (which `validatePage` has already refused), are not
 * pages a crawler is sent to.
 */
export const declaredPages = (
  rendered: ReadonlyArray<{ readonly page: PrerenderPage; readonly head: PageHead | null }>,
  siteUrl: string,
): readonly DeclaredPage[] =>
  rendered.flatMap(({ page, head }) => {
    const canonical = head === null ? null : canonicalOf(head)
    if (page.route === null || head === null || canonical === null) return []
    return [
      {
        route: page.route,
        locale: page.locale,
        url: `${siteUrl}${page.url}`,
        canonical,
        alternates: alternatesOf(head),
      },
    ]
  })
