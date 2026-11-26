import { describe, expect, it } from 'vitest'

import {
  categoryCounts,
  mapCharities,
  needKindCounts,
  NO_FILTER,
  coverUrl,
  filterCharities,
  findBySlug,
  groupNeeds,
  isPublicCharity,
  isPublicSnapshot,
  mediaUrl,
  normaliseSearch,
  parseSnapshot,
  safeHref,
  toFeatureCollection,
  topNeeds,
  topSponsors,
} from './snapshot'
import { NEED_KINDS } from '@shared/catalog'

import { childrenHome, PHOTO_KEY, shelter, snapshotFixture } from './snapshot.fixtures'

describe('snapshot guard', () => {
  it('accepts a valid snapshot and every valid charity', () => {
    expect(isPublicSnapshot(snapshotFixture)).toBe(true)
    expect(isPublicCharity(shelter)).toBe(true)
    expect(isPublicCharity({ ...shelter, demoNeeds: true })).toBe(true)
    expect(isPublicCharity({ ...shelter, demoNeeds: 'yes' })).toBe(false)
    expect(isPublicCharity({ ...shelter, claimable: true })).toBe(true)
    expect(isPublicCharity({ ...shelter, claimable: 'yes' })).toBe(false)
    expect(parseSnapshot(JSON.parse(JSON.stringify(snapshotFixture)))).toEqual(snapshotFixture)
  })

  it.each([null, 'x', [], {}, { generatedAt: 1, charities: [], sponsorLeaderboard: [] }, { generatedAt: 'x', charities: {} }])(
    'rejects %j',
    (value) => {
      expect(parseSnapshot(value)).toBeNull()
    },
  )

  it('drops a malformed charity or leaderboard entry instead of the whole map', () => {
    const broken = [
      { ...shelter, slug: '' },
      { ...shelter, profile: { ...shelter.profile, category: 'nav-tada' } },
      { ...shelter, profile: { ...shelter.profile, location: { lat: 'x', lng: 1 } } },
      { ...shelter, profile: { ...shelter.profile, needs: [{ itemId: 1 }] } },
      { ...shelter, profile: { ...shelter.profile, sponsors: [{}] } },
      { ...shelter, profile: { ...shelter.profile, delivery: null } },
      { ...shelter, profile: null },
      { ...shelter, profile: { ...shelter.profile, organization: { name: 'X' } } },
      { ...shelter, profile: { ...shelter.profile, organization: { ...shelter.profile.organization, phone: 1 } } },
      { ...shelter, profile: { ...shelter.profile, organization: { ...shelter.profile.organization, website: 5 } } },
      'nonsense',
    ]
    const parsed = parseSnapshot({
      ...snapshotFixture,
      charities: [...broken, childrenHome],
      sponsorLeaderboard: [{ name: 'X' }, { name: 'Y', charities: 2 }],
    })
    expect(parsed?.charities).toEqual([childrenHome])
    expect(parsed?.sponsorLeaderboard).toEqual([{ name: 'Y', charities: 2 }])
  })
})

describe('media and links', () => {
  it('builds media URLs only from real media keys', () => {
    expect(mediaUrl(PHOTO_KEY)).toBe(`/media/${PHOTO_KEY}`)
    expect(mediaUrl('../etc/passwd')).toBeUndefined()
    expect(mediaUrl(undefined)).toBeUndefined()
    expect(coverUrl(shelter)).toBe(`/media/${PHOTO_KEY}`)
    expect(coverUrl(childrenHome)).toBeUndefined()
  })

  it('lets only http(s) links through', () => {
    expect(safeHref('https://a.test/x')).toBe('https://a.test/x')
    expect(safeHref('http://a.test')).toBe('http://a.test/')
    expect(safeHref('http://nav')).toBeUndefined()
    expect(safeHref('javascript:alert(1)')).toBeUndefined()
    expect(safeHref('not a url')).toBeUndefined()
    expect(safeHref('')).toBeUndefined()
    expect(safeHref(undefined)).toBeUndefined()
  })
})

describe('search and filters', () => {
  const all = snapshotFixture.charities

  it('ignores case and diacritics', () => {
    expect(normaliseSearch('  Rīga   Ēdole ')).toBe('riga edole')
    expect(filterCharities(all, { query: 'riga', category: null, kinds: [] })).toEqual([shelter])
    expect(filterCharities(all, { query: 'CĒSIS', category: null, kinds: [] })).toEqual([childrenHome])
    expect(filterCharities(all, { query: 'ulubele', category: null, kinds: [] })).toEqual([shelter])
  })

  it('filters by category and sorts by name in Latvian order', () => {
    expect(filterCharities(all, { query: '', category: 'bernu-nams', kinds: [] })).toEqual([childrenHome])
    expect(filterCharities(all, { query: '', category: null, kinds: [] }).map((c) => c.id)).toEqual(['c-cesis', 'c-ulubele'])
    expect(filterCharities(all, { query: 'zzz', category: null, kinds: [] })).toEqual([])
  })

  it('does not reorder its input', () => {
    const input = [shelter, childrenHome]
    filterCharities(input, { query: '', category: null, kinds: [] })
    expect(input).toEqual([shelter, childrenHome])
  })

  it('counts the organisations with needs in each category; one with none only keeps its chip at 0 while no kind is chosen', () => {
    expect(categoryCounts(all, { query: '', kinds: [] })).toEqual([
      { id: 'dzivnieku-patversme', count: 1 },
      { id: 'bernu-nams', count: 0 },
    ])
    expect(categoryCounts(all, { query: 'cēs', kinds: [] })).toEqual([{ id: 'bernu-nams', count: 0 }])
    expect(categoryCounts(all, { query: '', kinds: ['dzivnieki'] })).toEqual([{ id: 'dzivnieku-patversme', count: 1 }])
    expect(categoryCounts(all, { query: '', kinds: ['macibas'] })).toEqual([])
  })

  it('filters by need kind: any one need of a chosen kind, so an organisation without needs never matches one', () => {
    expect(filterCharities(all, { query: '', category: null, kinds: ['dzivnieki'] })).toEqual([shelter])
    expect(filterCharities(all, { query: '', category: null, kinds: ['macibas', 'dzivnieki'] })).toEqual([shelter])
    expect(filterCharities(all, { query: '', category: null, kinds: ['macibas'] })).toEqual([])
    expect(filterCharities(all, { query: '', category: 'bernu-nams', kinds: ['dzivnieki'] })).toEqual([])
  })

  it('splits what the map draws: with needs (clustered) and without (faded)', () => {
    expect(mapCharities(all, NO_FILTER)).toEqual({ active: [shelter], faded: [childrenHome] })
    expect(mapCharities(all, { ...NO_FILTER, category: 'bernu-nams' })).toEqual({ active: [], faded: [childrenHome] })
    expect(mapCharities(all, { ...NO_FILTER, kinds: ['dzivnieki'] })).toEqual({ active: [shelter], faded: [] })
    expect(mapCharities(all, { ...NO_FILTER, query: 'zzz' })).toEqual({ active: [], faded: [] })
  })

  it('counts every need kind among the matches of the search and the category', () => {
    const counts = needKindCounts(all, { query: '', category: null })
    expect(counts.map((c) => c.id)).toEqual(NEED_KINDS.map((k) => k.id))
    expect(counts.find((c) => c.id === 'dzivnieki')).toEqual({ id: 'dzivnieki', count: 1 })
    expect(counts.filter((c) => c.count > 0)).toHaveLength(1)
    expect(needKindCounts(all, { query: '', category: 'bernu-nams' }).every((c) => c.count === 0)).toBe(true)
    expect(needKindCounts(all, { query: 'cēs', category: null }).every((c) => c.count === 0)).toBe(true)
  })

  it('finds by slug', () => {
    expect(findBySlug(all, 'ulubele')).toBe(shelter)
    expect(findBySlug(all, 'nav')).toBeUndefined()
    expect(findBySlug(all, undefined)).toBeUndefined()
  })
})

describe('needs', () => {
  it('puts urgent needs first, up to the limit', () => {
    expect(topNeeds(shelter).map((n) => n.label)).toEqual(['Kaķu pakaiši', 'Sausā barība suņiem', 'Suņu būdas'])
    expect(topNeeds(shelter, 1)).toEqual([{ key: 'smiltis', label: 'Kaķu pakaiši', urgent: true }])
    expect(topNeeds(childrenHome)).toEqual([])
  })

  it('groups needs as the catalog does, custom ones last, with pledge keys', () => {
    const groups = groupNeeds(shelter, 'Citas')
    expect(groups.map((g) => g.label)).toEqual(['Barība', 'Aprūpe', 'Citas'])
    expect(groups[0]?.needs[0]).toEqual({ key: 'sausa-bariba-suniem', label: 'Sausā barība suņiem', urgent: false, note: 'tikai bez graudiem' })
    expect(groups[2]?.needs[0]).toEqual({ key: 'custom:2', label: 'Suņu būdas', urgent: false })
    expect(groupNeeds(childrenHome, 'Citas')).toEqual([])
  })
})

describe('leaderboard and map data', () => {
  it('ranks sponsors by charities, then name, top N', () => {
    expect(topSponsors(snapshotFixture.sponsorLeaderboard).map((s) => s.name)).toEqual(['SIA Labie', 'AS Bez saites', 'SIA Mazie'])
    expect(topSponsors(snapshotFixture.sponsorLeaderboard, 1)).toHaveLength(1)
    const many = Array.from({ length: 14 }, (_, i) => ({ name: `S${i}`, charities: 1 }))
    expect(topSponsors(many)).toHaveLength(10)
  })

  it('turns charities into GeoJSON points, longitude first', () => {
    const fc = toFeatureCollection([shelter])
    expect(fc.features[0]).toEqual({
      type: 'Feature',
      properties: { id: 'c-ulubele', category: 'dzivnieku-patversme' },
      geometry: { type: 'Point', coordinates: [24.1, 56.95] },
    })
  })
})
