/**
 * The registration draft, kept in session storage so a reload or a slip of the
 * back button does not lose twenty minutes of typing. It lives only for the
 * tab's session and is cleared on a successful submit. Photos are stored as
 * their uploaded media keys, never as image data.
 *
 * What comes back is untrusted (an older version of the page, a hand edit),
 * so it is checked field by field before it is used.
 */

import { isCategoryId } from '@shared/catalog'

import { STORAGE_KEYS } from '@/config/site'
import type { ProfileForm } from '@/components/profile-editor/form-model'

export interface RegisterDraft {
  readonly version: 1
  readonly step: number
  readonly form: ProfileForm
  readonly accountEmail: string
}

type Obj = Record<string, unknown>
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)
const strings = (v: unknown, keys: readonly string[]): boolean => isObj(v) && keys.every((k) => typeof v[k] === 'string')
const isPlace = (v: unknown): boolean => strings(v, ['address', 'hours']) && typeof (v as Obj).enabled === 'boolean'
const arrayOf = (v: unknown, item: (x: unknown) => boolean): boolean => Array.isArray(v) && v.every(item)

const isLocation = (v: unknown): boolean =>
  v === null || (isObj(v) && typeof v.lat === 'number' && typeof v.lng === 'number')

const isDelivery = (v: unknown): boolean =>
  isObj(v) &&
  isPlace(v.inPerson) &&
  isPlace(v.dropOff) &&
  typeof v.lockersEnabled === 'boolean' &&
  arrayOf(v.parcelLockers, (l) => strings(l, ['provider', 'name', 'address'])) &&
  strings(v.post, ['address']) &&
  typeof (v.post as Obj).enabled === 'boolean'

export const isProfileForm = (v: unknown): v is ProfileForm =>
  isObj(v) &&
  strings(v.organization, ['name', 'legalName', 'regNumber', 'legalForm', 'email', 'phone', 'website', 'facebook', 'instagram']) &&
  typeof (v.organization as Obj).publicBenefit === 'boolean' &&
  strings(v.contactPerson, ['firstName', 'lastName', 'email', 'phone']) &&
  strings(v.address, ['street', 'city', 'postalCode']) &&
  isLocation(v.location) &&
  // A category id renamed or removed since the draft was written would throw on render.
  (v.category === '' || isCategoryId(v.category)) &&
  typeof v.description === 'string' &&
  arrayOf(v.photos, (p) => typeof p === 'string') &&
  typeof v.logo === 'string' &&
  arrayOf(v.needs, (n) => isObj(n) && typeof n.itemId === 'string' && typeof n.urgent === 'boolean') &&
  isDelivery(v.delivery) &&
  arrayOf(v.sponsors, (s) => strings(s, ['name']))

export const isRegisterDraft = (v: unknown): v is RegisterDraft =>
  isObj(v) &&
  v.version === 1 &&
  typeof v.step === 'number' &&
  Number.isInteger(v.step) &&
  v.step >= 0 &&
  typeof v.accountEmail === 'string' &&
  isProfileForm(v.form)

const store = (): Storage | null => {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage
  } catch {
    return null
  }
}

export const readDraft = (): RegisterDraft | null => {
  const raw = (() => {
    try {
      return store()?.getItem(STORAGE_KEYS.registerDraft) ?? null
    } catch {
      return null
    }
  })()
  if (raw === null) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    return isRegisterDraft(parsed) ? parsed : null
  } catch {
    return null
  }
}

/** Returns whether it was stored; a full or blocked storage just means no draft. */
export const writeDraft = (draft: RegisterDraft): boolean => {
  try {
    store()?.setItem(STORAGE_KEYS.registerDraft, JSON.stringify(draft))
    return store() !== null
  } catch {
    return false
  }
}

export const clearDraft = (): void => {
  try {
    store()?.removeItem(STORAGE_KEYS.registerDraft)
  } catch (err) {
    // The draft is unreachable either way, which is the state wanted.
    console.warn('[register] could not clear the draft', err)
  }
}
