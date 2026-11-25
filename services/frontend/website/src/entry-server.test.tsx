import { beforeAll, describe, it, expect } from 'vitest'

import { DEFAULT_LOCALE } from '@/config/site'
import { canonicalOf, type PageHead } from '@/lib/head'
import type { PrerenderPage, RenderedPage } from '@/lib/prerender'
import { crawlerFilesFor, prerenderPages, renderPage, siteOrigin, validatePage } from './entry-server'

/**
 * The prerender, for the active style.
 *
 * Every page the build writes is rendered here exactly as the build renders
 * it, and put through the same checks the build fails on, so a page that would
 * break the build breaks the test suite first. Whether the browser can hydrate
 * the result is `hydration.test.tsx`'s question.
 *
 * `make verify-styles` runs this file against every style.
 */

const pages = prerenderPages()
const page = (key: string) => pages.find((candidate) => candidate.key === key) as PrerenderPage

// One render per page, shared by the tests below. Sequential by construction:
// a render switches the app's one i18next instance to the page's language.
const renders = new Map<string, RenderedPage>()
const render = async (candidate: PrerenderPage): Promise<RenderedPage> => {
  const cached = renders.get(candidate.key)
  if (cached !== undefined) return cached
  const rendered = await renderPage(candidate)
  renders.set(candidate.key, rendered)
  return rendered
}

describe('prerendering every page', () => {
  it.each(pages.map((candidate) => [candidate.key, candidate] as const))(
    '%s renders and passes the build checks',
    async (_key, candidate) => {
      const rendered = await render(candidate)
      expect(validatePage(candidate, rendered, siteOrigin())).toEqual([])
    },
  )

  it('renders in Latvian, the one language', async () => {
    const about = await renderPage(page('lv:/par-projektu'))
    expect(about.head?.lang).toBe('lv')
    expect(about.body).toMatch(/[āčēģīķļņšūž]/i)
  })

  it('waits for the lazy pages instead of shipping their blank fallback', async () => {
    const privacy = await renderPage(page('lv:/legal/privacy'))
    expect(privacy.body).toMatch(/<h1[^>]*>Privātuma politika<\/h1>/)
    const map = await renderPage(page('lv:/'))
    expect(map.body).toMatch(/<h1[^>]*>Labdarības karte<\/h1>/)
  })

  it('renders the not-found page for the 404 file', async () => {
    const { body, head } = await renderPage(page(`${DEFAULT_LOCALE}:404`))
    expect(body).toContain('Lapa nav atrasta')
    expect(head?.tags).toContainEqual(expect.objectContaining({ key: 'robots', content: 'noindex, nofollow' }))
  })
})

/**
 * sitemap.xml and llms.txt, against what the pages themselves declare.
 *
 * A sitemap that names a URL whose page declares a different canonical, or
 * ties it to translations the page does not claim, sends a search engine two
 * contradictory answers. Every style is held to it, including one whose routes
 * all render one document (`long-scroll`).
 */
type Alternates = Readonly<Record<string, string>>

const alternatesOf = (head: PageHead | null): Alternates =>
  Object.fromEntries(
    (head?.tags ?? []).flatMap((tag) =>
      tag.kind === 'link' && tag.rel === 'alternate' && tag.hrefLang !== undefined ? [[tag.hrefLang, tag.href]] : [],
    ),
  )

const sitemapEntries = (xml: string): ReadonlyArray<{ loc: string; alternates: Alternates }> =>
  xml
    .split('<url>')
    .slice(1)
    .map((block) => ({
      loc: block.match(/<loc>([^<]+)<\/loc>/)?.[1] ?? '',
      alternates: Object.fromEntries(
        [...block.matchAll(/hreflang="([^"]+)" href="([^"]+)"/g)].map(([, lang, href]) => [lang, href]),
      ),
    }))

const llmsUrls = (text: string): readonly string[] => [...text.matchAll(/^- \[[^\]]+\]\(([^)]+)\)/gm)].map(([, url]) => url ?? '')

describe('the crawler files agree with the pages', () => {
  const origin = siteOrigin()
  let declared: ReadonlyArray<{ own: string; canonical: string | null; alternates: Alternates }> = []
  let files = new Map<string, string>()
  let sitemap: ReturnType<typeof sitemapEntries> = []
  let locs: readonly string[] = []
  const byOwnUrl = () => new Map(declared.map((entry) => [entry.own, entry]))

  beforeAll(async () => {
    const heads = []
    for (const candidate of pages) heads.push({ page: candidate, head: (await render(candidate)).head })
    declared = heads
      .filter(({ page: candidate }) => candidate.route !== null)
      .map(({ page: candidate, head }) => ({
        own: `${origin}${candidate.url}`,
        canonical: head === null ? null : canonicalOf(head),
        alternates: alternatesOf(head),
      }))
    // Exactly what the build does with them (scripts/prerender.mjs).
    files = new Map(crawlerFilesFor(origin, heads))
    sitemap = sitemapEntries(files.get('sitemap.xml') ?? '')
    locs = sitemap.map((entry) => entry.loc)
  })

  it('lists each URL once', () => {
    expect(locs.length).toBeGreaterThan(0)
    expect(new Set(locs).size).toBe(locs.length)
  })

  it('lists only URLs whose page declares itself canonical', () => {
    const pagesByUrl = byOwnUrl()
    expect(locs.filter((loc) => pagesByUrl.get(loc)?.canonical !== loc)).toEqual([])
  })

  it('lists every canonical any page declares', () => {
    const canonicals = [...new Set(declared.map((entry) => entry.canonical))]
    expect(canonicals.filter((canonical) => canonical === null || !locs.includes(canonical))).toEqual([])
  })

  it('ties each URL to exactly the hreflang alternates its page declares, x-default included', () => {
    const pagesByUrl = byOwnUrl()
    for (const entry of sitemap) {
      expect(entry.alternates, entry.loc).toEqual(pagesByUrl.get(entry.loc)?.alternates)
    }
  })

  it('links llms.txt to each canonical page once, and to nothing else', () => {
    const urls = llmsUrls(files.get('llms.txt') ?? '')
    const canonicals = [...new Set(declared.map((entry) => entry.canonical))]
    expect(new Set(urls).size).toBe(urls.length)
    expect([...urls].sort()).toEqual(canonicals.sort())
  })
})
