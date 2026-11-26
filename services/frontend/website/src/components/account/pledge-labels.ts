import { needKey, needLabel } from '@shared/catalog'
import type { CharityProfile } from '@shared/contracts'

/** A pledge's need keys as the labels the charity knows them by. */
export const pledgeNeedLabels = (profile: CharityProfile, keys: readonly string[]): string[] => {
  const byKey = new Map(profile.needs.map((need, index) => [needKey(need, index), needLabel(profile.category, need)]))
  return keys.map((key) => byKey.get(key) ?? key)
}
