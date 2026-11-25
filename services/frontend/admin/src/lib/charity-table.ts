/** Search, filter and sort for the organisations table. Pure. */
import type { AdminCharitySummary, CharityStatus } from '@shared/contracts'
import type { CategoryId } from '@shared/catalog'

export type SortKey = 'name' | 'category' | 'city' | 'status' | 'views' | 'pledges' | 'passwordSet' | 'updatedAt'
export type SortDir = 'asc' | 'desc'

export interface TableQuery {
  readonly search: string
  readonly status: CharityStatus | 'all' | 'update'
  readonly category: CategoryId | 'all'
  readonly sort: SortKey
  readonly dir: SortDir
}

export const DEFAULT_QUERY: TableQuery = { search: '', status: 'all', category: 'all', sort: 'updatedAt', dir: 'desc' }

/** Lower case, no diacritics: "Rīga" matches "riga". */
export const fold = (s: string): string =>
  s.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('lv').trim()

export const matchesSearch = (c: AdminCharitySummary, search: string): boolean => {
  const terms = fold(search).split(/\s+/).filter(Boolean)
  if (terms.length === 0) return true
  const hay = fold([c.name, c.city, c.accountEmail, c.slug].join(' '))
  return terms.every((t) => hay.includes(t))
}

const compare = (a: AdminCharitySummary, b: AdminCharitySummary, key: SortKey): number => {
  switch (key) {
    case 'views':
    case 'pledges':
      return a[key] - b[key]
    case 'passwordSet':
      return Number(a.passwordSet) - Number(b.passwordSet)
    case 'updatedAt':
      return a.updatedAt.localeCompare(b.updatedAt)
    default:
      return a[key].localeCompare(b[key], 'lv')
  }
}

export const applyQuery = (rows: readonly AdminCharitySummary[], q: TableQuery): readonly AdminCharitySummary[] => {
  const sign = q.dir === 'asc' ? 1 : -1
  return rows
    .filter((c) => matchesSearch(c, q.search))
    .filter((c) => (q.status === 'all' ? true : q.status === 'update' ? c.hasPendingUpdate : c.status === q.status))
    .filter((c) => q.category === 'all' || c.category === q.category)
    .slice()
    .sort((a, b) => sign * compare(a, b, q.sort) || a.name.localeCompare(b.name, 'lv'))
}

/** Clicking a header: same column flips direction, a new one starts ascending (numbers descending). */
export const toggleSort = (q: TableQuery, key: SortKey): TableQuery => {
  if (q.sort === key) return { ...q, dir: q.dir === 'asc' ? 'desc' : 'asc' }
  const numeric = key === 'views' || key === 'pledges' || key === 'updatedAt'
  return { ...q, sort: key, dir: numeric ? 'desc' : 'asc' }
}
