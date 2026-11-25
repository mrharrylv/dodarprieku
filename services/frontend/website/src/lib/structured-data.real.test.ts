import { describe, it, expect, vi } from 'vitest'

import { organizationJsonLd, websiteJsonLd } from './structured-data'
import { LOCALES } from '@/config/site'

/**
 * The other half of `structured-data.test.ts`: with REAL details in the
 * config, they are published. Without this, a function that omitted
 * everything would pass every placeholder test.
 */
vi.mock('@/config/site', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/config/site')>()
  const social = {
    facebook: '',
    instagram: 'https://www.instagram.com/hagroup',
    linkedin: 'https://www.linkedin.com/company/example',
  }
  return {
    ...original,
    SITE: { ...original.SITE, name: 'HA Group', shortName: 'HAG', domain: 'hagroup.lv' },
    CONTACT: {
      ...original.CONTACT,
      email: 'info@hagroup.lv',
      phone: '+371 26 123 456',
      phoneE164: '+37126123456',
      address: { street: 'Brīvības iela 21', city: 'Rīga', postalCode: 'LV-1050', country: 'Latvia' },
    },
    COMPANY: {
      ...original.COMPANY,
      legalName: 'SIA "HA Group"',
      registrationNumber: '40203123456',
      vatNumber: 'LV40203123456',
      iban: 'LV80BANK0000435195001',
    },
    activeSocial: () => Object.entries(social).filter(([, url]) => url.length > 0),
  }
})

describe('organizationJsonLd with real details', () => {
  const data = organizationJsonLd('DevOps consulting and cloud engineering.')

  it('publishes the contact and company details', () => {
    expect(data).toMatchObject({
      name: 'HA Group',
      email: 'info@hagroup.lv',
      telephone: '+37126123456',
      legalName: 'SIA "HA Group"',
      taxID: '40203123456',
      vatID: 'LV40203123456',
      description: 'DevOps consulting and cloud engineering.',
    })
  })

  it('publishes the full address', () => {
    expect(data.address).toEqual({
      '@type': 'PostalAddress',
      streetAddress: 'Brīvības iela 21',
      addressLocality: 'Rīga',
      postalCode: 'LV-1050',
      addressCountry: 'LV',
    })
  })

  it('offers a contact point in every site language', () => {
    expect(data.contactPoint).toEqual([
      expect.objectContaining({
        '@type': 'ContactPoint',
        email: 'info@hagroup.lv',
        telephone: '+37126123456',
        availableLanguage: LOCALES.map((locale) => locale.htmlLang),
      }),
    ])
  })

  it('lists the real profile and drops the placeholder one', () => {
    expect(data.sameAs).toEqual(['https://www.instagram.com/hagroup'])
  })

  it('still never publishes the IBAN', () => {
    expect(JSON.stringify(data)).not.toContain('LV80BANK')
  })
})

describe('websiteJsonLd with real details', () => {
  it('offers the short name and the domain as alternate names', () => {
    expect(websiteJsonLd().alternateName).toEqual(['HAG', 'hagroup.lv'])
  })
})
