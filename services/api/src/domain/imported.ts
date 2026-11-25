/**
 * Charities imported from public registers (services/api/data/*.json), not
 * applied for. They have no needs, no photos and no account, so they cannot
 * pass validateProfile; this guard checks the shape and the limits instead,
 * and validateProfile stays the bar for everything a person submits.
 */
import { isCategoryId } from '../../../shared/src/catalog'
import { LATVIA_BOUNDS, LIMITS, type CharityProfile, type LegalForm } from '../../../shared/src/contracts'
import { isEmail, isHttpUrl, isMediaKey } from '../../../shared/src/validate'

export interface ImportedCharity {
  /** 'imp-' + the source's own location id. Stable, so a re-import overwrites. */
  readonly id: string
  readonly slug: string
  readonly profile: CharityProfile
  /** 'import:<dataset>', e.g. 'import:charity-map-2026-11-25'. */
  readonly source: string
}

export const IMPORT_ID_RE = /^imp-[A-Za-z0-9-]{1,40}$/
export const IMPORT_SOURCE_RE = /^import:[a-z0-9-]{1,80}$/
export const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/
export const MAX_SLUG = 60

const LEGAL_FORMS: readonly LegalForm[] = [
  'biedriba', 'nodibinajums', 'pasvaldibas-iestade', 'valsts-iestade', 'religiska-organizacija', 'komersants', 'cits',
]

type Obj = Readonly<Record<string, unknown>>
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)
/** An object with no keys but these: nothing unknown is ever persisted or published. */
const isObjOf = (v: unknown, keys: readonly string[]): v is Obj =>
  isObj(v) && Object.keys(v).every((k) => keys.includes(k))
const str = (v: unknown, max: number): boolean => typeof v === 'string' && v.length <= max
/** '' (the register had none) or a valid address. */
const emailOrEmpty = (v: unknown): boolean => v === '' || (typeof v === 'string' && isEmail(v))
const optUrl = (v: unknown): boolean => v === undefined || (str(v, LIMITS.url) && isHttpUrl(v as string))

const ORGANIZATION_KEYS = [
  'name', 'legalName', 'regNumber', 'legalForm', 'publicBenefit', 'email', 'phone', 'website', 'facebook', 'instagram',
] as const
const CONTACT_KEYS = ['firstName', 'lastName', 'email', 'phone'] as const
const ADDRESS_KEYS = ['street', 'city', 'postalCode'] as const
const LOCATION_KEYS = ['lat', 'lng'] as const
const PLACE_KEYS = ['address', 'hours'] as const
const POST_KEYS = ['address'] as const
const DELIVERY_KEYS = ['inPerson', 'dropOff', 'parcelLockers', 'post'] as const
const PROFILE_KEYS = [
  'organization', 'contactPerson', 'address', 'location', 'category', 'description', 'photos', 'logo', 'needs',
  'delivery', 'sponsors',
] as const
const ITEM_KEYS = ['id', 'slug', 'profile', 'source'] as const

const isOrganization = (v: unknown): boolean =>
  isObjOf(v, ORGANIZATION_KEYS) &&
  str(v.name, LIMITS.orgName) && v.name !== '' &&
  str(v.legalName, LIMITS.legalName) &&
  str(v.regNumber, LIMITS.regNumber) &&
  LEGAL_FORMS.includes(v.legalForm as LegalForm) &&
  typeof v.publicBenefit === 'boolean' &&
  emailOrEmpty(v.email) &&
  str(v.phone, LIMITS.phone) &&
  optUrl(v.website) &&
  optUrl(v.facebook) &&
  optUrl(v.instagram)

const isContact = (v: unknown): boolean =>
  isObjOf(v, CONTACT_KEYS) &&
  str(v.firstName, LIMITS.personName) && str(v.lastName, LIMITS.personName) &&
  emailOrEmpty(v.email) && str(v.phone, LIMITS.phone)

const isAddress = (v: unknown): boolean =>
  isObjOf(v, ADDRESS_KEYS) && str(v.street, LIMITS.addressLine) && str(v.city, LIMITS.city) && str(v.postalCode, LIMITS.postalCode)

const isLocation = (v: unknown): boolean =>
  isObjOf(v, LOCATION_KEYS) &&
  typeof v.lat === 'number' && typeof v.lng === 'number' &&
  v.lat >= LATVIA_BOUNDS.minLat && v.lat <= LATVIA_BOUNDS.maxLat &&
  v.lng >= LATVIA_BOUNDS.minLng && v.lng <= LATVIA_BOUNDS.maxLng

const isPlace = (v: unknown): boolean =>
  v === undefined ||
  (isObjOf(v, PLACE_KEYS) && str(v.address, LIMITS.addressLine) && (v.hours === undefined || str(v.hours, LIMITS.shortText)))

const isPost = (v: unknown): boolean => v === undefined || (isObjOf(v, POST_KEYS) && str(v.address, LIMITS.addressLine))

const isDelivery = (v: unknown): boolean =>
  isObjOf(v, DELIVERY_KEYS) &&
  Array.isArray(v.parcelLockers) && v.parcelLockers.length === 0 &&
  isPlace(v.inPerson) && isPlace(v.dropOff) && isPost(v.post)

export const isImportedProfile = (v: unknown): v is CharityProfile =>
  isObjOf(v, PROFILE_KEYS) &&
  isOrganization(v.organization) &&
  isContact(v.contactPerson) &&
  isAddress(v.address) &&
  isLocation(v.location) &&
  isCategoryId(v.category) &&
  str(v.description, LIMITS.description) && v.description !== '' &&
  Array.isArray(v.photos) && v.photos.length <= LIMITS.maxPhotos && v.photos.every(isMediaKey) &&
  (v.logo === undefined || isMediaKey(v.logo)) &&
  Array.isArray(v.needs) && v.needs.length === 0 &&
  isDelivery(v.delivery) &&
  Array.isArray(v.sponsors) && v.sponsors.length === 0

export const isImportedCharity = (v: unknown): v is ImportedCharity =>
  isObjOf(v, ITEM_KEYS) &&
  typeof v.id === 'string' && IMPORT_ID_RE.test(v.id) &&
  typeof v.slug === 'string' && v.slug.length <= MAX_SLUG && SLUG_RE.test(v.slug) &&
  typeof v.source === 'string' && IMPORT_SOURCE_RE.test(v.source) &&
  isImportedProfile(v.profile)
