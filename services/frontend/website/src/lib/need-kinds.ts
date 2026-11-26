/**
 * What a charity needs, by kind (the map's "Ko vajag" filter), and whether it
 * needs anything at all. The kinds and the catalog-to-kind mapping live in
 * the shared catalog (NEED_KINDS, needKindOf); these are the per-charity
 * questions the map asks of them.
 */
import { needKindOf, type NeedKindId } from '@shared/catalog'
import type { PublicCharity } from '@shared/contracts'

/** An organisation with no open needs is drawn faded, from close up only, and never in a cluster. */
export const hasNeeds = (charity: PublicCharity): boolean => charity.profile.needs.length > 0

/** The kinds its needs fall under; custom needs have none. */
export const needKindsOf = (charity: PublicCharity): ReadonlySet<NeedKindId> => {
  const { category, needs } = charity.profile
  return new Set(needs.flatMap((n) => {
    const kind = needKindOf(category, n.itemId)
    return kind === null ? [] : [kind]
  }))
}

/** No kind chosen matches every charity; otherwise any one of its needs must be of a chosen kind. */
export const matchesKinds = (charity: PublicCharity, kinds: readonly NeedKindId[]): boolean => {
  if (kinds.length === 0) return true
  const own = needKindsOf(charity)
  return kinds.some((k) => own.has(k))
}

/** Whether any published needs were made up for a demonstration: the map then says so. */
export const hasDemoNeeds = (charities: readonly PublicCharity[]): boolean => charities.some((c) => c.demoNeeds === true)

/** The chosen kinds with `kind` switched on or off, in the catalog's order. */
export const toggleKind = (kinds: readonly NeedKindId[], kind: NeedKindId, order: readonly NeedKindId[]): readonly NeedKindId[] => {
  const next = kinds.includes(kind) ? kinds.filter((k) => k !== kind) : [...kinds, kind]
  return order.filter((k) => next.includes(k))
}
