/** The whole charity map CSV -> ImportedCharity[], with slugs unique within the file. */
import type { ImportedCharity } from '../domain/imported'
import { MAX_SLUG } from '../domain/imported'
import { slugify } from '../domain/slug'
import { parseCsv, toRecords } from './csv'
import { rowToProfile } from './mapping'

/** Room for a "-NN" suffix the import may add when a slug is taken. */
const BASE_SLUG = MAX_SLUG - 6

export interface Conversion {
  readonly items: readonly ImportedCharity[]
  readonly skipped: readonly { readonly id: string; readonly reason: string }[]
  /** Ids whose pin is only approximate (coord_precision settlement/municipality). */
  readonly approximate: readonly string[]
}

/** 'charity-map-2026-11-25.csv' -> 'import:charity-map-2026-11-25'. */
export const sourceOf = (fileName: string): string =>
  `import:${slugify(fileName.replace(/^.*[\\/]/, '').replace(/\.csv$/i, ''))}`

const capSlug = (slug: string): string => {
  if (slug.length <= BASE_SLUG) return slug
  const cut = slug.slice(0, BASE_SLUG)
  const word = slug[BASE_SLUG] === '-' ? cut : cut.replace(/-[^-]*$/, '')
  return word === '' ? cut : word
}

const countBy = (values: readonly string[]): ReadonlyMap<string, number> => {
  const counts = new Map<string, number>()
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1)
  return counts
}

export interface SlugInput {
  readonly id: string
  readonly name: string
  readonly city: string
}

/** 'imp-L0004' -> 'l0004': the source's own id, so a suffix never depends on file order. */
const idSuffix = (id: string): string => slugify(id.replace(/^imp-/, '')).slice(0, MAX_SLUG - BASE_SLUG - 1)

/**
 * Slugs that stay put across re-imports:
 * - an id that already has a slug (`previous`, from the committed file) keeps it;
 * - a name that repeats in the file gets its city added;
 * - one that still collides gets the source's location id ("-l0004"), not a
 *   counter, so adding or reordering rows never moves another charity's URL.
 */
export const assignSlugs = (
  named: readonly SlugInput[],
  previous: ReadonlyMap<string, string> = new Map(),
): string[] => {
  const kept = named.map((n) => previous.get(n.id))
  const taken = new Set(kept.filter((s): s is string => s !== undefined))
  const bases = named.map((n) => capSlug(slugify(n.name)))
  const baseCount = countBy(bases)
  return named.map((n, i) => {
    const old = kept[i]
    if (old !== undefined) return old
    const base = bases[i]!
    const town = n.city.split(',')[0]?.trim() ?? ''
    const slug = baseCount.get(base)! > 1 && town !== '' ? capSlug(slugify(`${n.name} ${town}`)) : base
    let candidate = taken.has(slug) ? `${slug}-${idSuffix(n.id)}` : slug
    for (let k = 2; taken.has(candidate); k += 1) candidate = `${slug}-${idSuffix(n.id)}-${k}`
    taken.add(candidate)
    return candidate
  })
}

/** `previous`: id -> slug of the file this run replaces, so published URLs survive a re-run. */
export const convertCsv = (text: string, source: string, previous: ReadonlyMap<string, string> = new Map()): Conversion => {
  const results = toRecords(parseCsv(text)).map(rowToProfile)
  const kept = results.flatMap((r) => (r.ok ? [r] : []))
  const slugs = assignSlugs(
    kept.map((r) => ({ id: r.id, name: r.profile.organization.name, city: r.profile.address.city })),
    previous,
  )
  return {
    items: kept.map((r, i) => ({ id: r.id, slug: slugs[i]!, profile: r.profile, source })),
    skipped: results.flatMap((r) => (r.ok ? [] : [{ id: r.id, reason: r.reason }])),
    approximate: kept.filter((r) => r.approximate).map((r) => r.id),
  }
}

/** One item per line: compact, and a re-run's diff stays readable. */
export const toJsonLines = (items: readonly ImportedCharity[]): string =>
  `[\n${items.map((i) => JSON.stringify(i)).join(',\n')}\n]\n`
