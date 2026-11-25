/**
 * The parcel-locker snapshot (`/data/parcel-lockers.json`) and the search over
 * it. The file is fetched data, so every row is checked before it is used;
 * the filter is pure and ignores case and Latvian diacritics, so "ventspils
 * maxima" finds "Ventspils Maxima XX pakomāts".
 */

import { PARCEL_PROVIDERS } from '@shared/catalog'
import type { ParcelProvider } from '@shared/contracts'

export const LOCKERS_PATH = '/data/parcel-lockers.json'
/** The list never renders more rows than this; typing narrows it. */
export const LOCKER_RESULT_CAP = 40

export interface Locker {
  readonly provider: ParcelProvider
  readonly id: string
  readonly name: string
  readonly address: string
  readonly city: string
}

const PROVIDER_IDS: readonly string[] = PARCEL_PROVIDERS.map((p) => p.id)

export const isProvider = (v: unknown): v is ParcelProvider => typeof v === 'string' && PROVIDER_IDS.includes(v)

const isLocker = (v: unknown): v is Locker => {
  if (typeof v !== 'object' || v === null) return false
  const r = v as Record<string, unknown>
  return (
    isProvider(r.provider) &&
    ['id', 'name', 'address', 'city'].every((key) => typeof r[key] === 'string' && (r[key] as string).length > 0)
  )
}

/** Keeps the well-formed rows of whatever the file held, and only the fields used here. */
export const parseLockers = (raw: unknown): readonly Locker[] =>
  Array.isArray(raw)
    ? raw.filter(isLocker).map(({ provider, id, name, address, city }) => ({ provider, id, name, address, city }))
    : []

/** Lower case, no diacritics, single spaces. */
export const fold = (text: string): string =>
  text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim()

export interface LockerSearch {
  readonly matches: readonly Locker[]
  readonly total: number
}

/** Lockers of one provider whose name, address or city contain every word typed. */
export const filterLockers = (
  lockers: readonly Locker[],
  provider: ParcelProvider,
  query: string,
  cap: number = LOCKER_RESULT_CAP,
): LockerSearch => {
  const words = fold(query).split(' ').filter((w) => w !== '')
  const all = lockers.filter((locker) => {
    if (locker.provider !== provider) return false
    const haystack = fold(`${locker.name} ${locker.address} ${locker.city}`)
    return words.every((word) => haystack.includes(word))
  })
  return { matches: all.slice(0, cap), total: all.length }
}

export const countForProvider = (lockers: readonly Locker[], provider: ParcelProvider): number =>
  lockers.filter((l) => l.provider === provider).length

export const lockerAddress = (locker: Locker): string => `${locker.address}, ${locker.city}`
