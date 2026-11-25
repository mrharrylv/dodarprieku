import { afterEach, beforeEach, describe, it, expect } from 'vitest'

import { SITE } from '@/config/site'
import { SERVICES } from '@/data/services'
import i18n from '@/i18n'
import { isPlaceholderCopy, publishableCopy } from '@/lib/placeholder'
import { renderWithProviders } from '@/test/render'
import { mountStaticHead } from '@/test/static-head'
import { Seo } from './Seo'

const count = (selector: string) => document.head.querySelectorAll(selector).length
const content = (selector: string) => document.head.querySelector(selector)?.getAttribute('content')

const jsonLd = (): Array<Record<string, unknown>> =>
  [...document.head.querySelectorAll('script[type="application/ld+json"]')].map(
    (script) => JSON.parse(script.textContent ?? '{}') as Record<string, unknown>,
  )
const types = () => jsonLd().map((block) => block['@type'])

describe('Seo', () => {
  let unmountStatic: () => void = () => undefined

  beforeEach(() => {
    unmountStatic = mountStaticHead()
  })

  afterEach(() => unmountStatic())

  it("replaces index.html's static tags instead of adding a second set", () => {
    renderWithProviders(<Seo title="About" description="Who we are." path="/about" locale="en" />)

    for (const selector of [
      'meta[name="description"]',
      'meta[name="robots"]',
      'meta[property="og:title"]',
      'meta[property="og:description"]',
      'meta[property="og:image"]',
      'meta[property="og:image:width"]',
      'meta[name="twitter:title"]',
    ]) {
      expect(count(selector), selector).toBe(1)
    }
    expect(content('meta[name="description"]')).toBe('Who we are.')
    expect(content('meta[property="og:title"]')).toBe(`About · ${SITE.name}`)
  })

  it('asks for the large image preview on an indexable page', () => {
    renderWithProviders(<Seo title="About" description="d" path="/about" locale="en" />)
    expect(content('meta[name="robots"]')).toBe('max-image-preview:large')
  })

  it('titles a page called "Home" with the brand alone', () => {
    renderWithProviders(<Seo title="Home" description="d" path="/" locale="en" />)
    expect(document.title).toBe(SITE.name)
  })

  it('gives the home page the Organization and the WebSite', () => {
    renderWithProviders(<Seo title="Consulting in Rīga" description="d" path="/" locale="en" />)
    expect(types()).toEqual(['Organization', 'WebSite'])
  })

  it('gives an inner page its breadcrumb, starting from the translated home label', async () => {
    await i18n.changeLanguage('lv')
    renderWithProviders(<Seo title="Par mums" description="d" path="/about" locale="lv" />, { route: '/lv/about' })
    const breadcrumb = jsonLd().find((block) => block['@type'] === 'BreadcrumbList')
    const items = breadcrumb?.itemListElement as Array<Record<string, unknown>>
    expect(items.map((item) => item.name)).toEqual(['Sākums', 'Par mums'])
    expect(String(items[1]?.item)).toMatch(/\/lv\/about$/)
  })

  it('marks up the services on the services page, from the copy the page shows', () => {
    renderWithProviders(<Seo title="Services" description="d" path="/services" locale="en" />)
    expect(types()).toEqual(['Organization', 'BreadcrumbList', 'ItemList'])

    const list = jsonLd().find((block) => block['@type'] === 'ItemList')
    const items = list?.itemListElement as Array<{ item: { name: string; description: string } }>
    expect(items).toHaveLength(SERVICES.length)
    expect(items[0]?.item.name).toBe('Consulting')
    expect(items[0]?.item.description).toContain('Working out what to build before anyone builds it.')
  })

  it("describes each service with the copy it shows, less any of the template's instructions", () => {
    renderWithProviders(<Seo title="Services" description="d" path="/services" locale="en" />)
    const list = jsonLd().find((block) => block['@type'] === 'ItemList')
    const items = list?.itemListElement as Array<{ item: { description?: string } }>
    for (const [index, service] of SERVICES.entries()) {
      const description = items[index]?.item.description
      if (description !== undefined) expect(isPlaceholderCopy(description)).toBe(false)
      expect(description).toBe(
        publishableCopy(i18n.t(`services:items.${service.key}.summary`), i18n.t(`services:items.${service.key}.body`)) ?? undefined,
      )
    }
  })

  it('keeps a noIndex page out of the index', () => {
    renderWithProviders(<Seo title="Not found" description="d" path="/nope" locale="en" noIndex />)
    expect(content('meta[name="robots"]')).toBe('noindex, nofollow')
    expect(types()).toEqual(['Organization'])
  })

  it('does not accumulate tags when the page changes', () => {
    const { rerender } = renderWithProviders(<Seo title="About" description="a" path="/about" locale="en" />)
    rerender(<Seo title="Contact" description="c" path="/contact" locale="en" />)

    expect(count('meta[name="description"]')).toBe(1)
    expect(count('link[rel="canonical"]')).toBe(1)
    expect(count('script[type="application/ld+json"]')).toBe(2)
    expect(content('meta[name="description"]')).toBe('c')
  })

  it('removes everything it wrote when the page goes away', () => {
    const { unmount } = renderWithProviders(<Seo title="About" description="a" path="/about" locale="en" />)
    unmount()
    expect(count('[data-seo]')).toBe(0)
  })
})
