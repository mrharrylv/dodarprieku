import { describe, expect, it } from 'vitest'
import { validateProfile } from '../../../shared/src/validate'
import { importedItem } from '../test/imported'
import { isImportedCharity, isImportedProfile } from './imported'

const base = importedItem(1)
const withProfile = (patch: (p: Record<string, any>) => Record<string, any>) => ({
  ...base, profile: patch(structuredClone(base.profile) as unknown as Record<string, any>),
})

describe('isImportedProfile', () => {
  it('accepts what the import writes, which validateProfile (rightly) refuses', () => {
    expect(isImportedProfile(base.profile)).toBe(true)
    expect(isImportedCharity(base)).toBe(true)
    expect(validateProfile(base.profile).ok).toBe(false)
    expect(isImportedProfile({ ...base.profile, organization: { ...base.profile.organization, website: 'https://a.lv' } })).toBe(true)
    expect(isImportedProfile({ ...base.profile, delivery: { parcelLockers: [] } })).toBe(true)
    const org = { ...base.profile.organization, email: 'info@a.lv', facebook: 'https://facebook.com/a', instagram: 'http://instagram.com/a' }
    expect(isImportedProfile({ ...base.profile, organization: org })).toBe(true)
    expect(isImportedProfile({ ...base.profile, delivery: { parcelLockers: [], post: { address: 'Iela 1' }, dropOff: { address: 'x', hours: '9-17' } } })).toBe(true)
  })

  it.each([
    ['no name', (p: any) => ({ ...p, organization: { ...p.organization, name: '' } })],
    ['long name', (p: any) => ({ ...p, organization: { ...p.organization, name: 'x'.repeat(121) } })],
    ['unknown legal form', (p: any) => ({ ...p, organization: { ...p.organization, legalForm: 'sia' } })],
    ['public benefit not boolean', (p: any) => ({ ...p, organization: { ...p.organization, publicBenefit: 'no' } })],
    ['website not a string', (p: any) => ({ ...p, organization: { ...p.organization, website: 1 } })],
    ['a javascript: website', (p: any) => ({ ...p, organization: { ...p.organization, website: 'javascript:alert(1)' } })],
    ['a non-http facebook', (p: any) => ({ ...p, organization: { ...p.organization, facebook: 'facebook.com/a' } })],
    ['a non-http instagram', (p: any) => ({ ...p, organization: { ...p.organization, instagram: 'data:text/html,x' } })],
    ['an invalid organisation e-mail', (p: any) => ({ ...p, organization: { ...p.organization, email: 'not an e-mail' } })],
    ['an e-mail that is not a string', (p: any) => ({ ...p, organization: { ...p.organization, email: 1 } })],
    ['an invalid contact e-mail', (p: any) => ({ ...p, contactPerson: { ...p.contactPerson, email: 'x@' } })],
    ['an unknown organisation key', (p: any) => ({ ...p, organization: { ...p.organization, admin: true } })],
    ['an unknown contact key', (p: any) => ({ ...p, contactPerson: { ...p.contactPerson, password: 'x' } })],
    ['an unknown address key', (p: any) => ({ ...p, address: { ...p.address, html: '<b>' } })],
    ['an unknown location key', (p: any) => ({ ...p, location: { ...p.location, alt: 1 } })],
    ['an unknown delivery key', (p: any) => ({ ...p, delivery: { ...p.delivery, drone: {} } })],
    ['an unknown place key', (p: any) => ({ ...p, delivery: { parcelLockers: [], inPerson: { address: 'x', script: 'y' } } })],
    ['a post place with hours', (p: any) => ({ ...p, delivery: { parcelLockers: [], post: { address: 'x', hours: 'y' } } })],
    ['a bad hours value', (p: any) => ({ ...p, delivery: { parcelLockers: [], inPerson: { address: 'x', hours: 1 } } })],
    ['an unknown profile key', (p: any) => ({ ...p, status: 'approved' })],
    ['no contact object', (p: any) => ({ ...p, contactPerson: null })],
    ['address missing city', (p: any) => ({ ...p, address: { street: 'x', postalCode: '' } })],
    ['location outside Latvia', (p: any) => ({ ...p, location: { lat: 40, lng: 24 } })],
    ['location not numbers', (p: any) => ({ ...p, location: { lat: '56', lng: 24 } })],
    ['unknown category', (p: any) => ({ ...p, category: 'casino' })],
    ['empty description', (p: any) => ({ ...p, description: '' })],
    ['a photo that is not a media key', (p: any) => ({ ...p, photos: ['http://x/y.jpg'] })],
    ['a bad logo', (p: any) => ({ ...p, logo: 'x' })],
    ['invented needs', (p: any) => ({ ...p, needs: [{ itemId: 'konservi', urgent: true }] })],
    ['parcel lockers', (p: any) => ({ ...p, delivery: { parcelLockers: [{ provider: 'omniva' }] } })],
    ['a bad in-person place', (p: any) => ({ ...p, delivery: { parcelLockers: [], inPerson: { address: 1 } } })],
    ['sponsors', (p: any) => ({ ...p, sponsors: [{ name: 'x' }] })],
  ])('refuses %s', (_label, patch) => {
    expect(isImportedCharity(withProfile(patch))).toBe(false)
  })

  it('refuses bad ids, slugs, sources and non-objects', () => {
    expect(isImportedCharity({ ...base, id: 'dev-0001' })).toBe(false)
    expect(isImportedCharity({ ...base, slug: 'Not A Slug' })).toBe(false)
    expect(isImportedCharity({ ...base, slug: 'a'.repeat(61) })).toBe(false)
    expect(isImportedCharity({ ...base, source: 'sample' })).toBe(false)
    expect(isImportedCharity({ ...base, status: 'approved' })).toBe(false)
    expect(isImportedCharity(null)).toBe(false)
    expect(isImportedCharity([])).toBe(false)
    expect(isImportedProfile('x')).toBe(false)
  })
})
