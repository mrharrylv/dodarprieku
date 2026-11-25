import { describe, it, expect } from 'vitest'

import { COMPANY, CONTACT, LOCALES, ROUTES, SITE, activeSocial } from '@/config/site'
import { LOGO_IMAGE } from '@/config/constants'
import { isPlaceholder } from './placeholder'
import { absoluteUrl } from './seo'
import {
  breadcrumbJsonLd,
  organizationId,
  organizationJsonLd,
  structuredDataFor,
  websiteId,
  websiteJsonLd,
} from './structured-data'

/**
 * These run against whatever `config/site.ts` holds: the template's
 * placeholders here, a real company's details once a site fills them in. So
 * the assertions are "published exactly when real", never "absent", and
 * `structured-data.real.test.ts` proves the real-value side with a mocked
 * config.
 */

/** Every string anywhere in a JSON-LD object. */
const strings = (value: unknown): string[] => {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.flatMap(strings)
  if (value !== null && typeof value === 'object') return Object.values(value).flatMap(strings)
  return []
}

const input = {
  locale: 'lv' as const,
  title: 'Par projektu',
  homeLabel: 'Karte',
  siteDescription: 'Latvijas labdarības karte.',
}

describe('organizationJsonLd', () => {
  const data = organizationJsonLd('What we do.')

  it('is a schema.org Organization with a stable id', () => {
    expect(data['@context']).toBe('https://schema.org')
    expect(data['@type']).toBe('Organization')
    expect(data.name).toBe(SITE.name)
    expect(data['@id']).toBe(organizationId())
    expect(data.url).toBe(absoluteUrl('/'))
  })

  it('uses the square raster logo, not the SVG favicon', () => {
    expect(data.logo).toEqual({
      '@type': 'ImageObject',
      url: absoluteUrl(LOGO_IMAGE.path),
      width: LOGO_IMAGE.width,
      height: LOGO_IMAGE.height,
    })
    expect(JSON.stringify(data)).not.toContain('favicon.svg')
  })

  it('publishes no placeholder value, anywhere in the object', () => {
    expect(strings(data).filter((value) => isPlaceholder(value))).toEqual([])
    expect(JSON.stringify(data)).not.toMatch(/X{3,}|example\.com|Example street/)
  })

  it.each([
    ['email', CONTACT.email],
    ['telephone', CONTACT.phoneE164],
    ['legalName', COMPANY.legalName],
    ['taxID', COMPANY.registrationNumber],
    ['vatID', COMPANY.vatNumber],
  ])('publishes %s exactly when the config value is real', (key, value) => {
    if (isPlaceholder(value)) expect(data).not.toHaveProperty(key)
    else expect(data[key]).toBe(value.trim())
  })

  it('never publishes the IBAN', () => {
    // Empty when it is not published at all, and "" is in every string.
    expect(JSON.stringify(data).toLowerCase()).not.toContain('iban')
    if (COMPANY.iban !== '') expect(JSON.stringify(data)).not.toContain(COMPANY.iban)
  })

  it('keeps only the country when the street is a placeholder', () => {
    const address = data.address as Record<string, unknown>
    expect(address.addressCountry).toBe(SITE.country)
    if (isPlaceholder(CONTACT.address.street)) {
      expect(Object.keys(address).sort()).toEqual(['@type', 'addressCountry'])
    }
  })

  it('carries the description it is given, and none when it is given none', () => {
    expect(data.description).toBe('What we do.')
    expect(organizationJsonLd()).not.toHaveProperty('description')
  })

  it.each([
    "Replace this with one sentence describing what the business does and who it is for. It is the line that appears under the site's name in search results.",
    'Aizstājiet šo ar vienu teikumu par to, ko uzņēmums dara un kam tas ir domāts.',
    'Замените этот текст одним предложением о том, чем занимается компания и для кого.',
  ])("withholds the template's instruction in place of a description: %s", (instruction) => {
    expect(organizationJsonLd(instruction)).not.toHaveProperty('description')
  })

  it('publishes a real description that happens to say "example"', () => {
    const real = 'Web shops for bakeries, for example, and for anyone else who sells by the kilo.'
    expect(organizationJsonLd(real).description).toBe(real)
  })

  it('lists only real social profiles', () => {
    const real = activeSocial()
      .map(([, url]) => url)
      .filter((url) => !isPlaceholder(url))
    if (real.length === 0) expect(data).not.toHaveProperty('sameAs')
    else expect(data.sameAs).toEqual(real)
  })

  it('offers a contact point only when there is a real way to make contact', () => {
    const reachable = !isPlaceholder(CONTACT.email) || !isPlaceholder(CONTACT.phoneE164)
    expect('contactPoint' in data).toBe(reachable)
  })
})

describe('websiteJsonLd', () => {
  const data = websiteJsonLd()

  it('names the site and points at its root, published by the organisation', () => {
    expect(data['@type']).toBe('WebSite')
    expect(data['@id']).toBe(websiteId())
    expect(data.name).toBe(SITE.name)
    expect(data.url).toBe(absoluteUrl('/'))
    expect(data.publisher).toEqual({ '@id': organizationId() })
  })

  it('lists every language the site is in', () => {
    const languages = LOCALES.map((locale) => locale.htmlLang)
    expect(data.inLanguage).toEqual(languages.length === 1 ? languages[0] : languages)
  })

  it('offers no alternate name that is the name itself or a placeholder', () => {
    const alternates = (data.alternateName ?? []) as string[]
    expect(alternates).not.toContain(SITE.name)
    expect(alternates.filter((name) => isPlaceholder(name))).toEqual([])
  })
})

describe('breadcrumbJsonLd', () => {
  it('numbers the trail from one', () => {
    const data = breadcrumbJsonLd(
      [
        { name: 'Home', path: '/' },
        { name: 'Services', path: '/services' },
      ],
      'lv',
    )

    const items = data.itemListElement as Array<Record<string, unknown>>
    expect(items).toHaveLength(2)
    expect(items[0]?.position).toBe(1)
    expect(items[1]?.position).toBe(2)
    expect(items[1]?.name).toBe('Services')
  })

  it('produces unprefixed URLs on a one-language site', () => {
    const data = breadcrumbJsonLd([{ name: 'About', path: '/par-projektu' }], 'lv')
    const items = data.itemListElement as Array<Record<string, unknown>>
    expect(String(items[0]?.item)).toMatch(/[^/]\/par-projektu$/)
  })
})

describe('structuredDataFor', () => {
  const typesOf = (blocks: readonly Record<string, unknown>[]) => blocks.map((block) => block['@type'])

  it('gives the home page the Organization and the WebSite', () => {
    expect(typesOf(structuredDataFor({ ...input, path: ROUTES.home }))).toEqual(['Organization', 'WebSite'])
  })

  it('gives any other page a Home > Page breadcrumb', () => {
    const blocks = structuredDataFor({ ...input, path: '/legal/privacy', title: 'Privacy' })
    expect(typesOf(blocks)).toEqual(['Organization', 'BreadcrumbList'])
    const crumbs = (blocks[1]?.itemListElement ?? []) as Array<Record<string, unknown>>
    expect(crumbs.map((crumb) => crumb.name)).toEqual(['Karte', 'Privacy'])
    expect(String(crumbs[1]?.item)).toMatch(/[^/]\/legal\/privacy$/)
  })

  it('gives a noIndex page the Organization only', () => {
    expect(typesOf(structuredDataFor({ ...input, path: '/nope', noIndex: true }))).toEqual(['Organization'])
  })

  it("describes the organisation with the site's own sentence", () => {
    const [organization] = structuredDataFor({ ...input, path: ROUTES.home })
    expect(organization?.description).toBe(input.siteDescription)
  })
})
