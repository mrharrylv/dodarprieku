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
    ['/par-projektu', '/par-projektu/index.html'],
    ['/konts/parole', '/konts/parole/index.html'],
    ['/legal/privacy', '/legal/privacy/index.html'],
    ['/no-such-page', '/no-such-page/index.html'],
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
    const result = answer('/par-projektu')
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

describe('viewer-request: a single-language site', () => {
  // One language, so no address carries a prefix and none is added.
  it('publishes one language, so no address is sent to a prefixed one', () => {
    expect(LOCALE_CODES).toHaveLength(1)
    for (const uri of ['/par-projektu', '/legal/privacy', '/de/par-projektu', '/lv', '/en/about']) {
      expect(redirect(uri), uri).toBeNull()
    }
  })

  it('agrees with fallbackPath, which keeps an unprefixed address as it is', () => {
    expect(fallbackPath('/par-projektu')).toBe('/par-projektu')
  })
})

describe('viewer-request: every other spelling is a 301 to the one address', () => {
  it.each([
    ['//par-projektu', '/par-projektu'],
    ['/legal//privacy', '/legal/privacy'],
    ['//legal//privacy', '/legal/privacy'],
    ['/par-projektu/', '/par-projektu'],
    ['/par-projektu//', '/par-projektu'],
    ['/par-projektu/index.html', '/par-projektu'],
    ['/konts/parole/index.html', '/konts/parole'],
    ['/index.html', '/'],
    ['//', '/'],
    ['//index.html', '/'],
    ['/assets//index-Bgo04jES.js', '/assets/index-Bgo04jES.js'],
    ['/og-image.png/', '/og-image.png'],
    ['/organizacija/patversme-x/', '/organizacija/patversme-x'],
  ])('%s is %s', (uri, location) => {
    expect(redirect(uri)).toBe(location)
  })

  it('sends every other spelling of every prerendered page to that page, in one step', () => {
    for (const page of prerenderPages().filter((candidate) => candidate.route !== null && candidate.url !== '/')) {
      const inner = page.url.slice(1)
      const doubled = inner.includes('/') ? [`/${inner.replace('/', '//')}`] : []
      for (const spelling of [`${page.url}/`, `${page.url}/index.html`, `//${inner}`, ...doubled]) {
        expect(redirect(spelling), spelling).toBe(page.url)
      }
    }
  })

  it('keeps the query string, as the viewer sent it', () => {
    expect(redirect('/par-projektu/', UTM)).toBe('/par-projektu?utm_source=x')
    expect(redirect('/par-projektu/', { q: { value: 'a%20b' }, flag: { value: '' } })).toBe('/par-projektu?q=a%20b&flag')
    expect(
      redirect('/index.html', { tag: { value: 'a', multiValue: [{ value: 'a' }, { value: 'b' }] }, x: { value: '1' } }),
    ).toBe('/?tag=a&tag=b&x=1')
  })

  it('redirects with no query string when there is none, or CloudFront sent none', () => {
    expect(redirect('/par-projektu/', {})).toBe('/par-projektu')
    expect(handler({ request: { method: 'GET', uri: '/par-projektu/' } }).headers.location.value).toBe('/par-projektu')
  })

  it('leaves the bare root, the pages and the files where they are', () => {
    for (const uri of ['/', '/par-projektu', '/og-image.png', `/${NOT_FOUND_FILE}`, '/no-such-page']) {
      expect(redirect(uri), uri).toBeNull()
    }
  })
})

describe('viewer-request: the charity pages share one shell', () => {
  it.each([
    ['/organizacija', '/organizacija/index.html'],
    ['/organizacija/patversme-ausma', '/organizacija/index.html'],
    ['/organizacija/b%C4%93rnu-nams', '/organizacija/index.html'],
    ['/organizacija/a/b', '/organizacija/index.html'],
  ])('serves %s from %s', (uri, file) => {
    expect(rewrite(uri)).toBe(file)
  })

  it('leaves a file under /organizacija alone', () => {
    expect(rewrite('/organizacija/logo.png')).toBe('/organizacija/logo.png')
  })

  it('does not treat a page that only starts with the word as a charity', () => {
    expect(rewrite('/organizacijas/x')).toBe('/organizacijas/x/index.html')
  })
})

const withHost = (uri, host) => handler({ ...viewerRequest(uri, {}), request: { ...viewerRequest(uri, {}).request, headers: { host: { value: host } } } })

describe('viewer-request: the admin host serves only the admin app', () => {
  const ADMIN = 'admin.dodarprieku.hagroup.lv'

  it.each([
    ['/', '/admin/index.html'],
    ['/charities', '/admin/index.html'],
    ['/charities/abc/', '/admin/index.html'],
    ['/admin', '/admin/index.html'],
    ['/admin/', '/admin/index.html'],
    ['/admin/applications', '/admin/index.html'],
    ['/favicon.ico', '/admin/index.html'],
    ['/index.html', '/admin/index.html'],
  ])('sends %s to the SPA at %s', (uri, file) => {
    const result = withHost(uri, ADMIN)
    expect(result.statusCode).toBeUndefined()
    expect(result.uri).toBe(file)
  })

  it.each(['/admin/assets/index-abc123.js', '/admin/favicon.svg', '/admin/index.html'])('passes the admin file %s through', (uri) => {
    expect(withHost(uri, ADMIN).uri).toBe(uri)
  })

  it('recognises the host whatever its case', () => {
    expect(withHost('/x', 'Admin.Dodarprieku.hagroup.lv').uri).toBe('/admin/index.html')
  })

  it('never redirects on the admin host', () => {
    for (const uri of ['/charities/', '//x', '/x/index.html']) {
      expect(withHost(uri, ADMIN).statusCode, uri).toBeUndefined()
    }
  })
})

describe('viewer-request: the public host hides the admin app', () => {
  it.each(['/admin', '/admin/', '/admin/index.html', '/admin/assets/index-abc.js', '//admin', '/admin/charities/x'])(
    'answers %s with 404',
    (uri) => {
      const result = withHost(uri, 'dodarprieku.hagroup.lv')
      expect(result.statusCode).toBe(404)
      expect(result.statusDescription).toBe('Not Found')
      expect(result.headers['content-type'].value).toMatch(/^text\/plain/)
      expect(result.body.data).toBe('Not Found')
    },
  )

  it('answers it with 404 when no Host header arrives', () => {
    expect(answer('/admin').statusCode).toBe(404)
  })

  it('leaves a page that only starts with the word alone', () => {
    expect(rewrite('/administracija')).toBe('/administracija/index.html')
  })
})

describe('viewer-request: the other behaviours are left alone', () => {
  it.each(['/api/auth/me', '/api/', '/media/abc/photo.webp', '/data/charities.json', '/data/parcel-lockers.json', '/api//x/'])(
    'returns %s untouched, on either host',
    (uri) => {
      for (const host of ['dodarprieku.hagroup.lv', 'admin.dodarprieku.hagroup.lv']) {
        const result = withHost(uri, host)
        expect(result.statusCode, `${host}${uri}`).toBeUndefined()
        expect(result.uri, `${host}${uri}`).toBe(uri)
      }
    },
  )
})

describe('viewer-request: how long a 301 is kept', () => {
  // A 301 with no Cache-Control may be cached by a browser indefinitely. The
  // redirects follow DEFAULT_LOCALE and LOCALES, so after either changes a
  // returning visitor would keep being sent to the old answer. An hour
  // bounds that, and still spares a repeat visit the round trip.
  it('sends Cache-Control: public, max-age=3600 with every 301', () => {
    const spellings = ['/par-projektu/', '/par-projektu/index.html', '//legal//privacy', '/index.html', '/og-image.png/']
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
    const result = answer('/par-projektu')
    expect(result.statusCode).toBeUndefined()
    expect(result.headers).toEqual({})
  })
})

describe('viewer-request: a Location is always a path on this site', () => {
  // A browser reads a backslash as a slash, so "/\evil.com" would be
  // "//evil.com": another host.
  it.each([
    ['/\\evil.com/', '/evil.com'],
    ['/\\evil/', '/evil'],
    ['/\\evil.com/a.png', '/evil.com/a.png'],
    ['//\\evil.com//a.png', '/evil.com/a.png'],
    ['/legal\\privacy/', '/legal/privacy'],
    ['//evil.com', '/evil.com'],
    ['///evil.com//', '/evil.com'],
  ])('%s is %s', (uri, location) => {
    expect(redirect(uri)).toBe(location)
  })

  // ...and it drops tabs and line breaks altogether, so "/\t/evil.com" would
  // be "//evil.com" too. No page has one in its address.
  it.each(['/\t/evil.com', '/\n/evil.com/', '/legal/\r/privacy/'])('never redirects %j', (uri) => {
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
