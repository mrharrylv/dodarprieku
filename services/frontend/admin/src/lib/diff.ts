/**
 * Field-by-field difference between the live profile and a proposed one.
 * Pure: never touches its inputs. Scalars are compared by value; the lists
 * (needs, photos, sponsors, parcel lockers) are matched item by item on a
 * stable key, so an edited note reads as "changed", not as one removal and
 * one addition.
 */
import type { CharityProfile, Need, ParcelLockerChoice, Sponsor } from '@shared/contracts'

export type ChangeStatus = 'added' | 'removed' | 'changed' | 'unchanged'
export type Scalar = string | number | boolean | undefined

export interface FieldDiff {
  readonly path: ScalarPath
  readonly status: ChangeStatus
  readonly before: Scalar
  readonly after: Scalar
}

export interface ItemDiff<T> {
  readonly key: string
  readonly status: ChangeStatus | 'moved'
  readonly before?: T
  readonly after?: T
  /** Property names that differ, for 'changed'. */
  readonly changedFields: readonly string[]
}

export interface ProfileDiff {
  readonly fields: readonly FieldDiff[]
  readonly needs: readonly ItemDiff<Need>[]
  readonly photos: readonly ItemDiff<string>[]
  readonly sponsors: readonly ItemDiff<Sponsor>[]
  readonly parcelLockers: readonly ItemDiff<ParcelLockerChoice>[]
  /** Every field and item whose status is not 'unchanged'. */
  readonly changeCount: number
}

export const SCALAR_PATHS = [
  'organization.name', 'organization.legalName', 'organization.regNumber', 'organization.legalForm',
  'organization.publicBenefit', 'organization.email', 'organization.phone', 'organization.website',
  'organization.facebook', 'organization.instagram',
  'contactPerson.firstName', 'contactPerson.lastName', 'contactPerson.email', 'contactPerson.phone',
  'address.street', 'address.city', 'address.postalCode', 'location.lat', 'location.lng',
  'category', 'description', 'logo',
  'delivery.inPerson.address', 'delivery.inPerson.hours', 'delivery.dropOff.address', 'delivery.dropOff.hours',
  'delivery.post.address',
] as const
export type ScalarPath = (typeof SCALAR_PATHS)[number]

/** Reads a dotted path; anything missing on the way is undefined. */
export const getPath = (value: unknown, path: string): unknown =>
  path.split('.').reduce<unknown>(
    (acc, key) => (typeof acc === 'object' && acc !== null ? (acc as Record<string, unknown>)[key] : undefined),
    value,
  )

const isEmpty = (v: Scalar): boolean => v === undefined || v === ''

const toScalar = (v: unknown): Scalar =>
  typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' ? v : undefined

export const scalarStatus = (before: Scalar, after: Scalar): ChangeStatus => {
  if (isEmpty(before) && isEmpty(after)) return 'unchanged'
  if (isEmpty(before)) return 'added'
  if (isEmpty(after)) return 'removed'
  return before === after ? 'unchanged' : 'changed'
}

/** Own enumerable keys whose values differ (shallow, scalars only in our shapes). */
export const changedKeys = (a: object, b: object): readonly string[] => {
  const ra = a as Readonly<Record<string, unknown>>
  const rb = b as Readonly<Record<string, unknown>>
  const keys = [...new Set([...Object.keys(ra), ...Object.keys(rb)])].sort()
  return keys.filter((k) => !isEmpty(toScalar(ra[k])) || !isEmpty(toScalar(rb[k])) ? ra[k] !== rb[k] : false)
}

/**
 * Item-by-item list diff. Items are matched on `keyOf`; a key seen twice
 * gets a "#n" suffix so duplicates still pair up in order. Output follows
 * the proposed order, then the removed items in their old order. With
 * `trackOrder`, an equal item at a different position is 'moved'.
 */
export const diffList = <T>(
  before: readonly T[],
  after: readonly T[],
  keyOf: (item: T) => string,
  trackOrder = false,
): readonly ItemDiff<T>[] => {
  const keyed = (list: readonly T[]): readonly (readonly [string, T])[] => {
    const seen = new Map<string, number>()
    return list.map((item) => {
      const base = keyOf(item)
      const n = seen.get(base) ?? 0
      seen.set(base, n + 1)
      return [n === 0 ? base : `${base}#${n + 1}`, item] as const
    })
  }
  const old = keyed(before)
  const next = keyed(after)
  const oldIndex = new Map(old.map(([k], i) => [k, i]))
  const oldMap = new Map(old)
  const nextKeys = new Set(next.map(([k]) => k))

  const present = next.map(([key, item], i): ItemDiff<T> => {
    if (!oldMap.has(key)) return { key, status: 'added', after: item, changedFields: [] }
    const prev = oldMap.get(key) as T
    const fields = typeof item === 'object' && item !== null ? changedKeys(prev as object, item as object) : []
    if (fields.length > 0) return { key, status: 'changed', before: prev, after: item, changedFields: fields }
    const moved = trackOrder && oldIndex.get(key) !== i
    return { key, status: moved ? 'moved' : 'unchanged', before: prev, after: item, changedFields: [] }
  })
  const gone = old
    .filter(([key]) => !nextKeys.has(key))
    .map(([key, item]): ItemDiff<T> => ({ key, status: 'removed', before: item, changedFields: [] }))
  return [...present, ...gone]
}

const fold = (s: string): string => s.trim().toLocaleLowerCase('lv')

export const needKeyOf = (need: Need): string =>
  need.itemId === 'custom' ? `custom:${fold(need.customLabel ?? '')}` : need.itemId
export const sponsorKeyOf = (sponsor: Sponsor): string => fold(sponsor.name)
export const lockerKeyOf = (locker: ParcelLockerChoice): string =>
  `${locker.provider}:${locker.lockerId ?? fold(locker.name)}`

export const diffProfile = (live: CharityProfile, proposed: CharityProfile): ProfileDiff => {
  const fields = SCALAR_PATHS.map((path): FieldDiff => {
    const before = toScalar(getPath(live, path))
    const after = toScalar(getPath(proposed, path))
    return { path, status: scalarStatus(before, after), before, after }
  })
  const needs = diffList(live.needs, proposed.needs, needKeyOf)
  const photos = diffList(live.photos, proposed.photos, (p) => p, true)
  const sponsors = diffList(live.sponsors, proposed.sponsors, sponsorKeyOf)
  const parcelLockers = diffList(live.delivery.parcelLockers, proposed.delivery.parcelLockers, lockerKeyOf)
  const changed = (s: string): boolean => s !== 'unchanged'
  const changeCount =
    fields.filter((f) => changed(f.status)).length +
    [needs, photos, sponsors, parcelLockers].reduce((n, list) => n + list.filter((i) => changed(i.status)).length, 0)
  return { fields, needs, photos, sponsors, parcelLockers, changeCount }
}
