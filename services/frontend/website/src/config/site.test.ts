import { describe, it, expect } from 'vitest'

import {
  CHARITY_SLUG_PARAM,
  COMPANY,
  CONTACT,
  HA_GROUP_PROJECTS,
  LOCALES,
  NAV_LINKS,
  REGISTER_CTA,
  ROUTES,
  charityPath,
} from './site'
import { isPlaceholder } from '@/lib/placeholder'
import { CATEGORIES } from '@shared/catalog'
import { SNAPSHOT_PATH } from '@shared/contracts'

describe('the Dod ar prieku routes', () => {
  it('are the spec’s Latvian paths', () => {
    expect(ROUTES).toMatchObject({
      home: '/',
      charity: '/organizacija',
      register: '/registreties',
      account: '/konts',
      setPassword: '/konts/parole',
      forgotPassword: '/konts/aizmirsu',
      about: '/par-projektu',
    })
  })

  it('never name an admin page', () => {
    expect(Object.values(ROUTES).filter((route) => /admin/.test(route))).toEqual([])
    expect(NAV_LINKS.map((link) => link.to)).toEqual([ROUTES.home, ROUTES.about, ROUTES.account])
    expect(REGISTER_CTA.to).toBe(ROUTES.register)
  })

  it('build a charity address from its slug, encoded', () => {
    expect(CHARITY_SLUG_PARAM).toBe('slug')
    expect(charityPath('patversme-ausma')).toBe('/organizacija/patversme-ausma')
    expect(charityPath('bērnu nams/1')).toBe('/organizacija/b%C4%93rnu%20nams%2F1')
  })
})

describe('the operator', () => {
  it('is SIA HA Group, with real details and no published bank account', () => {
    expect(COMPANY.legalName).toBe('SIA HA Group')
    expect(COMPANY.registrationNumber).toBe('40203724866')
    expect(COMPANY.vatNumber).toBe('LV40203724866')
    expect(COMPANY.iban).toBe('')
    expect(CONTACT.email).toBe('info@hagroup.lv')
    for (const value of [COMPANY.legalName, COMPANY.registrationNumber, COMPANY.vatNumber, COMPANY.registeredAddress]) {
      expect(isPlaceholder(value), value).toBe(false)
    }
  })

  it('has no known phone, so the WhatsApp bubble is off', () => {
    expect(isPlaceholder(CONTACT.phone)).toBe(true)
    expect(CONTACT.whatsapp).toBe('')
  })
})

describe('the site', () => {
  it('is Latvian only', () => {
    expect(LOCALES.map((locale) => locale.code)).toEqual(['lv'])
  })

  it("links HA Group's other projects over https", () => {
    expect(HA_GROUP_PROJECTS.map((project) => project.name)).toEqual(['Unveil', 'Event App', 'Baltic GP', 'HA Group'])
    for (const project of HA_GROUP_PROJECTS) expect(new URL(project.url).protocol).toBe('https:')
  })
})

describe('the @shared alias', () => {
  it('resolves the shared catalog and contracts', () => {
    expect(CATEGORIES.length).toBeGreaterThan(0)
    expect(SNAPSHOT_PATH).toBe('/data/charities.json')
  })
})
