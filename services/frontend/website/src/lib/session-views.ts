/**
 * Which charity pages this browser tab has already counted as a view.
 *
 * Session storage, under `STORAGE_KEYS.viewedCharities` (listed in the cookie
 * policy): a reload or a second visit in the same tab is not a new view.
 * Every access is guarded, because session storage throws in the same places
 * local storage does; when it is unavailable the view is simply counted.
 */

import { STORAGE_KEYS } from '@/config/site'

/** More than this and the oldest are forgotten; nobody opens hundreds in one tab. */
export const MAX_REMEMBERED_VIEWS = 200

const storage = (): Storage | null => {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage
  } catch {
    return null
  }
}

const isIdList = (v: unknown): v is readonly string[] => Array.isArray(v) && v.every((x) => typeof x === 'string')

export const readViewed = (store: Storage | null = storage()): readonly string[] => {
  if (store === null) return []
  try {
    const raw = store.getItem(STORAGE_KEYS.viewedCharities)
    if (raw === null) return []
    const parsed: unknown = JSON.parse(raw)
    return isIdList(parsed) ? parsed : []
  } catch {
    // Unreadable or not JSON: treated as nothing viewed yet.
    return []
  }
}

/**
 * Records `id` and says whether it is new in this tab. When storage cannot be
 * written the answer is still true: a view is better counted twice than lost.
 */
export const markViewed = (id: string, store: Storage | null = storage()): boolean => {
  const viewed = readViewed(store)
  if (viewed.includes(id)) return false
  if (store === null) return true
  try {
    store.setItem(STORAGE_KEYS.viewedCharities, JSON.stringify([...viewed, id].slice(-MAX_REMEMBERED_VIEWS)))
  } catch {
    // Quota or blocked storage: the view is counted, it just is not remembered.
    return true
  }
  return true
}
