import { describe, it, expect } from 'vitest'

import * as site from '@/config/site'
import { resources } from '@/i18n'
import { localePath } from '@/lib/locale-path'
import { isPlaceholder, isPlaceholderCopy } from './placeholder'
import { crawlerFiles, type DeclaredPage, type NamespaceReader } from './crawler-files'

/**
 * The call the prerender makes (`crawlerFilesFor` in `entry-server.tsx`),
 * with the bundled locale resources and pages declared the way a head
 * declares them. `entry-server.test.tsx` makes the real call with the real
 * heads, for every style.
 */
const SITE_URL = 'https://www.hagroup.lv'
const { LOCALES, ROUTES, LEGAL_LINKS, DEFAULT_LOCALE } = site

const read: NamespaceReader = (locale, namespace) =>
  (resources as Record<string, Record<string, unknown>>)[locale]?.[namespace]

const at = (route: string, locale: string) => `${SITE_URL}${localePath(route, locale as site.LocaleCode)}`

/** A page at `route` whose head names `canonicalRoute` as its canonical, and that page's alternates. */
const declared = (route: string, locale: string, canonicalRoute = route): DeclaredPage => ({
  route,
  locale,
  url: at(route, locale),
  canonical: at(canonicalRoute, locale),
  alternates: [
    ...LOCALES.map((entry) => ({ hrefLang: entry.htmlLang, href: at(canonicalRoute, entry.code) })),
    { hrefLang: 'x-default', href: at(canonicalRoute, DEFAULT_LOCALE) },
  ],
})

const routes: readonly string[] = Object.values(ROUTES)
const legalRoutes: readonly string[] = LEGAL_LINKS.map((entry) => entry.to)

/** Every route its own page, as most styles render them. */
const EVERY_PAGE = LOCALES.flatMap((locale) => routes.map((route) => declared(route, locale.code)))

/** One document at the four marketing routes, canonical at home, as `long-scroll` renders it. */
const ONE_DOCUMENT = LOCALES.flatMap((locale) =>
  routes.map((route) => declared(route, locale.code, legalRoutes.includes(route) ? route : ROUTES.home)),
)

const build = (pages: readonly DeclaredPage[]) => new Map(crawlerFiles({ siteUrl: SITE_URL, site, read, pages }))
const linksOf = (llms: string) =>
  [...llms.matchAll(/^- \[([^\]]+)\]\(([^)]+)\)(?:: (.+))?$/gm)].map(([, title, url, note]) => ({
    title: title ?? '',
    url: url ?? '',
    note,
  }))
const locsOf = (xml: string) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, loc]) => loc)

const files = build(EVERY_PAGE)
const llms = files.get('llms.txt') ?? ''
const links = linksOf(llms)

describe('crawlerFiles', () => {
  it('writes robots.txt, sitemap.xml and llms.txt', () => {
    expect([...files.keys()]).toEqual(['robots.txt', 'sitemap.xml', 'llms.txt'])
    expect(files.get('robots.txt')).toContain(`Sitemap: ${SITE_URL}/sitemap.xml`)
    expect(files.get('sitemap.xml')?.match(/<url>/g)).toHaveLength(routes.length * LOCALES.length)
  })

  it("heads llms.txt with the brand, and the home page's description once it is real copy", () => {
    const [h1, , summary] = llms.split('\n')
    const description = resources[DEFAULT_LOCALE].home.meta.description
    expect(h1).toBe(`# ${site.SITE.name}`)
    if (isPlaceholderCopy(description)) expect(llms).not.toMatch(/^> /m)
    else expect(summary).toBe(`> ${description}`)
  })

  it('links every page in every language, by its canonical URL', () => {
    expect(links.map((link) => link.url).sort()).toEqual(EVERY_PAGE.map((page) => page.canonical).sort())
  })

  it('puts the legal pages under Optional, after the pages people look for', () => {
    const [pages = '', optional = ''] = llms.split('## Optional')
    for (const route of legalRoutes) expect(optional).toContain(`${localePath(route, 'en')})`)
    for (const route of routes.filter((entry) => !legalRoutes.includes(entry))) {
      expect(pages).toContain(`(${at(route, 'en')})`)
    }
  })

  it("titles each link from the locale's meta, names its language, and notes it only with real copy", () => {
    const lvServices = links.find((link) => link.url === `${SITE_URL}/lv/services`)
    const { title, description } = resources.lv.services.meta
    expect(lvServices?.title).toBe(`${title} (Latviešu)`)
    expect(lvServices?.note).toBe(isPlaceholderCopy(description) ? undefined : description)
    const lvContact = links.find((link) => link.url === `${SITE_URL}/lv/contact`)
    expect(lvContact?.note).toBe(resources.lv.contact.meta.description)
  })

  it('publishes no placeholder contact or company detail', () => {
    const facts = llms.split('\n').find((line) => line.includes(' operates in ')) ?? ''
    for (const value of [site.CONTACT.email, site.CONTACT.phone, site.COMPANY.registrationNumber, site.COMPANY.legalName]) {
      if (isPlaceholder(value)) expect(facts).not.toContain(value)
    }
    expect(llms).not.toMatch(/X{3,}|hello@example\.com|Example street/)
  })

  it("repeats none of the template's instructions", () => {
    const strings = (value: unknown): string[] =>
      typeof value === 'string'
        ? [value]
        : value !== null && typeof value === 'object'
          ? Object.values(value).flatMap(strings)
          : []
    const instructions = strings(resources).filter((text) => text.trim() !== '' && isPlaceholderCopy(text))
    for (const text of instructions) expect(llms).not.toContain(text)
  })

  it('names the file and key when a locale is missing a page title', () => {
    const broken: NamespaceReader = (locale, namespace) => (namespace === 'about' && locale === 'ru' ? {} : read(locale, namespace))
    expect(() => crawlerFiles({ siteUrl: SITE_URL, site, read: broken, pages: EVERY_PAGE })).toThrow(/ru\/about\.json/)
  })
})

describe('crawlerFiles for a style that renders one document at several routes', () => {
  const one = build(ONE_DOCUMENT)
  const canonicals = [...new Set(ONE_DOCUMENT.map((page) => page.canonical))]

  it('lists in the sitemap only the URLs the pages name as canonical', () => {
    expect(locsOf(one.get('sitemap.xml') ?? '').sort()).toEqual([...canonicals].sort())
    expect(one.get('sitemap.xml')).not.toContain(`<loc>${SITE_URL}/lv/services</loc>`)
  })

  it('gives each the alternates its page declares', () => {
    const entry = (one.get('sitemap.xml') ?? '').split('<url>').find((block) => block.includes(`<loc>${SITE_URL}/lv</loc>`)) ?? ''
    for (const alternate of declared(ROUTES.home, 'lv').alternates) {
      expect(entry).toContain(`hreflang="${alternate.hrefLang}" href="${alternate.href}"`)
    }
    expect(entry).not.toContain('/services')
  })

  it('links llms.txt to each canonical page once, and to nothing else', () => {
    expect(linksOf(one.get('llms.txt') ?? '').map((link) => link.url).sort()).toEqual([...canonicals].sort())
  })
})

describe('crawlerFiles refuses', () => {
  it('a canonical that no page declares as its own', () => {
    const astray = [...EVERY_PAGE.filter((page) => page.route !== ROUTES.home), declared(ROUTES.about, 'en', ROUTES.home)]
    expect(() => build(astray)).toThrow(/\/en\/about declares canonical https:\/\/www\.hagroup\.lv\/en, which no page declares as its own/)
  })

  it('an empty site', () => {
    expect(() => build([])).toThrow(/no pages/)
  })
})
