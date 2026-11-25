import { beforeAll, describe, it, expect } from 'vitest'

import { DEFAULT_LOCALE, LOCALES, LOCALE_CODES, ROUTES, type LocaleCode } from '@/config/site'
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
const OTHER_LOCALE = LOCALE_CODES.find((code) => code !== DEFAULT_LOCALE) ?? DEFAULT_LOCALE
const strings = { homeLabel: 'Home', siteDescription: 'We build things.', services: [] }

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

  it('writes each page to <url>/index.html', () => {
    expect(byKey('lv:/about').files).toEqual(['lv/about/index.html'])
    expect(byKey('ru:/legal/privacy').files).toEqual(['ru/legal/privacy/index.html'])
    expect(byKey(`${OTHER_LOCALE}:/`).files).toEqual([`${OTHER_LOCALE}/index.html`])
  })

  it('writes the default language home page to the bare root as well', () => {
    expect(byKey(`${DEFAULT_LOCALE}:/`).files).toEqual([`${DEFAULT_LOCALE}/index.html`, 'index.html'])
    expect(pages.flatMap((page) => page.files).filter((file) => file === 'index.html')).toHaveLength(1)
  })

  it('renders the 404 page at a URL no route matches, in the default language', () => {
    const notFound = byKey(NOT_FOUND_KEY)
    expect(notFound.route).toBeNull()
    expect(notFound.files).toEqual([NOT_FOUND_FILE])
    expect(notFound.url).toBe(`/${DEFAULT_LOCALE}/404`)
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
    expect(fileForUrl('/en/about/')).toBe('en/about/index.html')
  })
})

describe('keyForPathname', () => {
  it('names the page a URL renders', () => {
    expect(keyForPathname('/en')).toBe('en:/')
    expect(keyForPathname('/lv/about')).toBe('lv:/about')
    expect(keyForPathname('/ru/legal/terms')).toBe('ru:/legal/terms')
  })

  it('ignores a trailing slash, as the router and the edge do', () => {
    expect(keyForPathname('/en/')).toBe('en:/')
    expect(keyForPathname('/lv/about/')).toBe('lv:/about')
  })

  it('names the 404 page of the URL language for a path no route matches', () => {
    expect(keyForPathname('/en/no-such-page')).toBe('en:404')
    expect(keyForPathname('/lv/no-such-page')).toBe('lv:404')
  })

  it('is null for a URL that redirects rather than renders', () => {
    expect(keyForPathname('/')).toBeNull()
    expect(keyForPathname('/services')).toBeNull()
    expect(keyForPathname('/de/about')).toBeNull()
  })

  it('agrees with prerenderPages for every page it writes', () => {
    for (const page of pages) expect(keyForPathname(page.url), page.url).toBe(page.key)
  })
})

describe('startupPlan', () => {
  const plan = (pathname: string, prerendered: string | null, redirecting = false, resolvedLanguage = 'en') =>
    startupPlan({ pathname, resolvedLanguage, prerendered, redirecting })

  it('hydrates the page the address renders', () => {
    expect(plan('/lv/about', 'lv:/about')).toEqual({ mount: true, address: null, hydrate: true })
  })

  it('moves the address first, then hydrates the page it now names', () => {
    expect(plan('/lv/about/', 'lv:/about')).toEqual({ mount: true, address: '/lv/about', hydrate: true })
    expect(plan('/lv/about/index.html', 'lv:/about')).toEqual({ mount: true, address: '/lv/about', hydrate: true })
    expect(plan('/', 'en:/')).toEqual({ mount: true, address: '/en', hydrate: true })
    expect(plan('/index.html', 'en:/')).toEqual({ mount: true, address: '/en', hydrate: true })
  })

  it('renders from scratch when the markup is another page, or there is none', () => {
    expect(plan('/', 'en:/', false, 'lv')).toEqual({ mount: true, address: '/lv', hydrate: false })
    expect(plan('/lv/nope', 'en:404')).toEqual({ mount: true, address: null, hydrate: false })
    expect(plan('/en/about', null)).toEqual({ mount: true, address: null, hydrate: false })
  })

  // The edge answers /lv/nope with the one 404.html, which is in the default
  // language. theme-init.js keeps it hidden, and main.tsx shows it only after
  // rendering the not-found page afresh, in the address's language.
  it.each(LOCALE_CODES.filter((code) => code !== DEFAULT_LOCALE))(
    'renders /%s/nope from scratch over the default-language 404 page',
    (code) => {
      expect(plan(`/${code}/nope`, NOT_FOUND_KEY, false, code)).toEqual({ mount: true, address: null, hydrate: false })
    },
  )

  it('hydrates the 404 page at an address in the default language', () => {
    expect(plan(`/${DEFAULT_LOCALE}/nope`, NOT_FOUND_KEY)).toEqual({ mount: true, address: null, hydrate: true })
  })

  it('mounts on a scheme-relative path too, at an address on this origin', () => {
    expect(plan('//evil.com/', 'en:404')).toEqual({ mount: true, address: '/evil.com', hydrate: false })
  })

  // theme-init.js has already called location.replace: the page is on its way
  // out, and touching history or rendering it is wasted work at best.
  it('does not start at all while theme-init.js is sending the page elsewhere', () => {
    expect(plan('/', 'en:/', true, 'lv')).toEqual({ mount: false })
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

  const page = byKey('lv:/about')
  const head = headFor('/about', 'lv')
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
    expect(root?.getAttribute(PRERENDER_ATTR)).toBe('lv:/about')
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
  const about = byKey('lv:/about')

  it('passes a complete page', () => {
    expect(validatePage(about, { body: BODY, head: headFor('/about', 'lv') }, ORIGIN)).toEqual([])
  })

  it('accepts the language home as canonical, as a one-document style declares', () => {
    expect(validatePage(about, { body: BODY, head: headFor('/', 'lv') }, ORIGIN)).toEqual([])
  })

  it('rejects an empty root and a missing or doubled h1', () => {
    expect(validatePage(about, { body: '', head: headFor('/about', 'lv') }, ORIGIN)).toEqual([
      'rendered an empty #root',
      'has 0 <h1> elements, not exactly one',
    ])
    expect(validatePage(about, { body: '<h1>a</h1><h1 class="x">b</h1>', head: headFor('/about', 'lv') }, ORIGIN)).toEqual([
      'has 2 <h1> elements, not exactly one',
    ])
  })

  it('rejects an inline script, which production would block', () => {
    const problems = validatePage(about, { body: `${BODY}<script>x()</script>`, head: headFor('/about', 'lv') }, ORIGIN)
    expect(problems.join()).toMatch(/<script>/)
  })

  it('rejects a page with no <Seo>', () => {
    expect(validatePage(about, { body: BODY, head: null }, ORIGIN)).toEqual([
      'rendered no <Seo>, so it has no title, description or canonical',
    ])
  })

  it('rejects a canonical in another language, or on another page', () => {
    expect(validatePage(about, { body: BODY, head: headFor('/about', 'en') }, ORIGIN).join()).toContain(
      `declares canonical ${canonicalUrl('/about', 'en')}`,
    )
    expect(validatePage(about, { body: BODY, head: headFor('/contact', 'lv') }, ORIGIN).join()).toContain(
      'declares canonical',
    )
  })

  it('rejects a relative canonical when the build has an origin', () => {
    const problems = validatePage(about, { body: BODY, head: headFor('/about', 'lv') }, 'https://www.example.lv')
    expect(problems.join()).toMatch(/declares canonical .* expected https:\/\/www\.example\.lv\/lv\/about/)
    expect(problems.join()).toMatch(/og:image/)
  })

  it('rejects a head whose og:url, robots, lang, title or description are wrong', () => {
    const good = headFor('/about', 'lv')
    const broken: PageHead = {
      title: ' ',
      lang: 'en',
      tags: good.tags
        .filter((tag) => !(tag.kind === 'meta' && ['og:url', 'description'].includes(tag.key)))
        .filter((tag) => !(tag.kind === 'link' && tag.hrefLang === 'ru'))
        .map((tag) => (tag.kind === 'meta' && tag.key === 'robots' ? { ...tag, content: 'noindex' } : tag)),
    }
    expect(validatePage(about, { body: BODY, head: broken }, ORIGIN)).toEqual([
      'has an empty title',
      'has no description',
      'declares lang "en", expected "lv"',
      'is noindex',
      'has an og:url that is not its canonical',
      'has no hreflang alternate for ru',
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
        { page: byKey('lv:/about'), head: headFor('/about', 'lv') },
        // A route that shares the home page's document, as long-scroll's do.
        { page: byKey('ru:/services'), head: headFor('/', 'ru') },
        { page: byKey(NOT_FOUND_KEY), head: headFor('/nope', DEFAULT_LOCALE, true) },
        { page: byKey('en:/contact'), head: null },
      ],
      ORIGIN,
    )
  })

  it('reads each page with a route: its own URL, the canonical its head names, and its alternates', () => {
    expect(declared[0]).toEqual({
      route: '/about',
      locale: 'lv',
      url: `${ORIGIN}/lv/about`,
      canonical: canonicalUrl('/about', 'lv'),
      alternates: headFor('/about', 'lv').tags.flatMap((tag) =>
        tag.kind === 'link' && tag.rel === 'alternate' ? [{ hrefLang: tag.hrefLang, href: tag.href }] : [],
      ),
    })
  })

  it('keeps what a page declares, even when it names another URL as canonical', () => {
    expect(declared[1]).toMatchObject({ url: `${ORIGIN}/ru/services`, canonical: canonicalUrl('/', 'ru') })
  })

  it('leaves out the 404 page and a page with no head', () => {
    expect(declared.map((entry) => entry.url)).toEqual([`${ORIGIN}/lv/about`, `${ORIGIN}/ru/services`])
  })
})
