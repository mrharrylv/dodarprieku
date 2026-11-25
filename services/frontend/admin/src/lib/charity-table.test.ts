import { describe, expect, it } from 'vitest'
import { summary } from '../test/fixtures'
import { DEFAULT_QUERY, applyQuery, fold, matchesSearch, toggleSort } from './charity-table'

const rows = [
  summary({ id: '1', name: 'Ulubele', city: 'Ādaži', status: 'approved', views: 5, pledges: 1, updatedAt: '2026-11-03', passwordSet: true }),
  summary({ id: '2', name: 'Bērnu nams Rīga', city: 'Rīga', category: 'bernu-nams', status: 'pending', views: 0, pledges: 0, updatedAt: '2026-11-05', passwordSet: false, accountEmail: 'nams@riga.example' }),
  summary({ id: '3', name: 'Ārstu palīdzība', city: 'Cēsis', category: 'slimnica', status: 'suspended', views: 9, pledges: 4, updatedAt: '2026-11-01', hasPendingUpdate: true }),
  summary({ id: '4', name: 'Zupas virtuve', city: 'Rīga', category: 'zupas-virtuve', status: 'rejected', views: 9, pledges: 2, updatedAt: '2026-11-04' }),
]
const ids = (list: readonly { id: string }[]) => list.map((r) => r.id)

describe('fold and matchesSearch', () => {
  it('ignores case and diacritics', () => {
    expect(fold('  RĪGA Ķēķis ')).toBe('riga kekis')
  })
  it('requires every term and searches name, city, email and slug', () => {
    expect(matchesSearch(rows[1]!, 'riga nams')).toBe(true)
    expect(matchesSearch(rows[1]!, 'riga cesis')).toBe(false)
    expect(matchesSearch(rows[1]!, 'NAMS@RIGA')).toBe(true)
    expect(matchesSearch(rows[0]!, 'patversme-ulubele')).toBe(true)
    expect(matchesSearch(rows[0]!, '   ')).toBe(true)
  })
})

describe('applyQuery', () => {
  it('defaults to newest update first', () => {
    expect(ids(applyQuery(rows, DEFAULT_QUERY))).toEqual(['2', '4', '1', '3'])
  })
  it('filters by status, pending update and category', () => {
    expect(ids(applyQuery(rows, { ...DEFAULT_QUERY, status: 'pending' }))).toEqual(['2'])
    expect(ids(applyQuery(rows, { ...DEFAULT_QUERY, status: 'update' }))).toEqual(['3'])
    expect(ids(applyQuery(rows, { ...DEFAULT_QUERY, category: 'zupas-virtuve' }))).toEqual(['4'])
    expect(ids(applyQuery(rows, { ...DEFAULT_QUERY, search: 'riga', status: 'rejected' }))).toEqual(['4'])
  })
  it('sorts names in Latvian order and breaks numeric ties by name', () => {
    expect(ids(applyQuery(rows, { ...DEFAULT_QUERY, sort: 'name', dir: 'asc' }))).toEqual(['3', '2', '1', '4'])
    expect(ids(applyQuery(rows, { ...DEFAULT_QUERY, sort: 'views', dir: 'desc' }))).toEqual(['3', '4', '1', '2'])
    expect(ids(applyQuery(rows, { ...DEFAULT_QUERY, sort: 'pledges', dir: 'asc' }))).toEqual(['2', '1', '4', '3'])
    expect(ids(applyQuery(rows, { ...DEFAULT_QUERY, sort: 'passwordSet', dir: 'asc' }))).toEqual(['2', '3', '1', '4'])
    expect(ids(applyQuery(rows, { ...DEFAULT_QUERY, sort: 'city', dir: 'asc' }))).toEqual(['1', '3', '2', '4'])
    expect(ids(applyQuery(rows, { ...DEFAULT_QUERY, sort: 'status', dir: 'asc' }))).toEqual(['1', '2', '4', '3'])
  })
  it('does not reorder its input', () => {
    const frozen = Object.freeze([...rows])
    applyQuery(frozen, { ...DEFAULT_QUERY, sort: 'name', dir: 'asc' })
    expect(ids(frozen)).toEqual(['1', '2', '3', '4'])
  })
})

describe('toggleSort', () => {
  it('flips the active column and starts a new one in its natural direction', () => {
    expect(toggleSort(DEFAULT_QUERY, 'updatedAt')).toMatchObject({ sort: 'updatedAt', dir: 'asc' })
    expect(toggleSort(DEFAULT_QUERY, 'name')).toMatchObject({ sort: 'name', dir: 'asc' })
    expect(toggleSort(DEFAULT_QUERY, 'views')).toMatchObject({ sort: 'views', dir: 'desc' })
    expect(toggleSort({ ...DEFAULT_QUERY, sort: 'name', dir: 'asc' }, 'name').dir).toBe('desc')
  })
})
