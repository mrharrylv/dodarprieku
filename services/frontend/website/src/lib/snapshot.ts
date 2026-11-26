/**
 * The public snapshot (`/data/charities.json`): validation and the pure
 * questions the map and the charity page ask of it.
 *
 * The snapshot is written by the API, but it is still data arriving over the
 * network, so nothing reads it before `parseSnapshot` has checked its shape.
 * One malformed charity is dropped rather than taking the whole map down.
 */

import { CATEGORIES, NEED_KINDS, categoryById, isCategoryId, needLabel, needKey, type CategoryId, type NeedKindId } from '@shared/catalog'
import {
  MEDIA_PREFIX,
  type Need,
  type PublicCharity,
  type PublicSnapshot,
  type SponsorLeaderboardEntry,
} from '@shared/contracts'
import { isMediaKey } from '@shared/validate'
import { hasNeeds, matchesKinds, needKindsOf } from './need-kinds'

type Obj = Readonly<Record<string, unknown>>
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)
const isStr = (v: unknown): v is string => typeof v === 'string'
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const isOptStr = (v: unknown): boolean => v === undefined || isStr(v)

const isNeed = (v: unknown): v is Need =>
  isObj(v) && isStr(v.itemId) && typeof v.urgent === 'boolean' && isOptStr(v.note) && isOptStr(v.customLabel)

const isSponsor = (v: unknown): boolean => isObj(v) && isStr(v.name) && isOptStr(v.url) && isOptStr(v.logo)

const isDelivery = (v: unknown): boolean => isObj(v) && Array.isArray(v.parcelLockers)

const isProfile = (v: unknown): boolean => {
  if (!isObj(v)) return false
  const { organization: org, address, location } = v
  return (
    isObj(org) &&
    isStr(org.name) &&
    isStr(org.email) &&
    isStr(org.phone) &&
    isOptStr(org.website) &&
    isOptStr(org.facebook) &&
    isOptStr(org.instagram) &&
    isObj(address) &&
    isStr(address.city) &&
    isStr(address.street) &&
    isObj(location) &&
    isNum(location.lat) &&
    isNum(location.lng) &&
    isCategoryId(v.category) &&
    isStr(v.description) &&
    Array.isArray(v.photos) &&
    v.photos.every(isStr) &&
    Array.isArray(v.needs) &&
    v.needs.every(isNeed) &&
    Array.isArray(v.sponsors) &&
    v.sponsors.every(isSponsor) &&
    isDelivery(v.delivery)
  )
}

export const isPublicCharity = (v: unknown): v is PublicCharity =>
  isObj(v) &&
  isStr(v.id) &&
  isStr(v.slug) &&
  v.slug !== '' &&
  isStr(v.publishedAt) &&
  (v.demoNeeds === undefined || typeof v.demoNeeds === 'boolean') &&
  isProfile(v.profile)

const isLeaderboardEntry = (v: unknown): v is SponsorLeaderboardEntry =>
  isObj(v) && isStr(v.name) && isNum(v.charities) && isOptStr(v.url) && isOptStr(v.logo)

/** The top-level shape only. `parseSnapshot` also checks each entry. */
export const isPublicSnapshot = (v: unknown): v is PublicSnapshot =>
  isObj(v) && isStr(v.generatedAt) && Array.isArray(v.charities) && Array.isArray(v.sponsorLeaderboard)

/** A validated snapshot, invalid entries dropped, or `null` when the shape is wrong. */
export const parseSnapshot = (v: unknown): PublicSnapshot | null => {
  if (!isPublicSnapshot(v)) return null
  return {
    generatedAt: v.generatedAt,
    charities: v.charities.filter(isPublicCharity),
    sponsorLeaderboard: v.sponsorLeaderboard.filter(isLeaderboardEntry),
  }
}

export const EMPTY_SNAPSHOT: PublicSnapshot = { generatedAt: '', charities: [], sponsorLeaderboard: [] }

/** A media key as a URL, or `undefined` for anything that is not one of ours. */
export const mediaUrl = (key: string | undefined): string | undefined =>
  key !== undefined && isMediaKey(key) ? `${MEDIA_PREFIX}${key}` : undefined

export const coverUrl = (charity: PublicCharity): string | undefined => mediaUrl(charity.profile.photos[0])

/** Lower case, no diacritics, collapsed spaces: "Rīga" and "riga" match. */
export const normaliseSearch = (value: string): string =>
  value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim()

export interface CharityFilter {
  readonly query: string
  readonly category: CategoryId | null
  /** "Ko vajag": none chosen means every kind. */
  readonly kinds: readonly NeedKindId[]
}

export const NO_FILTER: CharityFilter = { query: '', category: null, kinds: [] }

export const matchesQuery = (charity: PublicCharity, query: string): boolean => {
  const q = normaliseSearch(query)
  if (q === '') return true
  const { organization, address } = charity.profile
  return [organization.name, address.city].some((field) => normaliseSearch(field).includes(q))
}

const byName = (a: PublicCharity, b: PublicCharity): number =>
  a.profile.organization.name.localeCompare(b.profile.organization.name, 'lv')

/**
 * The charities that pass the search, the category and the need kinds, in
 * name order. With no kind chosen, organisations without needs pass too: the
 * search finds them, and the map draws them faded from close up.
 */
export const filterCharities = (
  charities: readonly PublicCharity[],
  { query, category, kinds }: CharityFilter,
): readonly PublicCharity[] =>
  charities
    .filter((c) => (category === null || c.profile.category === category) && matchesKinds(c, kinds) && matchesQuery(c, query))
    .slice()
    .sort(byName)

export interface MapCharities {
  /** Matching, with open needs: the pins, and the only ones the clusters hold and count. */
  readonly active: readonly PublicCharity[]
  /** Matching, without needs: drawn greyed out from close up, never clustered. */
  readonly faded: readonly PublicCharity[]
}

/** What the map draws for a filter: the organisations with needs, and the ones without. */
export const mapCharities = (charities: readonly PublicCharity[], filter: CharityFilter): MapCharities => {
  const matching = filterCharities(charities, filter)
  return { active: matching.filter(hasNeeds), faded: matching.filter((c) => !hasNeeds(c)) }
}

export interface CategoryCount {
  readonly id: CategoryId
  readonly count: number
}

/**
 * How many organisations with needs match the search and the kinds in each
 * category, in catalog order. A category with none is left out, unless no
 * kind is chosen and it has organisations without needs: the chip then says
 * 0 and still filters the faded pins.
 */
export const categoryCounts = (
  charities: readonly PublicCharity[],
  { query, kinds }: Pick<CharityFilter, 'query' | 'kinds'>,
): readonly CategoryCount[] => {
  const matching = charities.filter((c) => matchesQuery(c, query))
  return CATEGORIES.map((cat) => {
    const inCategory = matching.filter((c) => c.profile.category === cat.id)
    const count = inCategory.filter((c) => hasNeeds(c) && matchesKinds(c, kinds)).length
    return { id: cat.id, count, shown: count > 0 || (kinds.length === 0 && inCategory.length > 0) }
  })
    .filter((entry) => entry.shown)
    .map(({ id, count }) => ({ id, count }))
}

export interface NeedKindCount {
  readonly id: NeedKindId
  readonly count: number
}

/** How many organisations matching the search and the category need each kind, in catalog order, every kind listed. */
export const needKindCounts = (
  charities: readonly PublicCharity[],
  { query, category }: Pick<CharityFilter, 'query' | 'category'>,
): readonly NeedKindCount[] => {
  const kindsOf = charities
    .filter((c) => (category === null || c.profile.category === category) && matchesQuery(c, query))
    .map(needKindsOf)
  return NEED_KINDS.map((kind) => ({ id: kind.id, count: kindsOf.filter((own) => own.has(kind.id)).length }))
}

export const findBySlug = (charities: readonly PublicCharity[], slug: string | undefined): PublicCharity | undefined =>
  slug === undefined ? undefined : charities.find((c) => c.slug === slug)

export interface NeedView {
  /** The pledge key: `needKey()`. */
  readonly key: string
  readonly label: string
  readonly note?: string
  readonly urgent: boolean
}

const needView = (category: CategoryId, need: Need, index: number): NeedView => ({
  key: needKey(need, index),
  label: needLabel(category, need),
  urgent: need.urgent,
  ...(need.note !== undefined && need.note !== '' ? { note: need.note } : {}),
})

/** The first `limit` needs, urgent ones first, otherwise in the charity's own order. */
export const topNeeds = (charity: PublicCharity, limit = 3): readonly NeedView[] => {
  const { category, needs } = charity.profile
  const views = needs.map((n, i) => needView(category, n, i))
  return [...views.filter((n) => n.urgent), ...views.filter((n) => !n.urgent)].slice(0, limit)
}

export interface NeedGroupView {
  readonly id: string
  readonly label: string
  readonly needs: readonly NeedView[]
}

export const CUSTOM_GROUP_ID = 'custom'

/**
 * The charity's needs grouped as its category's catalog groups them, in
 * catalog order; custom items (and any item the catalog no longer knows) go
 * in a last group whose label the caller supplies.
 */
export const groupNeeds = (charity: PublicCharity, otherLabel: string): readonly NeedGroupView[] => {
  const { category, needs } = charity.profile
  const views = needs.map((n, i) => ({ itemId: n.itemId, view: needView(category, n, i) }))
  const groups = categoryById(category).needs.map((group) => {
    const ids = group.items.map((item) => item.id)
    return {
      id: group.id,
      label: group.label,
      needs: views.filter((v) => ids.includes(v.itemId)).map((v) => v.view),
    }
  })
  const known = new Set(groups.flatMap((g) => g.needs.map((n) => n.key)))
  const rest = views.filter((v) => !known.has(v.view.key)).map((v) => v.view)
  const all = rest.length > 0 ? [...groups, { id: CUSTOM_GROUP_ID, label: otherLabel, needs: rest }] : groups
  return all.filter((g) => g.needs.length > 0)
}

/** The top `limit` of the leaderboard, most charities first, then by name. */
export const topSponsors = (
  entries: readonly SponsorLeaderboardEntry[],
  limit = 10,
): readonly SponsorLeaderboardEntry[] =>
  entries
    .slice()
    .sort((a, b) => b.charities - a.charities || a.name.localeCompare(b.name, 'lv'))
    .slice(0, limit)

/**
 * Whether a URL may be put in an href: http(s) only, to a host with a dot in
 * it. Imported register data writes "nav" ("none") where there is no site,
 * which would otherwise show as a link to http://nav/.
 */
export const safeHref = (url: string | undefined): string | undefined => {
  if (url === undefined || url === '') return undefined
  try {
    const parsed = new URL(url)
    const web = parsed.protocol === 'https:' || parsed.protocol === 'http:'
    return web && parsed.hostname.includes('.') ? parsed.toString() : undefined
  } catch {
    return undefined
  }
}

/** GeoJSON for the map's clustered source: one point per charity. */
export interface CharityFeatureProps {
  readonly id: string
  readonly category: CategoryId
}

/** Longitude, latitude where a charity is drawn, by id; a charity missing from it is drawn at its own location. */
export type DrawnAt = ReadonlyMap<string, readonly [number, number]>

/** Where a charity is drawn: `at`'s position for it, or its own location. */
export const drawnAt = (charity: PublicCharity, at?: DrawnAt): [number, number] => {
  const moved = at?.get(charity.id)
  return moved === undefined ? [charity.profile.location.lng, charity.profile.location.lat] : [moved[0], moved[1]]
}

export const toFeatureCollection = (charities: readonly PublicCharity[], at?: DrawnAt) => ({
  type: 'FeatureCollection' as const,
  features: charities.map((c) => ({
    type: 'Feature' as const,
    properties: { id: c.id, category: c.profile.category } satisfies CharityFeatureProps,
    geometry: { type: 'Point' as const, coordinates: drawnAt(c, at) },
  })),
})
