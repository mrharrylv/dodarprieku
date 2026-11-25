import { describe, it, expect } from 'vitest'

import { LOCALES, SITE } from '@/config/site'
import { SHARE_IMAGE } from '@/config/constants'
import {
  HEAD_MARK,
  alternatesOf,
  canonicalOf,
  escapeHtml,
  headHtml,
  jsonLdText,
  metaContent,
  pageHead,
  type PageHead,
} from './head'
import { absoluteUrl, canonicalUrl, shareImagePath } from './seo'

const strings = { homeLabel: 'Home', siteDescription: 'We build things.', services: [] }

const links = (head: PageHead, rel: string) =>
  head.tags.filter((tag) => tag.kind === 'link' && tag.rel === rel)

const blocks = (head: PageHead) =>
  head.tags.flatMap((tag) => (tag.kind === 'json-ld' ? [tag.data] : []))

describe('pageHead', () => {
  const about = pageHead({ title: 'About', description: 'Who we are.', path: '/about', locale: 'lv' }, strings)

  it('titles the page with the brand, and sets the language', () => {
    expect(about.title).toBe(`About · ${SITE.name}`)
    expect(about.lang).toBe('lv')
  })

  it('titles a page called by the home label with the brand alone', () => {
    const home = pageHead({ title: 'Home', description: 'd', path: '/', locale: 'en' }, strings)
    expect(home.title).toBe(SITE.name)
  })

  it('declares one canonical, in the page locale', () => {
    expect(links(about, 'canonical')).toHaveLength(1)
    expect(canonicalOf(about)).toBe(canonicalUrl('/about', 'lv'))
  })

  it('points og:url at the canonical, not at the home page', () => {
    expect(metaContent(about, 'og:url')).toBe(canonicalOf(about))
  })

  it('offers every language and x-default as alternates', () => {
    const langs = links(about, 'alternate').map((tag) => (tag.kind === 'link' ? tag.hrefLang : null))
    expect(langs).toEqual([...LOCALES.map((locale) => locale.htmlLang), 'x-default'])
  })

  it('carries the description, the robots rule and the share card', () => {
    expect(metaContent(about, 'description')).toBe('Who we are.')
    expect(metaContent(about, 'robots')).toBe('max-image-preview:large')
    expect(metaContent(about, 'og:image')).toBe(absoluteUrl(shareImagePath()))
    expect(metaContent(about, 'og:image:type')).toBe(SHARE_IMAGE.type)
    expect(metaContent(about, 'og:locale')).toBe('lv_LV')
  })

  it('names the app for the home screen and the install prompt, on every page', () => {
    const notFound = pageHead({ title: 'Not found', description: 'd', path: '/404', locale: 'en', noIndex: true }, strings)
    for (const head of [about, notFound]) {
      expect(metaContent(head, 'application-name')).toBe(SITE.shortName)
      expect(metaContent(head, 'apple-mobile-web-app-title')).toBe(SITE.shortName)
    }
  })

  it('gives an inner page the Organization and its breadcrumb', () => {
    expect(blocks(about).map((block) => block['@type'])).toEqual(['Organization', 'BreadcrumbList'])
  })

  it('marks up the services the services page lists', () => {
    const services = pageHead(
      { title: 'Services', description: 'd', path: '/services', locale: 'en' },
      { ...strings, services: [{ name: 'Audit', description: 'We look.', slug: 'audit' }] },
    )
    expect(blocks(services).map((block) => block['@type'])).toEqual(['Organization', 'BreadcrumbList', 'ItemList'])
  })

  describe('on a noIndex page', () => {
    const missing = pageHead(
      { title: 'Not found', description: 'Gone.', path: '/404', locale: 'en', noIndex: true },
      strings,
    )

    it('says noindex', () => {
      expect(metaContent(missing, 'robots')).toBe('noindex, nofollow')
    })

    it('declares no canonical, no alternates and no og:url', () => {
      expect(canonicalOf(missing)).toBeNull()
      expect(links(missing, 'alternate')).toEqual([])
      expect(metaContent(missing, 'og:url')).toBeNull()
    })

    it('still names the organisation, and nothing more', () => {
      expect(blocks(missing).map((block) => block['@type'])).toEqual(['Organization'])
    })
  })

  it('falls back to the default language for an unknown locale', () => {
    const odd = pageHead({ title: 't', description: 'd', path: '/', locale: 'xx' as 'en' }, strings)
    expect(odd.lang).toBe(SITE.defaultLang)
  })
})

describe('canonicalOf', () => {
  it('is null when a head declares two canonicals, which is as bad as none', () => {
    const doubled: PageHead = {
      title: 't',
      lang: 'en',
      tags: [
        { kind: 'link', rel: 'canonical', href: '/a' },
        { kind: 'link', rel: 'canonical', href: '/b' },
      ],
    }
    expect(canonicalOf(doubled)).toBeNull()
  })
})

describe('alternatesOf', () => {
  it('reads the hreflang alternates a head declares, x-default last, and nothing else', () => {
    const about = pageHead({ title: 'About', description: 'd', path: '/about', locale: 'ru' }, strings)
    const declared = alternatesOf(about)
    expect(declared.map((alternate) => alternate.hrefLang)).toEqual([...LOCALES.map((locale) => locale.htmlLang), 'x-default'])
    expect(declared.every((alternate) => alternate.href.endsWith('/about'))).toBe(true)
  })

  it('finds none on a page that declares none', () => {
    expect(alternatesOf(pageHead({ title: 'x', description: 'd', path: '/nope', locale: 'en', noIndex: true }, strings))).toEqual([])
  })
})

describe('escapeHtml', () => {
  it('escapes every character that can end an attribute or open a tag', () => {
    expect(escapeHtml(`a & b < c > d " e ' f`)).toBe('a &amp; b &lt; c &gt; d &quot; e &#39; f')
  })

  it('leaves Latvian and Russian alone', () => {
    expect(escapeHtml('Rīga, Москва')).toBe('Rīga, Москва')
  })
})

describe('jsonLdText', () => {
  it('cannot close its own script element', () => {
    const text = jsonLdText({ description: '</script><script>alert(1)</script>' })
    expect(text).not.toContain('</script>')
    expect(JSON.parse(text)).toEqual({ description: '</script><script>alert(1)</script>' })
  })
})

describe('headHtml', () => {
  const head = pageHead(
    { title: 'Par "mums" & <citi>', description: 'Kas mēs esam.', path: '/about', locale: 'lv' },
    strings,
  )
  const parsed = new DOMParser().parseFromString(`<html><head>${headHtml(head)}</head></html>`, 'text/html')

  it('round-trips through an HTML parser to the same values', () => {
    expect(parsed.title).toBe(head.title)
    expect(parsed.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(canonicalOf(head))
    expect(parsed.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('Kas mēs esam.')
    expect(parsed.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe(head.title)
  })

  it('marks every tag but the title, so the runtime replaces them', () => {
    const tags = [...parsed.head.children].filter((node) => node.tagName !== 'TITLE')
    expect(tags).toHaveLength(head.tags.length)
    expect(tags.every((node) => node.hasAttribute(HEAD_MARK))).toBe(true)
  })

  it('writes the JSON-LD as parseable data blocks', () => {
    const scripts = [...parsed.querySelectorAll('script[type="application/ld+json"]')]
    expect(scripts.map((script) => (JSON.parse(script.textContent ?? '') as { '@type': string })['@type'])).toEqual([
      'Organization',
      'BreadcrumbList',
    ])
  })

  it('puts one tag on each line, at the indent given', () => {
    expect(headHtml(head, '  ').split('\n  ')).toHaveLength(head.tags.length + 1)
  })
})
