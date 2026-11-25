import { afterEach, beforeEach, describe, it, expect } from 'vitest'

import { SITE } from '@/config/site'
import { resources } from '@/i18n'
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
    renderWithProviders(<Seo title="About" description="Who we are." path="/about" locale="lv" />)

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
    renderWithProviders(<Seo title="About" description="d" path="/about" locale="lv" />)
    expect(content('meta[name="robots"]')).toBe('max-image-preview:large')
  })

  it('titles a page called by the home label with the brand alone', () => {
    renderWithProviders(<Seo title={resources.lv.common.nav.map} description="d" path="/" locale="lv" />)
    expect(document.title).toBe(SITE.name)
  })

  it('gives the home page the Organization and the WebSite', () => {
    renderWithProviders(<Seo title="Consulting in Rīga" description="d" path="/" locale="lv" />)
    expect(types()).toEqual(['Organization', 'WebSite'])
  })

  it('gives an inner page its breadcrumb, starting from the translated home label', () => {
    renderWithProviders(<Seo title="Par projektu" description="d" path="/par-projektu" locale="lv" />, { route: '/par-projektu' })
    const breadcrumb = jsonLd().find((block) => block['@type'] === 'BreadcrumbList')
    const items = breadcrumb?.itemListElement as Array<Record<string, unknown>>
    expect(items.map((item) => item.name)).toEqual([resources.lv.common.nav.map, 'Par projektu'])
    expect(String(items[1]?.item)).toMatch(/[^/]\/par-projektu$/)
  })

  it('describes the organisation with the map page description, the site\'s own', () => {
    renderWithProviders(<Seo title="Par projektu" description="d" path="/par-projektu" locale="lv" />)
    const organization = jsonLd().find((block) => block['@type'] === 'Organization')
    expect(organization?.description).toBe(resources.lv.map.meta.description)
  })

  it('keeps a noIndex page out of the index', () => {
    renderWithProviders(<Seo title="Not found" description="d" path="/nope" locale="lv" noIndex />)
    expect(content('meta[name="robots"]')).toBe('noindex, nofollow')
    expect(types()).toEqual(['Organization'])
  })

  it('does not accumulate tags when the page changes', () => {
    const { rerender } = renderWithProviders(<Seo title="About" description="a" path="/about" locale="lv" />)
    rerender(<Seo title="Contact" description="c" path="/contact" locale="lv" />)

    expect(count('meta[name="description"]')).toBe(1)
    expect(count('link[rel="canonical"]')).toBe(1)
    expect(count('script[type="application/ld+json"]')).toBe(2)
    expect(content('meta[name="description"]')).toBe('c')
  })

  it('removes everything it wrote when the page goes away', () => {
    const { unmount } = renderWithProviders(<Seo title="About" description="a" path="/about" locale="lv" />)
    unmount()
    expect(count('[data-seo]')).toBe(0)
  })
})
