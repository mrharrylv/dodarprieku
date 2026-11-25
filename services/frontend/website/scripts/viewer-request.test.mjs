import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, it, expect } from 'vitest'

import { DEFAULT_LOCALE, LOCALE_CODES } from '@/config/site'
import { fallbackPath } from '@/lib/locale-path'
import { NOT_FOUND_FILE, prerenderPages } from '@/lib/prerender'

/**
 * The CloudFront Function in infrastructure/terraform/functions/, which sends
 * every other spelling of a page's address to that address with a 301, and
 * maps a page's URL to its prerendered file.
 *
 * It lives with the Terraform that deploys it, and is tested here because
 * this is the package with a test runner. The file is evaluated exactly as
 * CloudFront runs it: plain script, one `handler`, no exports.
 */
const SOURCE = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..', 'infrastructure', 'terraform', 'functions', 'viewer-request.js'),
  'utf8',
)

const handler = new Function(`${SOURCE}\nreturn handler`)()

/** CloudFront's own shape: one field per name, duplicates in `multiValue`. */
const UTM = { utm_source: { value: 'x' } }

const viewerRequest = (uri, querystring = UTM) => ({
  version: '1.0',
  context: { eventType: 'viewer-request' },
  viewer: { ip: '192.0.2.1' },
  request: { method: 'GET', uri, querystring, headers: {}, cookies: {} },
})

const answer = (uri, querystring) => handler(viewerRequest(uri, querystring))
const rewrite = (uri) => answer(uri).uri
/** What every 301 tells a browser: keep it for an hour, not for ever. */
const REDIRECT_CACHE = 'public, max-age=3600'

/**
 * The Location of a 301, or null when the function let the request through.
 * Every 301 is checked for its status line and its Cache-Control on the way.
 */
const redirect = (uri, querystring = {}) => {
  const result = answer(uri, querystring)
  if (result.statusCode === undefined) return null
  expect(result.statusCode).toBe(301)
  expect(result.statusDescription).toBe('Moved Permanently')
  expect(result.headers['cache-control'], uri).toEqual({ value: REDIRECT_CACHE })
  return result.headers.location.value
}

const others = LOCALE_CODES.filter((code) => code !== DEFAULT_LOCALE)

describe('viewer-request: the locale list', () => {
  // A language added in site.ts but not here would be redirected to the
  // default language's page; one removed there but left here would keep a
  // URL that no longer has a page.
  it('publishes exactly the languages site.ts does, the default first', () => {
    const list = /var LOCALES = \[([^\]]*)\]/.exec(SOURCE)?.[1] ?? ''
    expect(list.split(',').map((code) => code.trim().replace(/'/g, ''))).toEqual([DEFAULT_LOCALE, ...others])
  })
})

describe('viewer-request: a page at its own address', () => {
  it.each([
    ['/', '/index.html'],
    ['/en', '/en/index.html'],
    ['/lv/about', '/lv/about/index.html'],
    ['/ru/legal/privacy', '/ru/legal/privacy/index.html'],
    ['/en/no-such-page', '/en/no-such-page/index.html'],
  ])('points the page %s at its file %s', (uri, file) => {
    expect(rewrite(uri)).toBe(file)
  })

  it.each([
    `/${NOT_FOUND_FILE}`,
    '/assets/index-Bgo04jES.js',
    '/og-image.png',
    '/favicon.ico',
    '/robots.txt',
    '/sitemap.xml',
    '/llms.txt',
    '/theme-init.js',
    '/site.webmanifest',
    '/.well-known/security.txt',
  ])('leaves the file %s alone', (uri) => {
    expect(rewrite(uri)).toBe(uri)
  })

  it('returns the request, with its query string, rather than answering it', () => {
    const result = answer('/lv')
    expect(result.method).toBe('GET')
    expect(result.querystring).toEqual(UTM)
    expect(result.statusCode).toBeUndefined()
  })

  it('finds the file the build wrote for every page it prerendered', () => {
    for (const page of prerenderPages().filter((candidate) => candidate.route !== null)) {
      expect(rewrite(page.url), page.url).toBe(`/${page.files[0]}`)
    }
  })
})

describe('viewer-request: every other spelling is a 301 to the one address', () => {
  it.each([
    ['//en//about', '/en/about'],
    ['//en/about', '/en/about'],
    ['/en//about', '/en/about'],
    ['/en/about/', '/en/about'],
    ['/en/about//', '/en/about'],
    ['/en/', '/en'],
    ['/en/about/index.html', '/en/about'],
    ['/lv/about/index.html', '/lv/about'],
    ['/en/index.html', '/en'],
    ['/index.html', '/'],
    ['//', '/'],
    ['//index.html', '/'],
    ['/assets//index-Bgo04jES.js', '/assets/index-Bgo04jES.js'],
    ['/og-image.png/', '/og-image.png'],
  ])('%s is %s', (uri, location) => {
    expect(redirect(uri)).toBe(location)
  })

  // Old links and hand-typed ones: the page exists, in the default language.
  // Before the edge did this, these got a 404 status and painted the
  // not-found page until the app redirected them in the browser.
  it.each([
    ['/services', `/${DEFAULT_LOCALE}/services`],
    ['/about', `/${DEFAULT_LOCALE}/about`],
    ['/legal/privacy', `/${DEFAULT_LOCALE}/legal/privacy`],
    ['/de/services', `/${DEFAULT_LOCALE}/services`],
    ['/pt-BR/about', `/${DEFAULT_LOCALE}/about`],
    ['/de', `/${DEFAULT_LOCALE}`],
    ['/services/index.html', `/${DEFAULT_LOCALE}/services`],
    ['/de/about/', `/${DEFAULT_LOCALE}/about`],
    ['//services', `/${DEFAULT_LOCALE}/services`],
  ])('%s, which names no published language, is %s', (uri, location) => {
    expect(redirect(uri)).toBe(location)
  })

  // One rule, two copies: the app's for an in-app navigation (LocaleLayout),
  // this one for everything that arrives from outside.
  it.each([
    '/services',
    '/about',
    '/contact',
    '/legal/company',
    '/de/services',
    '/de',
    '/pt-BR/about',
    '/x-y/about',
    '/ok',
    '/EN/about',
    '/404',
    '/foo.bar/baz',
    '/%E0%A4%A',
    '/%65n/about',
  ])('sends %s where fallbackPath does', (uri) => {
    expect(redirect(uri)).toBe(fallbackPath(uri))
  })

  it('sends every other spelling of every prerendered page to that page, in one step', () => {
    for (const page of prerenderPages().filter((candidate) => candidate.route !== null)) {
      const inner = page.url.slice(1)
      const doubled = inner.includes('/') ? [`/${inner.replace('/', '//')}`] : []
      for (const spelling of [`${page.url}/`, `${page.url}/index.html`, `//${inner}`, ...doubled]) {
        expect(redirect(spelling), spelling).toBe(page.url)
      }
    }
  })

  it('keeps the query string, as the viewer sent it', () => {
    expect(redirect('/services', UTM)).toBe(`/${DEFAULT_LOCALE}/services?utm_source=x`)
    expect(redirect('/en/about/', { q: { value: 'a%20b' }, flag: { value: '' } })).toBe('/en/about?q=a%20b&flag')
    expect(
      redirect('/index.html', { tag: { value: 'a', multiValue: [{ value: 'a' }, { value: 'b' }] }, x: { value: '1' } }),
    ).toBe('/?tag=a&tag=b&x=1')
  })

  it('redirects with no query string when there is none, or CloudFront sent none', () => {
    expect(redirect('/about', {})).toBe(`/${DEFAULT_LOCALE}/about`)
    expect(handler({ request: { method: 'GET', uri: '/about' } }).headers.location.value).toBe(`/${DEFAULT_LOCALE}/about`)
  })

  it('leaves the bare root, the language pages and the files where they are', () => {
    for (const uri of ['/', ...LOCALE_CODES.map((code) => `/${code}`), '/og-image.png', `/${NOT_FOUND_FILE}`, '/en/no-such-page']) {
      expect(redirect(uri), uri).toBeNull()
    }
  })
})

describe('viewer-request: how long a 301 is kept', () => {
  // A 301 with no Cache-Control may be cached by a browser indefinitely. The
  // redirects follow DEFAULT_LOCALE and LOCALES, so after either changes a
  // returning visitor would keep being sent to the old answer. An hour
  // bounds that, and still spares a repeat visit the round trip.
  it('sends Cache-Control: public, max-age=3600 with every 301', () => {
    const spellings = ['/services', '/de/about', '/en/about/', '/en/about/index.html', '//en//about', '/index.html', '/og-image.png/']
    for (const uri of spellings) {
      const result = answer(uri)
      expect(result.statusCode, uri).toBe(301)
      expect(result.headers, uri).toEqual({
        location: { value: expect.stringMatching(/^\//) },
        'cache-control': { value: REDIRECT_CACHE },
      })
    }
  })

  it('bounds it, and never says immutable', () => {
    const maxAge = Number(/max-age=(\d+)/.exec(REDIRECT_CACHE)?.[1])
    expect(maxAge).toBeGreaterThan(0)
    expect(maxAge).toBeLessThanOrEqual(24 * 60 * 60)
    expect(SOURCE).not.toMatch(/immutable/)
  })

  it('adds nothing to a request it lets through', () => {
    const result = answer('/en/about')
    expect(result.statusCode).toBeUndefined()
    expect(result.headers).toEqual({})
  })
})

describe('viewer-request: a Location is always a path on this site', () => {
  // A browser reads a backslash as a slash, so "/\evil.com" would be
  // "//evil.com": another host.
  it.each([
    ['/\\evil.com/', '/evil.com'],
    ['/\\evil/', `/${DEFAULT_LOCALE}/evil`],
    ['/\\evil.com/a.png', '/evil.com/a.png'],
    ['//\\evil.com//a.png', '/evil.com/a.png'],
    ['/en\\about', '/en/about'],
    ['//evil.com', '/evil.com'],
    ['///evil.com//', '/evil.com'],
  ])('%s is %s', (uri, location) => {
    expect(redirect(uri)).toBe(location)
  })

  // ...and it drops tabs and line breaks altogether, so "/\t/evil.com" would
  // be "//evil.com" too. No page has one in its address.
  it.each(['/\t/evil.com', '/\n/evil.com/', '/en/\r/about/'])('never redirects %j', (uri) => {
    expect(redirect(uri)).toBeNull()
  })

  it('never answers with a Location a browser would read as another host', () => {
    const probes = ['//a', '/\\a', '/%5Ca', '//a.png//', '/de//\\a', '/index.html//a.png', '///', '/./a', '/../a']
    for (const uri of probes) {
      const location = redirect(uri)
      if (location !== null) expect(location, uri).toMatch(/^\/(?![/\\])/)
    }
  })
})

describe('viewer-request: runs as CloudFront runs it', () => {
  it('is plain script: no modules, and the handler CloudFront calls', () => {
    expect(SOURCE).not.toMatch(/\b(export|import|require)\b/)
    expect(SOURCE).toMatch(/^function handler\(event\) \{/m)
  })

  // cloudfront-js-2.0 limits a function to 10 KB of code.
  it('fits in a CloudFront Function', () => {
    expect(Buffer.byteLength(SOURCE, 'utf8')).toBeLessThan(10 * 1024)
  })
})
