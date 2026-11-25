import { mkdtempSync, readFileSync, existsSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, it, expect } from 'vitest'

import { prerender } from './prerender.mjs'

/**
 * The file handling around the prerender. What gets rendered and what counts
 * as fit to ship are src/lib/prerender.ts's, and tested there; here `ssr` is a
 * stand-in for the compiled entry-server module.
 */
const PAGES = [
  { key: 'en:/', url: '/en', locale: 'en', route: '/', files: ['en/index.html', 'index.html'] },
  { key: 'lv:/about', url: '/lv/about', locale: 'lv', route: '/about', files: ['lv/about/index.html'] },
]

const fakeSsr = ({ problemsFor = () => [], throwFor = null, origin = 'https://www.example.lv', crawlerFilesFor } = {}) => ({
  siteOrigin: () => origin,
  prerenderPages: () => PAGES,
  renderPage: async (page) => {
    if (page.url === throwFor) throw new Error('the page threw')
    return { body: `<h1>${page.url}</h1>`, head: { title: page.url } }
  },
  validatePage: (page) => problemsFor(page),
  pageDocument: (template, page, rendered) => template.replace('<div id="root"></div>', `<div id="root">${rendered.body}</div>`),
  // Names each page with the head it was given, so a test can see what reached it.
  crawlerFilesFor:
    crawlerFilesFor ??
    ((siteUrl, rendered) => [
      ['robots.txt', `Sitemap: ${siteUrl}/sitemap.xml`],
      ['sitemap.xml', rendered.map(({ page, head }) => `${page.url}=${head?.title ?? 'none'}`).join(' ')],
      ['llms.txt', '# Site'],
    ]),
})

let dist = ''
const TEMPLATE = '<html><body><div id="root"></div></body></html>'

beforeEach(() => {
  dist = mkdtempSync(join(tmpdir(), 'prerender-'))
  writeFileSync(join(dist, 'index.html'), TEMPLATE)
})

afterEach(() => rmSync(dist, { recursive: true, force: true }))

describe('prerender', () => {
  it('writes every page to each of its files', async () => {
    const result = await prerender({ distDir: dist, ssr: fakeSsr() })

    expect(result.ok).toBe(true)
    expect(result.written).toEqual(['en/index.html', 'index.html', 'lv/about/index.html'])
    expect(readFileSync(join(dist, 'lv/about/index.html'), 'utf8')).toContain('<h1>/lv/about</h1>')
    expect(readFileSync(join(dist, 'index.html'), 'utf8')).toContain('<h1>/en</h1>')
  })

  it('writes nothing when one page fails its checks, and says which and why', async () => {
    const ssr = fakeSsr({ problemsFor: (page) => (page.url === '/lv/about' ? ['has 0 <h1> elements'] : []) })
    const result = await prerender({ distDir: dist, ssr })

    expect(result.ok).toBe(false)
    expect(result.failures).toEqual(['/lv/about: has 0 <h1> elements'])
    expect(existsSync(join(dist, 'en/index.html'))).toBe(false)
    expect(readFileSync(join(dist, 'index.html'), 'utf8')).toBe(TEMPLATE)
  })

  it('reports a page that throws instead of crashing on it', async () => {
    const result = await prerender({ distDir: dist, ssr: fakeSsr({ throwFor: '/en' }) })

    expect(result.ok).toBe(false)
    expect(result.failures).toHaveLength(1)
    expect(result.failures[0]).toMatch(/^\/en: .*the page threw/)
  })

  it('reports the origin the pages were built for', async () => {
    expect((await prerender({ distDir: dist, ssr: fakeSsr() })).siteUrl).toBe('https://www.example.lv')
  })
})

describe('prerender, the crawler files', () => {
  it('writes robots.txt, sitemap.xml and llms.txt from the heads of every page it rendered', async () => {
    const result = await prerender({ distDir: dist, ssr: fakeSsr() })

    expect(result.ok).toBe(true)
    expect(result.crawlerFiles).toEqual(['robots.txt', 'sitemap.xml', 'llms.txt'])
    expect(readFileSync(join(dist, 'sitemap.xml'), 'utf8')).toBe('/en=/en /lv/about=/lv/about')
    expect(readFileSync(join(dist, 'robots.txt'), 'utf8')).toBe('Sitemap: https://www.example.lv/sitemap.xml')
    expect(result.written).toEqual(['en/index.html', 'index.html', 'lv/about/index.html'])
  })

  it('writes none without an origin, leaving the committed robots.txt in place', async () => {
    writeFileSync(join(dist, 'robots.txt'), 'committed')
    const result = await prerender({ distDir: dist, ssr: fakeSsr({ origin: '' }) })

    expect(result.ok).toBe(true)
    expect(result.crawlerFiles).toEqual([])
    expect(existsSync(join(dist, 'sitemap.xml'))).toBe(false)
    expect(readFileSync(join(dist, 'robots.txt'), 'utf8')).toBe('committed')
  })

  it('writes nothing at all when the heads cannot make a sitemap, and says why', async () => {
    const crawlerFilesFor = () => {
      throw new Error('/en/about declares canonical /en, which no page declares as its own')
    }
    const result = await prerender({ distDir: dist, ssr: fakeSsr({ crawlerFilesFor }) })

    expect(result.ok).toBe(false)
    expect(result.failures).toHaveLength(1)
    expect(result.failures[0]).toMatch(/^crawler files: .*which no page declares as its own/)
    expect(existsSync(join(dist, 'en/index.html'))).toBe(false)
    expect(existsSync(join(dist, 'sitemap.xml'))).toBe(false)
  })
})
