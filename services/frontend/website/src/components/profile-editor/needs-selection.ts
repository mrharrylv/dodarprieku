/**
 * Pure edits of a profile's list of needs. Each returns a new array and leaves
 * the one it was given alone. Catalog items are found by `itemId`; custom
 * items (itemId 'custom') by their index in the list.
 */

import { CUSTOM_NEED_ID } from '@shared/catalog'
import { LIMITS, type Need } from '@shared/contracts'

export type NeedPatch = Partial<Pick<Need, 'note' | 'urgent' | 'customLabel'>>

export const canAddNeed = (needs: readonly Need[]): boolean => needs.length < LIMITS.maxNeeds

export const indexOfItem = (needs: readonly Need[], itemId: string): number =>
  itemId === CUSTOM_NEED_ID ? -1 : needs.findIndex((n) => n.itemId === itemId)

export const isTicked = (needs: readonly Need[], itemId: string): boolean => indexOfItem(needs, itemId) !== -1

/** Ticks a catalog item, or unticks it (losing its note and urgent flag). */
export const toggleNeed = (needs: readonly Need[], itemId: string): readonly Need[] => {
  const index = indexOfItem(needs, itemId)
  if (index !== -1) return needs.filter((_, i) => i !== index)
  if (!canAddNeed(needs) || itemId === CUSTOM_NEED_ID) return needs
  return [...needs, { itemId, urgent: false }]
}

export const updateNeedAt = (needs: readonly Need[], index: number, patch: NeedPatch): readonly Need[] =>
  index < 0 || index >= needs.length ? needs : needs.map((n, i) => (i === index ? { ...n, ...patch } : n))

export const updateItem = (needs: readonly Need[], itemId: string, patch: NeedPatch): readonly Need[] =>
  updateNeedAt(needs, indexOfItem(needs, itemId), patch)

export const removeNeedAt = (needs: readonly Need[], index: number): readonly Need[] =>
  needs.filter((_, i) => i !== index)

/** Adds the charity's own item. A blank label or a full list changes nothing. */
export const addCustomNeed = (needs: readonly Need[], label: string, note: string): readonly Need[] => {
  const customLabel = label.trim().slice(0, LIMITS.customNeedLabel)
  if (customLabel === '' || !canAddNeed(needs)) return needs
  const trimmedNote = note.trim().slice(0, LIMITS.needNote)
  return [...needs, { itemId: CUSTOM_NEED_ID, customLabel, urgent: false, ...(trimmedNote === '' ? {} : { note: trimmedNote }) }]
}

/** Custom needs with their index in the full list, which is how they are edited. */
export const customNeeds = (needs: readonly Need[]): readonly { readonly need: Need; readonly index: number }[] =>
  needs.flatMap((need, index) => (need.itemId === CUSTOM_NEED_ID ? [{ need, index }] : []))

export const tickedInGroup = (needs: readonly Need[], itemIds: readonly string[]): number =>
  itemIds.filter((id) => isTicked(needs, id)).length
