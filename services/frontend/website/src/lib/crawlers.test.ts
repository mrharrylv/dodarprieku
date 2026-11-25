import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, it, expect } from 'vitest'

import { CRAWLER_GROUPS, robotsTxt, sitemapXml, type SitemapPage } from './crawlers'

const SITE_URL = 'https://www.hagroup.lv'

/** robots.txt as groups of `User-agent` lines and the rules after them. */
const parseRobots = (text: string) =>
  text
    .split(/\n\s*\n/)
    .map((block) => block.split('\n').filter((line) => line.trim() !== '' && !line.startsWith('#')))
    .filter((lines) => lines.length > 0)

describe('robotsTxt', () => {
  const text = robotsTxt({ siteUrl: SITE_URL })
  const groups = parseRobots(text)

  it.each([
    'Googlebot',
    'Bingbot',
    'OAI-SearchBot',
    'GPTBot',
    'ChatGPT-User',
    'ClaudeBot',
    'Claude-SearchBot',
    'Claude-User',
    'PerplexityBot',
    'Google-Extended',
    'Applebot-Extended',
    'CCBot',
    '*',
  ])('names %s in a group that allows everything and disallows nothing', (agent) => {
    const group = groups.find((lines) => lines.includes(`User-agent: ${agent}`))
    expect(group).toBeDefined()
    expect(group).toContain('Allow: /')
    expect(group?.some((line) => line.startsWith('Disallow'))).toBe(false)
  })

  it('points at the sitemap on the configured origin', () => {
    expect(text).toContain(`Sitemap: ${SITE_URL}/sitemap.xml`)
  })

  it('names no sitemap without an origin, and says why', () => {
    const bare = robotsTxt({ siteUrl: '' })
    expect(bare).not.toMatch(/^Sitemap:/m)
    expect(bare).toMatch(/# No Sitemap line/)
    expect(bare).not.toContain('example.com')
  })

  it('writes Disallow for a group that opts out, and leaves the others alone', () => {
    const optedOut = CRAWLER_GROUPS.map((group) =>
      group.agents.includes('GPTBot') ? { ...group, allow: false } : group,
    )
    const blocks = parseRobots(robotsTxt({ siteUrl: SITE_URL, groups: optedOut }))
    expect(blocks.find((lines) => lines.includes('User-agent: GPTBot'))).toContain('Disallow: /')
    expect(blocks.find((lines) => lines.includes('User-agent: OAI-SearchBot'))).toContain('Allow: /')
  })

  it('names each crawler once', () => {
    const agents = CRAWLER_GROUPS.flatMap((group) => group.agents)
    expect(new Set(agents).size).toBe(agents.length)
  })

  it('is exactly what public/robots.txt holds, so the committed fallback cannot drift', () => {
    const committed = readFileSync(join(__dirname, '..', '..', 'public', 'robots.txt'), 'utf8')
    expect(committed).toBe(robotsTxt({ siteUrl: '' }))
  })
})

/** A page in three languages, declaring the three plus x-default, as a head does. */
const page = (route: string, locale: string): SitemapPage => {
  const at = (code: string) => `${SITE_URL}/${code}${route === '/' ? '' : route}`
  return {
    loc: at(locale),
    alternates: [
      ...['en', 'lv', 'ru'].map((code) => ({ hrefLang: code, href: at(code) })),
      { hrefLang: 'x-default', href: at('lv') },
    ],
    route,
  }
}

describe('sitemapXml', () => {
  const routes = ['/', '/about', '/legal/privacy']
  const pages = routes.flatMap((route) => ['en', 'lv', 'ru'].map((locale) => page(route, locale)))
  const xml = sitemapXml({ siteUrl: SITE_URL, pages, legalRoutes: ['/legal/privacy'] })
  const entryFor = (loc: string) => xml.split('<url>').find((block) => block.includes(`<loc>${loc}</loc>`)) ?? ''

  it('lists each page it is given, once, in the order given', () => {
    expect(xml.match(/<url>/g)).toHaveLength(pages.length)
    expect([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, loc]) => loc)).toEqual(pages.map((entry) => entry.loc))
  })

  it("ties each URL to exactly the alternates its page declares, x-default included", () => {
    const entry = entryFor(`${SITE_URL}/ru/about`)
    const declared = [...entry.matchAll(/hreflang="([^"]+)" href="([^"]+)"/g)].map(([, hrefLang, href]) => ({ hrefLang, href }))
    expect(declared).toEqual(page('/about', 'ru').alternates)
    expect(entry).toContain(`hreflang="x-default" href="${SITE_URL}/lv/about"`)
  })

  it('ranks the home page first and legal pages last', () => {
    const priorityOf = (loc: string) => entryFor(loc).match(/<priority>([\d.]+)</)?.[1]
    expect(priorityOf(`${SITE_URL}/en`)).toBe('1.0')
    expect(priorityOf(`${SITE_URL}/en/about`)).toBe('0.8')
    expect(priorityOf(`${SITE_URL}/en/legal/privacy`)).toBe('0.3')
  })

  it('claims no modification date it cannot know', () => {
    expect(xml).not.toContain('<lastmod>')
  })

  it('writes no alternates for a page that declares none', () => {
    const single = sitemapXml({ siteUrl: SITE_URL, pages: [{ loc: `${SITE_URL}/`, alternates: [], route: '/' }] })
    expect(single).toContain(`<loc>${SITE_URL}/</loc>`)
    expect(single).not.toContain('xhtml:link')
  })

  it('escapes what XML needs escaped', () => {
    const odd = sitemapXml({ siteUrl: SITE_URL, pages: [{ loc: `${SITE_URL}/a&b`, alternates: [], route: '/a&b' }] })
    expect(odd).toContain(`<loc>${SITE_URL}/a&amp;b</loc>`)
  })

  it('refuses a relative, empty or trailing-slash origin, and an empty site', () => {
    for (const siteUrl of ['', '/en', 'www.hagroup.lv', `${SITE_URL}/`]) {
      expect(() => sitemapXml({ siteUrl, pages })).toThrow(/absolute origin/)
    }
    expect(() => sitemapXml({ siteUrl: SITE_URL, pages: [] })).toThrow(/no pages/)
  })

  it('refuses a URL, or an alternate, on another origin', () => {
    const relative = { loc: '/en/about', alternates: [], route: '/about' }
    const elsewhere = { ...page('/about', 'en'), alternates: [{ hrefLang: 'lv', href: 'https://www.hagroup.lv.evil.com/lv/about' }] }
    expect(() => sitemapXml({ siteUrl: SITE_URL, pages: [relative] })).toThrow(/only URLs on https:\/\/www\.hagroup\.lv.*"\/en\/about"/)
    expect(() => sitemapXml({ siteUrl: SITE_URL, pages: [elsewhere] })).toThrow(/evil\.com/)
  })
})
