import { robotsTxt, sitemapXml, type SitemapAlternate } from './crawlers'
import { PAGE_META, llmsTxt, pageText, siteFacts, type LlmsLink } from './llms'

/**
 * The three files crawlers fetch by name: robots.txt, sitemap.xml and
 * llms.txt, from the site config, the locale files, and what every
 * prerendered page declares in its head.
 *
 * The pages decide which URLs are listed and how they are tied together,
 * because a page is the only thing that knows its own canonical: a style may
 * render one document at several routes (`long-scroll`), and then only the
 * URL those routes name as canonical is a page a crawler should be sent to.
 * Listing the others would name a URL whose page says "not me, that one", and
 * give it `hreflang` alternates the page itself does not claim.
 *
 * The prerender (`entry-server.tsx`, run by `scripts/prerender.mjs`) calls it
 * with the heads it has just rendered, and `entry-server.test.tsx` does the
 * same for every style and holds the result to those heads. Relative imports
 * only, like the modules it assembles.
 */

type SiteConfig = Pick<
  typeof import('../config/site'),
  'SITE' | 'CONTACT' | 'COMPANY' | 'LOCALES' | 'ROUTES' | 'LEGAL_LINKS' | 'DEFAULT_LOCALE' | 'activeSocial'
>

type RouteKey = keyof SiteConfig['ROUTES']

/** Returns the parsed JSON of one namespace in one locale. */
export type NamespaceReader = (locale: string, namespace: string) => unknown

/** What one prerendered page declares about its own address, from its head. */
export interface DeclaredPage {
  /** The route without the language: `/about`. */
  readonly route: string
  readonly locale: string
  /** The absolute URL the page is served at. */
  readonly url: string
  /** The canonical URL its head declares. */
  readonly canonical: string
  /** Its `hreflang` alternates, as its head declares them. */
  readonly alternates: readonly SitemapAlternate[]
}

// Every route needs a title and a description for llms.txt. A route added to
// ROUTES without one here is a type error, not a silent gap in the file.
const META: Record<RouteKey, { readonly ns: string; readonly key: string }> = PAGE_META

/**
 * The pages a crawler is sent to: each that is its own canonical. Throws when
 * a page names a canonical that no page claims as its own, because a sitemap
 * that left it out would never lead a crawler to it.
 */
const canonicalPages = (pages: readonly DeclaredPage[]): readonly DeclaredPage[] => {
  const listed = pages.filter((page) => page.canonical === page.url)
  const orphans = pages.filter((page) => !listed.some((own) => own.url === page.canonical))
  if (orphans.length > 0) {
    throw new Error(
      orphans.map((page) => `${page.url} declares canonical ${page.canonical}, which no page declares as its own`).join('\n'),
    )
  }
  return listed
}

export const crawlerFiles = ({
  siteUrl,
  site,
  read,
  pages,
}: {
  readonly siteUrl: string
  readonly site: SiteConfig
  readonly read: NamespaceReader
  /** Every prerendered page with a route: not the 404. */
  readonly pages: readonly DeclaredPage[]
}): ReadonlyArray<readonly [fileName: string, source: string]> => {
  const { SITE, CONTACT, COMPANY, LOCALES, ROUTES, LEGAL_LINKS, DEFAULT_LOCALE } = site
  const routeKeys = Object.keys(ROUTES) as RouteKey[]
  const legalRoutes: readonly string[] = LEGAL_LINKS.map((entry) => entry.to)
  const isLegal = (key: RouteKey) => legalRoutes.includes(ROUTES[key])
  const listed = canonicalPages(pages)
  const listedAt = (key: RouteKey, locale: string) =>
    listed.find((page) => page.route === ROUTES[key] && page.locale === locale)

  const textOf = (locale: string, key: RouteKey) =>
    pageText(read(locale, META[key].ns), META[key].key, `${locale}/${META[key].ns}.json`)

  const links = (keys: readonly RouteKey[]): LlmsLink[] =>
    LOCALES.flatMap((locale) =>
      keys.flatMap((key) => {
        const page = listedAt(key, locale.code)
        if (page === undefined) return []
        const text = textOf(locale.code, key)
        const language = LOCALES.length > 1 ? ` (${locale.label})` : ''
        return [{ title: `${text.title}${language}`, description: text.description, url: page.canonical }]
      }),
    )

  const llms = llmsTxt({
    brand: SITE.name,
    summary: textOf(DEFAULT_LOCALE, 'home').description,
    facts: siteFacts({
      brand: SITE.name,
      country: CONTACT.address.country || SITE.country,
      languages: LOCALES.map((locale) => locale.label),
      legalName: COMPANY.legalName,
      registrationNumber: COMPANY.registrationNumber,
      vatNumber: COMPANY.vatNumber,
      registeredAddress: COMPANY.registeredAddress,
      email: CONTACT.email,
      phone: CONTACT.phone,
      profiles: site.activeSocial().map(([, url]) => url),
    }),
    pages: links(routeKeys.filter((key) => !isLegal(key))),
    optional: links(routeKeys.filter(isLegal)),
  })

  // Route by route, each in every language: the order the sitemap has always had.
  const sitemapPages = routeKeys.flatMap((key) =>
    LOCALES.flatMap((locale) => {
      const page = listedAt(key, locale.code)
      return page === undefined ? [] : [{ loc: page.canonical, alternates: page.alternates, route: page.route }]
    }),
  )

  return [
    ['robots.txt', robotsTxt({ siteUrl })],
    ['sitemap.xml', sitemapXml({ siteUrl, pages: sitemapPages, legalRoutes })],
    ['llms.txt', llms],
  ]
}
