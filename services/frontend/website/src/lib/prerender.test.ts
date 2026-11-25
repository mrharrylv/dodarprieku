import { beforeAll, describe, it, expect } from 'vitest'

import { DEFAULT_LOCALE, LOCALES, ROUTES, type LocaleCode } from '@/config/site'
import { pageHead, type PageHead } from './head'
import {
  NOT_FOUND_FILE,
  PRERENDER_ATTR,
  declaredPages,
  fileForUrl,
  keyForPathname,
  pageDocument,
  pageKey,
  prerenderPages,
  startupPlan,
  validatePage,
  type PrerenderPage,
} from './prerender'
import { absoluteUrl, canonicalUrl } from './seo'

const pages = prerenderPages()
const byKey = (key: string) => pages.find((page) => page.key === key) as PrerenderPage
/** The one 404 page, in whichever language is the default. */
const NOT_FOUND_KEY = pageKey(DEFAULT_LOCALE, null)
const strings = { homeLabel: 'Home', siteDescription: 'We build things.' }

/** The origin `absoluteUrl` uses in this environment: jsdom's. */
const ORIGIN = absoluteUrl('/').replace(/\/$/, '')

const headFor = (path: string, locale: LocaleCode, noIndex = false): PageHead =>
  pageHead({ title: 'About', description: 'Who we are.', path, locale, ...(noIndex ? { noIndex } : {}) }, strings)

const BODY = '<header></header><main><h1>About</h1><p>Text.</p></main>'

describe('prerenderPages', () => {
  it('covers every route in every locale, and the 404 page', () => {
    const routes = Object.values(ROUTES)
    expect(pages).toHaveLength(routes.length * LOCALES.length + 1)
    for (const locale of LOCALES) {
      for (const route of routes) expect(byKey(pageKey(locale.code, route))).toBeDefined()
    }
  })

  it('writes each page to <url>/index.html, with no language prefix', () => {
    expect(byKey('lv:/par-projektu').files).toEqual(['par-projektu/index.html'])
    expect(byKey('lv:/legal/privacy').files).toEqual(['legal/privacy/index.html'])
    expect(byKey('lv:/konts/parole').files).toEqual(['konts/parole/index.html'])
  })

  it('writes the home page to the bare root, once', () => {
    expect(byKey(`${DEFAULT_LOCALE}:/`).files).toEqual(['index.html'])
    expect(pages.flatMap((page) => page.files).filter((file) => file === 'index.html')).toHaveLength(1)
  })

  // The edge serves this one file for every /organizacija/<slug>.
  it('writes one charity shell, at /organizacija', () => {
    expect(byKey(`lv:${ROUTES.charity}`).files).toEqual(['organizacija/index.html'])
  })

  it('renders the 404 page at a URL no route matches, in the default language', () => {
    const notFound = byKey(NOT_FOUND_KEY)
    expect(notFound.route).toBeNull()
    expect(notFound.files).toEqual([NOT_FOUND_FILE])
    expect(notFound.url).toBe('/404')
  })

  it('never writes two pages to one file', () => {
    const files = pages.flatMap((page) => page.files)
    expect(new Set(files).size).toBe(files.length)
  })
})

describe('fileForUrl', () => {
  it('maps a URL to the object key CloudFront rewrites it to', () => {
    expect(fileForUrl('/')).toBe('index.html')
    expect(fileForUrl('/en')).toBe('en/index.html')
    expect(fileForUrl('/par-projektu/')).toBe('par-projektu/index.html')
  })
})

describe('keyForPathname', () => {
  it('names the page a URL renders', () => {
    expect(keyForPathname('/')).toBe('lv:/')
    expect(keyForPathname('/par-projektu')).toBe('lv:/par-projektu')
    expect(keyForPathname('/legal/terms')).toBe('lv:/legal/terms')
  })

  it('ignores a trailing slash, as the router and the edge do', () => {
    expect(keyForPathname('/par-projektu/')).toBe('lv:/par-projektu')
  })

  it('names the 404 page for a path no route matches', () => {
    expect(keyForPathname('/no-such-page')).toBe('lv:404')
    expect(keyForPathname('/en/par-projektu')).toBe('lv:404')
  })

  // The shell is written once; a charity's own address renders the page
  // afresh in the browser rather than hydrating the shell's markup.
  it('names no prerendered page for a charity address', () => {
    expect(keyForPathname('/organizacija/patversme')).toBe('lv:404')
  })

  it('agrees with prerenderPages for every page it writes', () => {
    for (const page of pages) expect(keyForPathname(page.url), page.url).toBe(page.key)
  })
})

describe('startupPlan', () => {
  const plan = (pathname: string, prerendered: string | null, redirecting = false, resolvedLanguage = 'lv') =>
    startupPlan({ pathname, resolvedLanguage, prerendered, redirecting })

  it('hydrates the page the address renders', () => {
    expect(plan('/par-projektu', 'lv:/par-projektu')).toEqual({ mount: true, address: null, hydrate: true })
    expect(plan('/', 'lv:/', false, 'en')).toEqual({ mount: true, address: null, hydrate: true })
  })

  it('moves the address first, then hydrates the page it now names', () => {
    expect(plan('/par-projektu/', 'lv:/par-projektu')).toEqual({ mount: true, address: '/par-projektu', hydrate: true })
    expect(plan('/par-projektu/index.html', 'lv:/par-projektu')).toEqual({ mount: true, address: '/par-projektu', hydrate: true })
    expect(plan('/index.html', 'lv:/')).toEqual({ mount: true, address: '/', hydrate: true })
  })

  it('renders from scratch when the markup is another page, or there is none', () => {
    expect(plan('/organizacija/patversme', `lv:${ROUTES.charity}`)).toEqual({ mount: true, address: null, hydrate: false })
    expect(plan('/par-projektu', null)).toEqual({ mount: true, address: null, hydrate: false })
  })

  it('hydrates the 404 page', () => {
    expect(plan('/nope', NOT_FOUND_KEY)).toEqual({ mount: true, address: null, hydrate: true })
  })

  it('mounts on a scheme-relative path too, at an address on this origin', () => {
    expect(plan('//evil.com/', 'lv:404')).toEqual({ mount: true, address: '/evil.com', hydrate: true })
  })

  it('does not start at all while theme-init.js is sending the page elsewhere', () => {
    expect(plan('/', 'lv:/', true)).toEqual({ mount: false })
  })
})

describe('pageDocument', () => {
  const template = [
    '<!doctype html>',
    '<html lang="en">',
    '  <head>',
    '    <meta charset="UTF-8" />',
    '',
    '    <!--',
    '      A note for whoever edits the template, <title> and all.',
    '    -->',
    '    <title>Static · Brand</title>',
    '    <meta name="description" content="static" data-seo />',
    '    <meta property="og:title" content="static" data-seo />',
    '    <link rel="icon" href="/favicon.ico" />',
    '  </head>',
    '  <body>',
    '    <div id="root"></div>',
    '  </body>',
    '</html>',
  ].join('\n')

  const page = byKey('lv:/par-projektu')
  const head = headFor('/par-projektu', 'lv')
  const html = pageDocument(template, page, { body: BODY, head })
  const parsed = new DOMParser().parseFromString(html, 'text/html')

  it("sets the page's language", () => {
    expect(parsed.documentElement.lang).toBe('lv')
  })

  it("replaces the template's head tags with the page's, leaving the rest", () => {
    expect(parsed.querySelectorAll('title')).toHaveLength(1)
    expect(parsed.title).toBe(head.title)
    expect(parsed.querySelectorAll('meta[name="description"]')).toHaveLength(1)
    expect(parsed.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('Who we are.')
    expect(parsed.querySelectorAll('meta[property="og:title"]')).toHaveLength(1)
    expect(parsed.querySelector('link[rel="icon"]')).not.toBeNull()
    expect(parsed.querySelector('meta[charset]')).not.toBeNull()
  })

  // theme-init.js hides a page served in another language than its address
  // only on a document the build wrote. The dev server's index.html, always
  // lang="en", carries no marker, so it is never hidden.
  it('marks the document itself as prerendered, on <html>', () => {
    expect(parsed.documentElement.hasAttribute(PRERENDER_ATTR)).toBe(true)
    expect(new DOMParser().parseFromString(template, 'text/html').documentElement.hasAttribute(PRERENDER_ATTR)).toBe(false)
  })

  it('marks every page the build writes, the 404 page included', () => {
    for (const each of pages) {
      const head = headFor(each.route ?? '/404', each.locale, each.route === null)
      const written = pageDocument(template, each, { body: BODY, head })
      const marked = new DOMParser().parseFromString(written, 'text/html').documentElement
      expect(marked.hasAttribute(PRERENDER_ATTR), each.key).toBe(true)
      expect(marked.getAttribute('lang'), each.key).toBe(head.lang)
    }
    expect(pages.some((each) => each.route === null)).toBe(true)
  })

  it('puts the body in #root and marks which page it is', () => {
    const root = parsed.getElementById('root')
    expect(root?.getAttribute(PRERENDER_ATTR)).toBe('lv:/par-projektu')
    expect(root?.querySelector('h1')?.textContent).toBe('About')
  })

  it("drops the template's notes from the head, and keeps React's markers in the body", () => {
    const withMarkers = pageDocument(template, page, { body: '<h1>A<!-- -->B</h1><!--$--><p>x</p><!--/$-->', head })
    const [top, bottom] = withMarkers.split('</head>')
    expect(top).not.toContain('<!--')
    expect(top).not.toMatch(/\n\s*\n/)
    expect(bottom).toContain('<h1>A<!-- -->B</h1><!--$--><p>x</p><!--/$-->')
  })

  it('takes a dollar sign in the copy literally', () => {
    const priced = pageDocument(template, page, { body: '<h1>From $& and $1</h1>', head })
    expect(priced).toContain('<h1>From $& and $1</h1>')
  })

  it('refuses a template that is already a prerendered page', () => {
    expect(() => pageDocument(html, page, { body: BODY, head })).toThrow(/already prerendered/)
  })

  it('refuses a template without a title', () => {
    expect(() => pageDocument(template.replace(/<title>.*<\/title>/, ''), page, { body: BODY, head })).toThrow(
      /no <title>/,
    )
  })

  it('refuses a page that rendered no head', () => {
    expect(() => pageDocument(template, page, { body: BODY, head: null })).toThrow(/no <Seo>/)
  })
})

describe('validatePage', () => {
  const about = byKey('lv:/par-projektu')

  it('passes a complete page', () => {
    expect(validatePage(about, { body: BODY, head: headFor('/par-projektu', 'lv') }, ORIGIN)).toEqual([])
  })

  it('accepts the language home as canonical, as a one-document style declares', () => {
    expect(validatePage(about, { body: BODY, head: headFor('/', 'lv') }, ORIGIN)).toEqual([])
  })

  it('rejects an empty root and a missing or doubled h1', () => {
    expect(validatePage(about, { body: '', head: headFor('/par-projektu', 'lv') }, ORIGIN)).toEqual([
      'rendered an empty #root',
      'has 0 <h1> elements, not exactly one',
    ])
    expect(validatePage(about, { body: '<h1>a</h1><h1 class="x">b</h1>', head: headFor('/par-projektu', 'lv') }, ORIGIN)).toEqual([
      'has 2 <h1> elements, not exactly one',
    ])
  })

  it('rejects an inline script, which production would block', () => {
    const problems = validatePage(about, { body: `${BODY}<script>x()</script>`, head: headFor('/par-projektu', 'lv') }, ORIGIN)
    expect(problems.join()).toMatch(/<script>/)
  })

  it('rejects a page with no <Seo>', () => {
    expect(validatePage(about, { body: BODY, head: null }, ORIGIN)).toEqual([
      'rendered no <Seo>, so it has no title, description or canonical',
    ])
  })

  it('rejects a canonical on another page', () => {
    expect(validatePage(about, { body: BODY, head: headFor('/konts', 'lv') }, ORIGIN).join()).toContain(
      `declares canonical ${canonicalUrl('/konts', 'lv')}`,
    )
  })

  it('rejects a relative canonical when the build has an origin', () => {
    const problems = validatePage(about, { body: BODY, head: headFor('/par-projektu', 'lv') }, 'https://www.example.lv')
    expect(problems.join()).toMatch(/declares canonical .* expected https:\/\/www\.example\.lv\/par-projektu/)
    expect(problems.join()).toMatch(/og:image/)
  })

  it('rejects a head whose og:url, robots, lang, title or description are wrong', () => {
    const good = headFor('/par-projektu', 'lv')
    const broken: PageHead = {
      title: ' ',
      lang: 'en',
      tags: good.tags
        .filter((tag) => !(tag.kind === 'meta' && ['og:url', 'description'].includes(tag.key)))
        .filter((tag) => !(tag.kind === 'link' && tag.hrefLang === 'x-default'))
        .map((tag) => (tag.kind === 'meta' && tag.key === 'robots' ? { ...tag, content: 'noindex' } : tag)),
    }
    expect(validatePage(about, { body: BODY, head: broken }, ORIGIN)).toEqual([
      'has an empty title',
      'has no description',
      'declares lang "en", expected "lv"',
      'is noindex',
      'has an og:url that is not its canonical',
      'has no hreflang alternate for x-default',
    ])
  })

  describe('the 404 page', () => {
    const notFound = byKey(NOT_FOUND_KEY)

    it('passes when it is noindex and declares no canonical', () => {
      expect(validatePage(notFound, { body: BODY, head: headFor('/404', DEFAULT_LOCALE, true) }, ORIGIN)).toEqual([])
    })

    it('fails when it could be indexed', () => {
      expect(validatePage(notFound, { body: BODY, head: headFor('/404', DEFAULT_LOCALE) }, ORIGIN)).toEqual([
        'is the 404 page but is not noindex',
        'is the 404 page but declares a canonical',
      ])
    })
  })
})

describe('declaredPages', () => {
  // Built in beforeAll, not at describe scope: a lookup that finds no page
  // then fails these tests, rather than the whole file before it has run any.
  let declared: ReturnType<typeof declaredPages> = []

  beforeAll(() => {
    declared = declaredPages(
      [
        { page: byKey('lv:/par-projektu'), head: headFor('/par-projektu', 'lv') },
        // A route whose page names the home page as canonical.
        { page: byKey('lv:/konts'), head: headFor('/', 'lv') },
        { page: byKey(NOT_FOUND_KEY), head: headFor('/nope', DEFAULT_LOCALE, true) },
        { page: byKey('lv:/registreties'), head: null },
      ],
      ORIGIN,
    )
  })

  it('reads each page with a route: its own URL, the canonical its head names, and its alternates', () => {
    expect(declared[0]).toEqual({
      route: '/par-projektu',
      locale: 'lv',
      url: `${ORIGIN}/par-projektu`,
      canonical: canonicalUrl('/par-projektu', 'lv'),
      alternates: headFor('/par-projektu', 'lv').tags.flatMap((tag) =>
        tag.kind === 'link' && tag.rel === 'alternate' ? [{ hrefLang: tag.hrefLang, href: tag.href }] : [],
      ),
    })
  })

  it('keeps what a page declares, even when it names another URL as canonical', () => {
    expect(declared[1]).toMatchObject({ url: `${ORIGIN}/konts`, canonical: canonicalUrl('/', 'lv') })
  })

  it('leaves out the 404 page and a page with no head', () => {
    expect(declared.map((entry) => entry.url)).toEqual([`${ORIGIN}/par-projektu`, `${ORIGIN}/konts`])
  })
})
