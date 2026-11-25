import { describe, expect, it } from 'vitest'

import { countForProvider, filterLockers, fold, isProvider, lockerAddress, parseLockers, type Locker } from './locker-filter'

const LOCKERS: readonly Locker[] = [
  { provider: 'omniva', id: '1', name: 'Aglonas TOP pakomāts', address: 'Somersētas iela 33', city: 'Aglona' },
  { provider: 'omniva', id: '2', name: 'Ventspils Maxima XX pakomāts', address: 'Kuldīgas iela 1', city: 'Ventspils' },
  { provider: 'omniva', id: '3', name: 'Rīgas Origo pakomāts', address: 'Stacijas laukums 2', city: 'Rīga' },
  { provider: 'venipak', id: '9', name: 'Venipak Ventspils', address: 'Lielā iela 5', city: 'Ventspils' },
]

describe('parseLockers', () => {
  it('keeps well-formed rows and only the fields used', () => {
    const raw = [
      { provider: 'omniva', id: '1', name: 'A', address: 'B', city: 'C', lat: 1, lng: 2 },
      { provider: 'nope', id: '2', name: 'A', address: 'B', city: 'C' },
      { provider: 'dpd', id: '', name: 'A', address: 'B', city: 'C' },
      null,
      'x',
    ]
    expect(parseLockers(raw)).toEqual([{ provider: 'omniva', id: '1', name: 'A', address: 'B', city: 'C' }])
  })

  it('returns nothing for a file that is not a list', () => {
    expect(parseLockers({ lockers: [] })).toEqual([])
  })
})

describe('filterLockers', () => {
  it('folds case and diacritics', () => {
    expect(fold('  Rīgas   ORIGO ')).toBe('rigas origo')
  })

  it('returns all of a provider for an empty query', () => {
    expect(filterLockers(LOCKERS, 'omniva', '')).toMatchObject({ total: 3 })
  })

  it('needs every word, in name, street or town', () => {
    expect(filterLockers(LOCKERS, 'omniva', 'ventspils maxima').matches.map((l) => l.id)).toEqual(['2'])
    expect(filterLockers(LOCKERS, 'omniva', 'rigas stacijas').matches.map((l) => l.id)).toEqual(['3'])
    expect(filterLockers(LOCKERS, 'omniva', 'ventspils origo').total).toBe(0)
  })

  it('never mixes providers', () => {
    expect(filterLockers(LOCKERS, 'venipak', 'ventspils').matches.map((l) => l.id)).toEqual(['9'])
    expect(filterLockers(LOCKERS, 'dpd', '').total).toBe(0)
  })

  it('caps the rows but reports the full count', () => {
    const many = Array.from({ length: 100 }, (_, i) => ({ ...LOCKERS[0]!, id: String(i) }))
    const result = filterLockers(many, 'omniva', 'aglona', 10)
    expect(result.matches).toHaveLength(10)
    expect(result.total).toBe(100)
  })

  it('has the small helpers right', () => {
    expect(countForProvider(LOCKERS, 'omniva')).toBe(3)
    expect(isProvider('smartposti')).toBe(true)
    expect(isProvider('ups')).toBe(false)
    expect(lockerAddress(LOCKERS[0]!)).toBe('Somersētas iela 33, Aglona')
  })
})
