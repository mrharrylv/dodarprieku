import { existsSync } from 'node:fs'
import { join } from 'node:path'

import { describe, it, expect } from 'vitest'

import { DEFAULT_LOCALE, LOCALES, SITE } from '@/config/site'
import { SHARE_IMAGE } from '@/config/constants'
import { resources } from '@/i18n'
import { pageHead } from '@/lib/head'
import { buildTitle, ogLocale, robotsContent, socialTags } from '@/lib/seo'
import { staticDocument } from '@/test/static-head'

/**
 * The head in `index.html`, which is what every crawler that does not run
 * JavaScript reads, and what the app starts from.
 */
const head = staticDocument().head
const content = (selector: string) => head.querySelector(selector)?.getAttribute('content') ?? null

const home = resources[DEFAULT_LOCALE].home.meta
const homeTitle = buildTitle(home.title, [resources[DEFAULT_LOCALE].common.nav.home])

describe('the static head', () => {
  it("carries the home page's title and description in the default language", () => {
    expect(head.querySelector('title')?.textContent).toBe(homeTitle)
    expect(content('meta[property="og:title"]')).toBe(homeTitle)
    expect(content('meta[name="twitter:title"]')).toBe(homeTitle)
    expect(content('meta[name="description"]')).toBe(home.description)
    expect(content('meta[property="og:description"]')).toBe(home.description)
    expect(content('meta[name="twitter:description"]')).toBe(home.description)
    expect(content('meta[property="og:site_name"]')).toBe(SITE.name)
  })

  it('never titles the site "Home"', () => {
    expect(head.querySelector('title')?.textContent).not.toMatch(/^Home\b/)
  })

  it('describes the share card exactly', () => {
    expect(content('meta[property="og:image"]')).toBe(`__SITE_URL__${SHARE_IMAGE.path}?v=__SHARE_VERSION__`)
    expect(content('meta[name="twitter:image"]')).toBe(`__SITE_URL__${SHARE_IMAGE.path}?v=__SHARE_VERSION__`)
    expect(content('meta[property="og:image:type"]')).toBe(SHARE_IMAGE.type)
    expect(content('meta[property="og:image:width"]')).toBe(String(SHARE_IMAGE.width))
    expect(content('meta[property="og:image:height"]')).toBe(String(SHARE_IMAGE.height))
    expect(content('meta[property="og:image:alt"]')).toBe(SITE.name)
  })

  it("names the app and the language the way pageHead does, so a crawler's first look matches the second", () => {
    expect(content('meta[name="application-name"]')).toBe(SITE.shortName)
    expect(content('meta[name="apple-mobile-web-app-title"]')).toBe(SITE.shortName)
    expect(content('meta[property="og:locale"]')).toBe(ogLocale(DEFAULT_LOCALE))
    const alternates = [...head.querySelectorAll('meta[property="og:locale:alternate"]')].map((tag) =>
      tag.getAttribute('content'),
    )
    expect(alternates).toEqual(LOCALES.filter((l) => l.code !== DEFAULT_LOCALE).map((l) => ogLocale(l.code)))
  })

  it('declares exactly the meta tags pageHead writes for the home page, no more and no fewer', () => {
    const keyOf = (tag: Element) => tag.getAttribute('name') ?? tag.getAttribute('property') ?? ''
    const fromHtml = [...head.querySelectorAll('meta[data-seo]')].map(keyOf).sort()
    const fromCode = pageHead(
      { title: home.title, description: home.description, path: '/', locale: DEFAULT_LOCALE },
      { homeLabel: resources[DEFAULT_LOCALE].common.nav.home, siteDescription: home.description, services: [] },
    )
      .tags.flatMap((tag) => (tag.kind === 'meta' ? [tag.key] : []))
      .sort()
    expect(fromHtml).toEqual(fromCode)
  })

  it('asks for the large image preview', () => {
    expect(content('meta[name="robots"]')).toBe(robotsContent())
  })

  it('marks every tag <Seo> also writes, so the runtime replaces it instead of adding a second', () => {
    const written = new Set([
      'description',
      'robots',
      ...socialTags({ title: 't', description: 'd', path: '/', locale: DEFAULT_LOCALE }).map(([key]) => key),
    ])
    const unmarked = [...head.querySelectorAll('meta')]
      .filter((tag) => written.has(tag.getAttribute('name') ?? tag.getAttribute('property') ?? ''))
      .filter((tag) => !tag.hasAttribute('data-seo'))
      .map((tag) => tag.outerHTML)
    expect(unmarked).toEqual([])
  })

  it('leaves the tags <Seo> does not own unmarked, so they survive navigation', () => {
    const marked = [...head.querySelectorAll('[data-seo]')]
    for (const tag of marked) {
      expect(tag.getAttribute('name') ?? tag.getAttribute('property')).not.toMatch(/^(viewport|theme-color)$/)
      expect(tag.tagName).toBe('META')
    }
    expect(head.querySelector('meta[charset]')?.hasAttribute('data-seo')).toBe(false)
  })
})

describe('the icon links', () => {
  const icons = [...head.querySelectorAll('link[rel="icon"], link[rel="apple-touch-icon"], link[rel="manifest"]')]
  const hrefs = icons.map((link) => link.getAttribute('href'))

  it('offer favicon.ico first, then the 96 px PNG, the SVG, the touch icon and the manifest', () => {
    expect(hrefs).toEqual([
      '/favicon.ico',
      '/favicon-96x96.png',
      '/favicon.svg',
      '/apple-touch-icon.png',
      '/site.webmanifest',
    ])
    expect(icons[0]?.getAttribute('sizes')).toBe('16x16 32x32 48x48')
    expect(icons[1]?.getAttribute('sizes')).toBe('96x96')
  })

  it.each(hrefs)('%s exists in public/', (href) => {
    expect(existsSync(join(__dirname, '..', '..', '..', 'public', href ?? ''))).toBe(true)
  })
})
