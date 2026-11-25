/** Lookups from the charities list, for tables that only carry ids. */
import { needLabel } from '@shared/catalog'
import type { AdminCharitySummary } from '@shared/contracts'
import { lv } from '../i18n/lv'

export const nameLookup = (charities: readonly AdminCharitySummary[]) => {
  const byId = new Map(charities.map((c) => [c.id, c]))
  return {
    name: (id: string): string => byId.get(id)?.name ?? id,
    /** A pledge key ("sausa-bariba-suniem", "custom:3") as a label. */
    need: (charityId: string, key: string): string => {
      const c = byId.get(charityId)
      if (key.startsWith('custom:') || !c) return key.startsWith('custom:') ? lv.editor.customNeed : key
      return needLabel(c.category, { itemId: key })
    },
  }
}
