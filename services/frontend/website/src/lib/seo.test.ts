import { describe, it, expect } from 'vitest'

import { DEFAULT_LOCALE, SITE, LOCALES } from '@/config/site'
import { SHARE_IMAGE } from '@/config/constants'
import {
  absoluteUrl,
  alternateLinks,
  buildTitle,
  canonicalUrl,
  ogLocale,
  robotsContent,
  shareImagePath,
  socialTags,
  truncateDescription,
} from './seo'

describe('buildTitle', () => {
  it('appends the brand', () => {
    expect(buildTitle('About us')).toBe(`About us · ${SITE.name}`)
  })

  it('does not repeat the brand on the home page', () => {
    expect(buildTitle(SITE.name)).toBe(SITE.name)
    expect(buildTitle('')).toBe(SITE.name)
    expect(buildTitle('   ')).toBe(SITE.name)
  })

  it('never produces "Home · Brand": a generic label gives the brand alone', () => {
    expect(buildTitle('Home', ['Home'])).toBe(SITE.name)
    expect(buildTitle(' home ', ['Home'])).toBe(SITE.name)
    expect(buildTitle('Sākums', ['Home', 'Sākums'])).toBe(SITE.name)
  })

  it('keeps a real phrase that merely contains the label', () => {
    expect(buildTitle('Home renovation in Rīga', ['Home'])).toBe(`Home renovation in Rīga · ${SITE.name}`)
  })

  it('trims the title it keeps', () => {
    expect(buildTitle('  About us ')).toBe(`About us · ${SITE.name}`)
  })
})

describe('truncateDescription', () => {
  it('leaves a short description alone', () => {
    expect(truncateDescription('Short and sweet.')).toBe('Short and sweet.')
  })

  it('collapses whitespace', () => {
    expect(truncateDescription('Too   many\n\nspaces')).toBe('Too many spaces')
  })

  it('cuts at a word boundary rather than mid-word', () => {
    const text = `${'word '.repeat(60)}end`
    const result = truncateDescription(text, 50)

    expect(result.length).toBeLessThanOrEqual(50)
    expect(result.endsWith('…')).toBe(true)
    // The character before the ellipsis must not be a half-word remnant.
    expect(result).not.toMatch(/wo…$/)
  })

  it('still truncates a single unbroken word', () => {
    const result = truncateDescription('a'.repeat(200), 50)
    expect(result.length).toBeLessThanOrEqual(50)
    expect(result.endsWith('…')).toBe(true)
  })
})

describe('absoluteUrl and canonicalUrl', () => {
  it('builds a root-relative URL when no origin is configured', () => {
    // VITE_SITE_URL is unset in tests, and jsdom's origin is localhost, so the
    // runtime origin is used. Either way the path must be right.
    expect(absoluteUrl('/about')).toMatch(/\/about$/)
  })

  it('normalises a path without a leading slash', () => {
    expect(absoluteUrl('about')).toMatch(/\/about$/)
  })

  it('puts no locale in the canonical URL of a one-language site', () => {
    expect(canonicalUrl('/par-projektu', 'lv')).toMatch(/[^/]\/par-projektu$/)
    expect(canonicalUrl('/par-projektu', 'lv')).not.toMatch(/\/lv\//)
  })
})

describe('alternateLinks', () => {
  it('emits one link per locale plus x-default', () => {
    const links = alternateLinks('/about')
    expect(links).toHaveLength(LOCALES.length + 1)
  })

  it('includes every configured language', () => {
    const langs = alternateLinks('/about').map((l) => l.hrefLang)
    for (const locale of LOCALES) {
      expect(langs).toContain(locale.htmlLang)
    }
    expect(langs).toContain('x-default')
  })

  it('points each language at its own URL for the SAME page', () => {
    const links = alternateLinks('/legal/terms')
    for (const link of links) {
      expect(link.href).toMatch(/\/legal\/terms$/)
    }
  })

  it('normalises an already-prefixed path', () => {
    const links = alternateLinks('/ru/about')
    expect(links.every((l) => !l.href.includes('/ru/ru/'))).toBe(true)
  })

  it('sets x-default to the default locale (default-locale.test.ts moves it off the first entry)', () => {
    const links = alternateLinks('/about')
    const xDefault = links.find((l) => l.hrefLang === 'x-default')
    const fallback = links.find((l) => l.hrefLang === LOCALES.find((locale) => locale.code === DEFAULT_LOCALE)?.htmlLang)
    expect(xDefault?.href).toBe(fallback?.href)
  })
})

describe('socialTags', () => {
  const meta = {
    title: 'About us',
    description: 'What we do and who we are.',
    path: '/about',
    locale: 'lv' as const,
  }

  it('includes the tags a share card needs', () => {
    const keys = socialTags(meta).map(([key]) => key)
    for (const required of [
      'og:type',
      'og:title',
      'og:description',
      'og:url',
      'og:image',
      'twitter:card',
    ]) {
      expect(keys).toContain(required)
    }
  })

  it('uses the branded title', () => {
    const tags = new Map(socialTags(meta))
    expect(tags.get('og:title')).toBe(`About us · ${SITE.name}`)
  })

  it('falls back to the default share image', () => {
    const tags = new Map(socialTags(meta))
    expect(tags.get('og:image')).toMatch(/\/og-image\.png\?v=[0-9a-f]{8}$/)
  })

  it('uses a supplied image when there is one', () => {
    const tags = new Map(socialTags({ ...meta, image: '/custom.png' }))
    expect(tags.get('og:image')).toMatch(/\/custom\.png$/)
  })

  it("gives the generated card's size and alt text", () => {
    const tags = new Map(socialTags(meta))
    expect(tags.get('og:image:width')).toBe(String(SHARE_IMAGE.width))
    expect(tags.get('og:image:height')).toBe(String(SHARE_IMAGE.height))
    expect(tags.get('og:image:alt')).toBe(SITE.wordmark)
  })

  it('declares the card as a PNG, and a custom image by its extension only', () => {
    expect(new Map(socialTags(meta)).get('og:image:type')).toBe(SHARE_IMAGE.type)
    expect(new Map(socialTags({ ...meta, image: '/custom.jpg' })).get('og:image:type')).toBe('image/jpeg')
    expect(new Map(socialTags({ ...meta, image: '/custom.webp' })).get('og:image:type')).toBe('image/webp')
    expect(socialTags({ ...meta, image: '/custom' }).map(([key]) => key)).not.toContain('og:image:type')
  })

  it("names the page's language in Open Graph form and the others as alternates", () => {
    const tags = socialTags({ ...meta, locale: 'lv' })
    expect(tags.filter(([key]) => key === 'og:locale')).toEqual([['og:locale', 'lv_LV']])
    expect(tags.filter(([key]) => key === 'og:locale:alternate').map(([, value]) => value)).toEqual(
      LOCALES.filter((locale) => locale.code !== 'lv').map((locale) => ogLocale(locale.code)),
    )
  })

  it("does not guess a custom image's size", () => {
    const keys = socialTags({ ...meta, image: '/custom.png' }).map(([key]) => key)
    expect(keys).not.toContain('og:image:width')
    expect(keys).not.toContain('og:image:height')
  })

  it('applies the generic-title guard to the card titles too', () => {
    const tags = new Map(socialTags({ ...meta, title: 'Home' }, ['Home']))
    expect(tags.get('og:title')).toBe(SITE.name)
    expect(tags.get('twitter:title')).toBe(SITE.name)
  })

  it('emits each key once, except the alternates of og:locale', () => {
    const keys = socialTags(meta).map(([key]) => key).filter((key) => key !== 'og:locale:alternate')
    expect(new Set(keys).size).toBe(keys.length)
  })
})

describe('robotsContent', () => {
  it('asks for the large image preview on an indexable page', () => {
    expect(robotsContent()).toBe('max-image-preview:large')
    expect(robotsContent(false)).toBe('max-image-preview:large')
  })

  it('keeps a noIndex page out of the index and its links unfollowed', () => {
    expect(robotsContent(true)).toBe('noindex, nofollow')
  })
})

describe('ogLocale', () => {
  it('writes language_TERRITORY, which Facebook wants and a bare language code is not', () => {
    expect(ogLocale('en')).toBe('en_US')
    expect(ogLocale('lv')).toBe('lv_LV')
    expect(ogLocale('ru')).toBe('ru_RU')
  })

  it('derives a territory for a language the table does not list', () => {
    expect(ogLocale('de')).toBe('de_DE')
  })
})

describe('shareImagePath', () => {
  it('versions the card by its content, so a changed card is a new URL and chat apps refetch it', () => {
    expect(shareImagePath()).toMatch(/^\/og-image\.png\?v=[0-9a-f]{8}$/)
  })
})
