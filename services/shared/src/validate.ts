/**
 * Boundary validation, shared by the browser forms and the API, so a form
 * never accepts what the API will refuse. Pure functions: they never mutate
 * the input, they return a new, trimmed value or a map of field errors.
 *
 * Field error values are stable codes ('required', 'too_long', 'invalid',
 * 'out_of_range', 'too_many'); the UI maps them to Latvian copy.
 * Field paths are dotted: 'organization.email', 'needs.3.note'.
 */

import { CUSTOM_NEED_ID, PARCEL_PROVIDERS, isCategoryId, needItemIds } from './catalog'
import {
  LATVIA_BOUNDS,
  LIMITS,
  type ApplicationRequest,
  type CharityProfile,
  type DeliveryOptions,
  type LegalForm,
  type Need,
  type ParcelLockerChoice,
  type ParcelProvider,
  type PledgeRequest,
  type Sponsor,
  type SubscribeRequest,
} from './contracts'

export type FieldErrors = Readonly<Record<string, string>>
export type Result<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly fields: FieldErrors }

type Obj = Readonly<Record<string, unknown>>
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)
const obj = (v: unknown): Obj => (isObj(v) ? v : {})

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const PHONE_RE = /^\+?[0-9 ()-]{7,}$/
const MEDIA_KEY_RE = /^uploads\/[0-9]{4}\/[0-9]{2}\/[a-z0-9-]{8,64}\.(jpg|png|webp)$/
const LEGAL_FORMS: readonly LegalForm[] = [
  'biedriba', 'nodibinajums', 'pasvaldibas-iestade', 'valsts-iestade', 'religiska-organizacija', 'komersants', 'cits',
]
/** Charity ids are uuids or 'imp-' + a register id; nothing longer is ever one. */
const CHARITY_ID_MAX = 60
const PROVIDERS = PARCEL_PROVIDERS.map((p) => p.id) as readonly ParcelProvider[]

export const isEmail = (v: string): boolean => v.length <= LIMITS.email && EMAIL_RE.test(v)
export const isPhone = (v: string): boolean => v.length <= LIMITS.phone && PHONE_RE.test(v)
export const isHttpUrl = (v: string): boolean => {
  if (v.length > LIMITS.url) return false
  try {
    const u = new URL(v)
    return u.protocol === 'https:' || u.protocol === 'http:'
  } catch {
    return false
  }
}
export const isMediaKey = (v: unknown): v is string => typeof v === 'string' && MEDIA_KEY_RE.test(v)
export const normaliseEmail = (v: string): string => v.trim().toLowerCase()

/** A small collector, so each validator reads top to bottom. */
class Checker {
  private readonly errors: Record<string, string> = {}

  text(path: string, raw: unknown, max: number, required = true): string | undefined {
    const value = typeof raw === 'string' ? raw.trim() : ''
    if (value === '') {
      if (required) this.errors[path] = 'required'
      return undefined
    }
    if (value.length > max) {
      this.errors[path] = 'too_long'
      return undefined
    }
    return value
  }

  test(path: string, value: string | undefined, ok: (v: string) => boolean): string | undefined {
    if (value === undefined) return undefined
    if (!ok(value)) {
      this.errors[path] = 'invalid'
      return undefined
    }
    return value
  }

  fail(path: string, code: string): void {
    this.errors[path] = code
  }

  get failed(): boolean {
    return Object.keys(this.errors).length > 0
  }

  result<T>(value: () => T): Result<T> {
    return this.failed ? { ok: false, fields: { ...this.errors } } : { ok: true, value: value() }
  }
}

/** Adds `key: value` only when value is defined (exactOptionalPropertyTypes). */
const opt = <K extends string, V>(key: K, value: V | undefined): { [P in K]?: V } =>
  (value === undefined ? {} : { [key]: value }) as { [P in K]?: V }

const validateNeeds = (c: Checker, raw: unknown, category: string | undefined): Need[] => {
  const list = Array.isArray(raw) ? raw : []
  if (list.length === 0) c.fail('needs', 'required')
  if (list.length > LIMITS.maxNeeds) c.fail('needs', 'too_many')
  const allowed = category && isCategoryId(category) ? needItemIds(category) : []
  const seen = new Set<string>()
  return list.slice(0, LIMITS.maxNeeds).flatMap((item, i): Need[] => {
    const n = obj(item)
    const itemId = typeof n.itemId === 'string' ? n.itemId : ''
    const isCustom = itemId === CUSTOM_NEED_ID
    if (!isCustom && !allowed.includes(itemId)) {
      c.fail(`needs.${i}.itemId`, 'invalid')
      return []
    }
    if (!isCustom && seen.has(itemId)) {
      c.fail(`needs.${i}.itemId`, 'invalid')
      return []
    }
    seen.add(itemId)
    const customLabel = isCustom ? c.text(`needs.${i}.customLabel`, n.customLabel, LIMITS.customNeedLabel) : undefined
    const note = c.text(`needs.${i}.note`, n.note, LIMITS.needNote, false)
    return [{ itemId, ...opt('customLabel', customLabel), ...opt('note', note), urgent: n.urgent === true }]
  })
}

const validatePlace = (c: Checker, path: string, raw: unknown): { address: string; hours?: string } | undefined => {
  if (raw === undefined || raw === null) return undefined
  const p = obj(raw)
  const address = c.text(`${path}.address`, p.address, LIMITS.addressLine)
  const hours = c.text(`${path}.hours`, p.hours, LIMITS.shortText, false)
  return address === undefined ? undefined : { address, ...opt('hours', hours) }
}

const validateDelivery = (c: Checker, raw: unknown): DeliveryOptions => {
  const d = obj(raw)
  const inPerson = validatePlace(c, 'delivery.inPerson', d.inPerson)
  const dropOff = validatePlace(c, 'delivery.dropOff', d.dropOff)
  const postRaw = d.post === undefined || d.post === null ? undefined : obj(d.post)
  const postAddress = postRaw ? c.text('delivery.post.address', postRaw.address, LIMITS.addressLine) : undefined
  const lockersRaw = Array.isArray(d.parcelLockers) ? d.parcelLockers : []
  if (lockersRaw.length > LIMITS.maxParcelLockers) c.fail('delivery.parcelLockers', 'too_many')
  const parcelLockers = lockersRaw.slice(0, LIMITS.maxParcelLockers).flatMap((item, i): ParcelLockerChoice[] => {
    const l = obj(item)
    const provider = l.provider as ParcelProvider
    if (!PROVIDERS.includes(provider)) {
      c.fail(`delivery.parcelLockers.${i}.provider`, 'invalid')
      return []
    }
    const name = c.text(`delivery.parcelLockers.${i}.name`, l.name, LIMITS.shortText)
    const address = c.text(`delivery.parcelLockers.${i}.address`, l.address, LIMITS.addressLine)
    const lockerId = c.text(`delivery.parcelLockers.${i}.lockerId`, l.lockerId, 40, false)
    return name && address ? [{ provider, name, address, ...opt('lockerId', lockerId) }] : []
  })
  if (!inPerson && !dropOff && !postAddress && parcelLockers.length === 0) c.fail('delivery', 'required')
  return {
    ...opt('inPerson', inPerson),
    ...opt('dropOff', dropOff),
    parcelLockers,
    ...opt('post', postAddress === undefined ? undefined : { address: postAddress }),
  }
}

const validateSponsors = (c: Checker, raw: unknown): Sponsor[] => {
  const list = Array.isArray(raw) ? raw : []
  if (list.length > LIMITS.maxSponsors) c.fail('sponsors', 'too_many')
  return list.slice(0, LIMITS.maxSponsors).flatMap((item, i): Sponsor[] => {
    const s = obj(item)
    const name = c.text(`sponsors.${i}.name`, s.name, LIMITS.sponsorName)
    const url = c.test(`sponsors.${i}.url`, c.text(`sponsors.${i}.url`, s.url, LIMITS.url, false), isHttpUrl)
    if (s.logo !== undefined && !isMediaKey(s.logo)) c.fail(`sponsors.${i}.logo`, 'invalid')
    const logo = isMediaKey(s.logo) ? s.logo : undefined
    return name ? [{ name, ...opt('url', url), ...opt('logo', logo) }] : []
  })
}

export const validateProfile = (input: unknown): Result<CharityProfile> => {
  const c = new Checker()
  const p = obj(input)
  const o = obj(p.organization)
  const cp = obj(p.contactPerson)
  const a = obj(p.address)
  const loc = obj(p.location)

  const name = c.text('organization.name', o.name, LIMITS.orgName)
  const legalName = c.text('organization.legalName', o.legalName, LIMITS.legalName)
  const regNumber = c.test('organization.regNumber', c.text('organization.regNumber', o.regNumber, LIMITS.regNumber), (v) => /^[0-9A-Za-z-]{5,20}$/.test(v))
  const legalForm = o.legalForm as LegalForm
  if (!LEGAL_FORMS.includes(legalForm)) c.fail('organization.legalForm', 'required')
  const orgEmail = c.test('organization.email', c.text('organization.email', o.email, LIMITS.email), isEmail)
  const orgPhone = c.test('organization.phone', c.text('organization.phone', o.phone, LIMITS.phone), isPhone)
  const website = c.test('organization.website', c.text('organization.website', o.website, LIMITS.url, false), isHttpUrl)
  const facebook = c.test('organization.facebook', c.text('organization.facebook', o.facebook, LIMITS.url, false), isHttpUrl)
  const instagram = c.test('organization.instagram', c.text('organization.instagram', o.instagram, LIMITS.url, false), isHttpUrl)

  const firstName = c.text('contactPerson.firstName', cp.firstName, LIMITS.personName)
  const lastName = c.text('contactPerson.lastName', cp.lastName, LIMITS.personName)
  const cpEmail = c.test('contactPerson.email', c.text('contactPerson.email', cp.email, LIMITS.email), isEmail)
  const cpPhone = c.test('contactPerson.phone', c.text('contactPerson.phone', cp.phone, LIMITS.phone), isPhone)

  const street = c.text('address.street', a.street, LIMITS.addressLine)
  const city = c.text('address.city', a.city, LIMITS.city)
  const postalCode = c.test('address.postalCode', c.text('address.postalCode', a.postalCode, LIMITS.postalCode), (v) => /^(LV-?)?[0-9]{4}$/i.test(v))

  const lat = typeof loc.lat === 'number' ? loc.lat : NaN
  const lng = typeof loc.lng === 'number' ? loc.lng : NaN
  const inLatvia =
    lat >= LATVIA_BOUNDS.minLat && lat <= LATVIA_BOUNDS.maxLat && lng >= LATVIA_BOUNDS.minLng && lng <= LATVIA_BOUNDS.maxLng
  if (!inLatvia) c.fail('location', Number.isFinite(lat) && Number.isFinite(lng) ? 'out_of_range' : 'required')

  const category = typeof p.category === 'string' ? p.category : undefined
  if (!isCategoryId(category)) c.fail('category', 'required')
  const description = c.text('description', p.description, LIMITS.description)

  const photosRaw = Array.isArray(p.photos) ? p.photos : []
  if (photosRaw.length > LIMITS.maxPhotos) c.fail('photos', 'too_many')
  if (!photosRaw.every(isMediaKey)) c.fail('photos', 'invalid')
  if (p.logo !== undefined && !isMediaKey(p.logo)) c.fail('logo', 'invalid')

  const needs = validateNeeds(c, p.needs, category)
  const delivery = validateDelivery(c, p.delivery)
  const sponsors = validateSponsors(c, p.sponsors)

  return c.result<CharityProfile>(() => ({
    organization: {
      name: name!, legalName: legalName!, regNumber: regNumber!, legalForm, publicBenefit: o.publicBenefit === true,
      email: normaliseEmail(orgEmail!), phone: orgPhone!,
      ...opt('website', website), ...opt('facebook', facebook), ...opt('instagram', instagram),
    },
    contactPerson: { firstName: firstName!, lastName: lastName!, email: normaliseEmail(cpEmail!), phone: cpPhone! },
    address: { street: street!, city: city!, postalCode: postalCode!.toUpperCase().replace(/^LV-?/, 'LV-') },
    location: { lat: Math.round(lat * 1e6) / 1e6, lng: Math.round(lng * 1e6) / 1e6 },
    category: category as CharityProfile['category'],
    description: description!,
    photos: photosRaw.filter(isMediaKey),
    ...opt('logo', isMediaKey(p.logo) ? p.logo : undefined),
    needs,
    delivery,
    sponsors,
  }))
}

export const validateApplication = (input: unknown): Result<ApplicationRequest> => {
  const r = obj(input)
  const c = new Checker()
  if (typeof r.website === 'string' && r.website !== '') c.fail('website', 'invalid')
  const accountEmail = c.test('accountEmail', c.text('accountEmail', r.accountEmail, LIMITS.email), isEmail)
  if (r.acceptTerms !== true) c.fail('acceptTerms', 'required')
  const claimCharityId = c.text('claimCharityId', r.claimCharityId, CHARITY_ID_MAX, false)
  const profile = validateProfile(r.profile)
  if (!profile.ok || c.failed) {
    const own = c.result(() => null)
    return {
      ok: false,
      fields: {
        ...(own.ok ? {} : own.fields),
        ...(profile.ok ? {} : Object.fromEntries(Object.entries(profile.fields).map(([k, v]) => [`profile.${k}`, v]))),
      },
    }
  }
  return {
    ok: true,
    value: {
      profile: profile.value, accountEmail: normaliseEmail(accountEmail!), acceptTerms: true,
      ...opt('claimCharityId', claimCharityId),
    },
  }
}

/** `allowedNeedKeys`: the needKey()s of the charity's published needs. */
export const validatePledge = (input: unknown, allowedNeedKeys: readonly string[]): Result<PledgeRequest> => {
  const r = obj(input)
  const c = new Checker()
  if (typeof r.website === 'string' && r.website !== '') c.fail('website', 'invalid')
  const needs = Array.isArray(r.needs) ? r.needs.filter((n): n is string => typeof n === 'string') : []
  const unique = [...new Set(needs)]
  if (unique.length === 0) c.fail('needs', 'required')
  if (!unique.every((n) => allowedNeedKeys.includes(n))) c.fail('needs', 'invalid')
  const anonymous = r.anonymous !== false
  const name = c.text('name', r.name, LIMITS.personName, !anonymous)
  const company = anonymous ? undefined : c.text('company', r.company, LIMITS.companyName, false)
  const subscribe = r.subscribe === true
  if (r.general !== undefined && typeof r.general !== 'boolean') c.fail('general', 'invalid')
  const general = r.general === true
  const email = c.test('email', c.text('email', r.email, LIMITS.email, subscribe || general), isEmail)
  const message = c.text('message', r.message, LIMITS.pledgeMessage, false)
  const consent = r.consent === true
  if ((subscribe || general || email !== undefined) && !consent) c.fail('consent', 'required')
  return c.result<PledgeRequest>(() => ({
    needs: unique, anonymous, subscribe, consent, ...(general ? { general: true } : {}),
    ...opt('name', name), ...opt('company', company), ...opt('email', email === undefined ? undefined : normaliseEmail(email)), ...opt('message', message),
  }))
}

export const validateSubscribe = (input: unknown): Result<SubscribeRequest> => {
  const r = obj(input)
  const c = new Checker()
  if (typeof r.website === 'string' && r.website !== '') c.fail('website', 'invalid')
  const email = c.test('email', c.text('email', r.email, LIMITS.email), isEmail)
  const name = c.text('name', r.name, LIMITS.personName, false)
  if (r.consent !== true) c.fail('consent', 'required')
  const charityId = c.text('charityId', r.charityId, 40, false)
  if (r.general !== undefined && typeof r.general !== 'boolean') c.fail('general', 'invalid')
  // A sign-up from no organisation can only be the general newsletter.
  const general = charityId === undefined || r.general === true
  return c.result<SubscribeRequest>(() => ({
    email: normaliseEmail(email!), consent: true, general, ...opt('name', name), ...opt('charityId', charityId),
  }))
}

export const validatePassword = (password: unknown): 'required' | 'too_short' | 'too_long' | null => {
  if (typeof password !== 'string' || password === '') return 'required'
  if (password.length < LIMITS.passwordMin) return 'too_short'
  if (password.length > LIMITS.passwordMax) return 'too_long'
  return null
}
