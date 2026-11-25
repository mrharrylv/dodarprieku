import { describe, expect, it } from 'vitest'
import { profile } from '../test/fixtures'
import {
  SCALAR_PATHS, changedKeys, diffList, diffProfile, getPath, lockerKeyOf, needKeyOf, scalarStatus, sponsorKeyOf,
} from './diff'

describe('getPath', () => {
  it('reads nested values and returns undefined for missing branches', () => {
    expect(getPath({ a: { b: 1 } }, 'a.b')).toBe(1)
    expect(getPath({ a: {} }, 'a.b.c')).toBeUndefined()
    expect(getPath(null, 'a')).toBeUndefined()
    expect(getPath({ a: 'x' }, 'a.length')).toBeUndefined()
  })
})

describe('scalarStatus', () => {
  it.each([
    [undefined, undefined, 'unchanged'],
    ['', undefined, 'unchanged'],
    [undefined, '', 'unchanged'],
    ['a', 'a', 'unchanged'],
    [undefined, 'a', 'added'],
    ['', 'a', 'added'],
    ['a', undefined, 'removed'],
    ['a', '', 'removed'],
    ['a', 'b', 'changed'],
    [true, false, 'changed'],
    [false, false, 'unchanged'],
    [1, 2, 'changed'],
    [0, 0, 'unchanged'],
  ] as const)('%s -> %s is %s', (before, after, expected) => {
    expect(scalarStatus(before, after)).toBe(expected)
  })
})

describe('changedKeys', () => {
  it('lists differing keys, sorted, treating missing and empty alike', () => {
    expect(changedKeys({ a: 1, b: 'x' }, { a: 2, b: 'x' })).toEqual(['a'])
    expect(changedKeys({ note: 'x' }, {})).toEqual(['note'])
    expect(changedKeys({ note: '' }, {})).toEqual([])
    expect(changedKeys({ z: 1, a: 1 }, { z: 2, a: 2 })).toEqual(['a', 'z'])
    expect(changedKeys({ urgent: false }, { urgent: true })).toEqual(['urgent'])
  })
})

describe('diffList', () => {
  const key = (s: { id: string }) => s.id

  it('marks added, removed, changed and unchanged items in proposed order, removed last', () => {
    const before = [{ id: 'a', v: 1 }, { id: 'b', v: 1 }, { id: 'c', v: 1 }]
    const after = [{ id: 'd', v: 1 }, { id: 'a', v: 1 }, { id: 'b', v: 2 }]
    const out = diffList(before, after, key)
    expect(out.map((i) => [i.key, i.status])).toEqual([
      ['d', 'added'], ['a', 'unchanged'], ['b', 'changed'], ['c', 'removed'],
    ])
    expect(out[2]?.changedFields).toEqual(['v'])
    expect(out[0]?.before).toBeUndefined()
    expect(out[3]?.after).toBeUndefined()
  })

  it('reports moves only when order is tracked', () => {
    expect(diffList(['x', 'y'], ['y', 'x'], (s) => s).map((i) => i.status)).toEqual(['unchanged', 'unchanged'])
    expect(diffList(['x', 'y'], ['y', 'x'], (s) => s, true).map((i) => i.status)).toEqual(['moved', 'moved'])
    expect(diffList(['x', 'y', 'z'], ['x', 'z'], (s) => s, true).map((i) => i.status)).toEqual(['unchanged', 'moved', 'removed'])
  })

  it('pairs duplicate keys in order', () => {
    const out = diffList([{ id: 'a', v: 1 }, { id: 'a', v: 2 }], [{ id: 'a', v: 1 }], key)
    expect(out.map((i) => [i.key, i.status])).toEqual([['a', 'unchanged'], ['a#2', 'removed']])
  })

  it('handles empty lists both ways', () => {
    expect(diffList([], [], key)).toEqual([])
    expect(diffList([], [{ id: 'a' }], key)[0]?.status).toBe('added')
    expect(diffList([{ id: 'a' }], [], key)[0]?.status).toBe('removed')
  })

  it('never mutates its inputs', () => {
    const before = Object.freeze([Object.freeze({ id: 'a', v: 1 })])
    const after = Object.freeze([Object.freeze({ id: 'a', v: 2 })])
    expect(() => diffList(before, after, key)).not.toThrow()
  })
})

describe('keys', () => {
  it('matches custom needs by label, catalog needs by id', () => {
    expect(needKeyOf({ itemId: 'segas', urgent: false })).toBe('segas')
    expect(needKeyOf({ itemId: 'custom', customLabel: ' Galda Spēles ', urgent: false })).toBe('custom:galda spēles')
    expect(needKeyOf({ itemId: 'custom', urgent: false })).toBe('custom:')
  })
  it('matches sponsors by folded name and lockers by provider and id or name', () => {
    expect(sponsorKeyOf({ name: ' SIA Rimi ' })).toBe('sia rimi')
    expect(lockerKeyOf({ provider: 'dpd', lockerId: 'x1', name: 'A', address: 'B' })).toBe('dpd:x1')
    expect(lockerKeyOf({ provider: 'dpd', name: 'Rimi Ādaži', address: 'B' })).toBe('dpd:rimi ādaži')
  })
})

describe('diffProfile', () => {
  it('finds nothing between equal profiles', () => {
    const d = diffProfile(profile(), profile())
    expect(d.changeCount).toBe(0)
    expect(d.fields).toHaveLength(SCALAR_PATHS.length)
    expect(d.fields.every((f) => f.status === 'unchanged')).toBe(true)
  })

  it('diffs scalars, nested optional places and location', () => {
    const live = profile()
    const next = profile({
      organization: { ...live.organization, name: 'Jauns nosaukums', website: undefined as unknown as string, instagram: 'https://ig.example' },
      location: { lat: 57.1, lng: 24.32 },
      delivery: { ...live.delivery, inPerson: undefined as never, post: { address: 'Pasta iela 1' } },
      logo: undefined as unknown as string,
    })
    const d = diffProfile(live, next)
    const status = (p: string) => d.fields.find((f) => f.path === p)?.status
    expect(status('organization.name')).toBe('changed')
    expect(status('organization.website')).toBe('removed')
    expect(status('organization.instagram')).toBe('added')
    expect(status('location.lat')).toBe('changed')
    expect(status('location.lng')).toBe('unchanged')
    expect(status('delivery.inPerson.address')).toBe('removed')
    expect(status('delivery.inPerson.hours')).toBe('removed')
    expect(status('delivery.post.address')).toBe('added')
    expect(status('logo')).toBe('removed')
    expect(d.fields.find((f) => f.path === 'organization.name')).toMatchObject({ before: 'Patversme Ulubele', after: 'Jauns nosaukums' })
  })

  it('diffs needs, photos, sponsors and lockers item by item, and counts every change', () => {
    const live = profile()
    const next = profile({
      needs: [
        { itemId: 'sausa-bariba-suniem', urgent: false, note: 'Lielo šķirņu' },
        { itemId: 'segas', urgent: false },
      ],
      photos: ['uploads/2026/11/photo-bbbb2222.webp', 'uploads/2026/11/photo-aaaa1111.webp', 'uploads/2026/11/photo-dddd4444.webp'],
      sponsors: [{ name: 'sia barība', url: 'https://cits.example' }, { name: 'AS Jauns' }],
      delivery: { ...live.delivery, parcelLockers: [] },
    })
    const d = diffProfile(live, next)
    expect(d.needs.map((n) => [n.key, n.status])).toEqual([
      ['sausa-bariba-suniem', 'changed'], ['segas', 'added'], ['custom:kaķu mājiņas', 'removed'],
    ])
    expect(d.needs[0]?.changedFields).toEqual(['urgent'])
    expect(d.photos.map((p) => p.status)).toEqual(['moved', 'moved', 'added'])
    expect(d.sponsors.map((s) => [s.status, s.changedFields])).toEqual([['changed', ['name', 'url']], ['added', []]])
    expect(d.parcelLockers.map((l) => l.status)).toEqual(['removed'])
    expect(d.changeCount).toBe(3 + 3 + 2 + 1)
  })
})
