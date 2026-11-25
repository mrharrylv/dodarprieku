/**
 * The one contract between the browser apps (public site, admin portal) and
 * the API Lambda. Plain types and constants, no runtime dependencies, so every
 * package imports it as source:
 *
 *   website / admin:  import ... from '@shared/contracts'
 *   api:              import ... from '../../shared/src/contracts'
 *
 * Changing a shape here is a change to every caller in the same commit.
 * The spec that explains each flow is doc/specs/dodarprieku.md.
 */

import type { CategoryId } from './catalog'

// ── Limits (mirrored by the API, the forms and the tests) ──────────────────

export const LIMITS = {
  orgName: 120,
  legalName: 160,
  regNumber: 20,
  description: 1500,
  shortText: 120,
  url: 300,
  email: 254,
  phone: 30,
  addressLine: 160,
  city: 80,
  postalCode: 10,
  needNote: 200,
  customNeedLabel: 60,
  maxNeeds: 40,
  maxPhotos: 6,
  maxSponsors: 24,
  sponsorName: 80,
  maxParcelLockers: 6,
  pledgeMessage: 500,
  personName: 80,
  rejectReason: 500,
  passwordMin: 10,
  passwordMax: 200,
  /** Bytes, after the browser has resized and re-encoded the image. */
  uploadMaxBytes: 2_000_000,
} as const

export const UPLOAD_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export type UploadContentType = (typeof UPLOAD_CONTENT_TYPES)[number]

/** Latvia's bounding box, generous. A location outside it is rejected. */
export const LATVIA_BOUNDS = { minLat: 55.6, maxLat: 58.1, minLng: 20.9, maxLng: 28.3 } as const

// ── Profile: what a charity submits and what the public sees ───────────────

export type LegalForm =
  | 'biedriba'
  | 'nodibinajums'
  | 'pasvaldibas-iestade'
  | 'valsts-iestade'
  | 'religiska-organizacija'
  | 'komersants'
  | 'cits'

export interface Organization {
  /** Public display name, e.g. "Dzīvnieku patversme Ulubele". */
  readonly name: string
  /** Name in the register, e.g. "Biedrība \"Ulubele\"". */
  readonly legalName: string
  /** Uzņēmumu reģistra numurs (11 digits) or iestādes kods. */
  readonly regNumber: string
  readonly legalForm: LegalForm
  /** Sabiedriskā labuma organizācijas statuss. */
  readonly publicBenefit: boolean
  /** Public contact details shown on the charity page. */
  readonly email: string
  readonly phone: string
  readonly website?: string
  readonly facebook?: string
  readonly instagram?: string
}

/** Private: only the charity and the admin see it. */
export interface ContactPerson {
  readonly firstName: string
  readonly lastName: string
  readonly email: string
  readonly phone: string
}

export interface Address {
  readonly street: string
  readonly city: string
  readonly postalCode: string
}

export interface GeoPoint {
  readonly lat: number
  readonly lng: number
}

/**
 * One thing the charity needs. `itemId` is a catalog item of the charity's
 * category, or 'custom' with `customLabel`. `note` is the charity's own words:
 * "tikai jauni dvieļi", "sausā barība kaķēniem".
 */
export interface Need {
  readonly itemId: string
  readonly customLabel?: string
  readonly note?: string
  readonly urgent: boolean
}

export type ParcelProvider = 'omniva' | 'dpd' | 'venipak' | 'latvijas-pasts' | 'smartposti'

export interface ParcelLockerChoice {
  readonly provider: ParcelProvider
  /** The provider's own locker id from parcel-lockers.json, when chosen from the list. */
  readonly lockerId?: string
  readonly name: string
  readonly address: string
}

export interface DeliveryOptions {
  /** Bring it to the institution itself. */
  readonly inPerson?: { readonly address: string; readonly hours?: string }
  /** A separate drop-off point (a shop, a partner office). */
  readonly dropOff?: { readonly address: string; readonly hours?: string }
  readonly parcelLockers: readonly ParcelLockerChoice[]
  /** Latvijas Pasts or courier to a postal address. */
  readonly post?: { readonly address: string }
}

export interface Sponsor {
  readonly name: string
  readonly url?: string
  /** Media key of an uploaded logo, e.g. "uploads/2026/11/ab12.webp". */
  readonly logo?: string
}

export interface CharityProfile {
  readonly organization: Organization
  readonly contactPerson: ContactPerson
  readonly address: Address
  readonly location: GeoPoint
  readonly category: CategoryId
  readonly description: string
  /** Media keys. The first is the cover photo. */
  readonly photos: readonly string[]
  readonly logo?: string
  readonly needs: readonly Need[]
  readonly delivery: DeliveryOptions
  readonly sponsors: readonly Sponsor[]
}

/** CharityProfile minus what is private. What the map and the charity page get. */
export type PublicProfile = Omit<CharityProfile, 'contactPerson'>

export type CharityStatus = 'pending' | 'approved' | 'rejected' | 'suspended'

// ── Public snapshot: /data/charities.json (written by the API on every publish) ─

export interface PublicCharity {
  readonly id: string
  /** URL slug, unique, derived from the name: /organizacija/<slug>. */
  readonly slug: string
  readonly profile: PublicProfile
  readonly publishedAt: string
}

export interface SponsorLeaderboardEntry {
  readonly name: string
  readonly url?: string
  readonly logo?: string
  /** How many published charities list this sponsor. */
  readonly charities: number
}

export interface PublicSnapshot {
  readonly generatedAt: string
  readonly charities: readonly PublicCharity[]
  readonly sponsorLeaderboard: readonly SponsorLeaderboardEntry[]
}

export const SNAPSHOT_PATH = '/data/charities.json'
export const MEDIA_PREFIX = '/media/'

// ── Stats and pledges ──────────────────────────────────────────────────────

export interface CharityStats {
  readonly views: number
  readonly pledges: number
  /** Pledges per need itemId (custom needs keyed "custom:<index>"). */
  readonly pledgesByNeed: Readonly<Record<string, number>>
  /** Public names of people who pledged and chose not to stay anonymous, newest first, max 20. */
  readonly recentSupporters: readonly { readonly name: string; readonly at: string }[]
}

export interface PledgeRequest {
  /** Keys as in CharityStats.pledgesByNeed. At least one. */
  readonly needs: readonly string[]
  readonly anonymous: boolean
  readonly name?: string
  readonly email?: string
  readonly message?: string
  /** Subscribe to the newsletter / urgent-need appeals. Needs email + consent. */
  readonly subscribe: boolean
  readonly consent: boolean
  /** Honeypot. Must be empty. */
  readonly website?: string
}

export interface SubscribeRequest {
  readonly email: string
  readonly name?: string
  readonly consent: true
  /** The charity page the visitor subscribed from, if any. */
  readonly charityId?: string
  readonly website?: string
}

// ── Applications, accounts, updates ────────────────────────────────────────

export interface ApplicationRequest {
  readonly profile: CharityProfile
  /** The login email; approval mail goes here. Usually contactPerson.email. */
  readonly accountEmail: string
  readonly acceptTerms: true
  readonly website?: string
}

export interface ApplicationResponse {
  readonly id: string
}

export interface UploadRequest {
  readonly kind: 'photo' | 'logo'
  readonly contentType: UploadContentType
  readonly dataBase64: string
}

export interface UploadResponse {
  /** Media key to store in the profile. */
  readonly key: string
  /** Absolute path to show it: MEDIA_PREFIX + key. */
  readonly url: string
}

export type Role = 'charity' | 'admin'

export interface Me {
  readonly email: string
  readonly role: Role
  readonly charityId?: string
}

export interface LoginRequest {
  readonly email: string
  readonly password: string
}

export interface SetPasswordRequest {
  readonly token: string
  readonly password: string
}

export interface ForgotPasswordRequest {
  readonly email: string
}

export interface PendingUpdate {
  readonly profile: CharityProfile
  readonly submittedAt: string
}

export interface AccountView {
  readonly id: string
  readonly slug: string
  readonly status: CharityStatus
  /** What is live now (or the application, while pending). */
  readonly profile: CharityProfile
  readonly pendingUpdate?: PendingUpdate
  readonly stats: CharityStats & { readonly subscribers: number }
  readonly lastListRequestAt?: string
}

export interface PledgeRecord {
  readonly id: string
  readonly charityId: string
  readonly needs: readonly string[]
  readonly anonymous: boolean
  readonly name?: string
  /** Only the admin sees emails. Absent in the charity's view. */
  readonly email?: string
  readonly message?: string
  readonly createdAt: string
}

export interface SubscriberRecord {
  readonly email: string
  readonly name?: string
  readonly charityIds: readonly string[]
  readonly createdAt: string
}

export interface ListRequestRecord {
  readonly id: string
  readonly charityId: string
  readonly charityName: string
  readonly message?: string
  readonly status: 'open' | 'done'
  readonly createdAt: string
}

// ── Admin ──────────────────────────────────────────────────────────────────

export interface AdminCharitySummary {
  readonly id: string
  readonly slug: string
  readonly name: string
  readonly category: CategoryId
  readonly city: string
  readonly status: CharityStatus
  readonly hasPendingUpdate: boolean
  readonly accountEmail: string
  readonly passwordSet: boolean
  readonly createdAt: string
  readonly updatedAt: string
  readonly views: number
  readonly pledges: number
}

export interface AdminCharityDetail extends AdminCharitySummary {
  readonly profile: CharityProfile
  readonly pendingUpdate?: PendingUpdate
  readonly rejectReason?: string
  readonly suspendReason?: string
}

export interface ReasonRequest {
  readonly reason?: string
}

// ── Envelope ───────────────────────────────────────────────────────────────

/** Every API response body. `error` is a stable code the UI maps to copy. */
export type ApiResponse<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly error: ApiErrorCode; readonly fields?: Readonly<Record<string, string>> }

export type ApiErrorCode =
  | 'bad_request'
  | 'validation'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'rate_limited'
  | 'token_invalid'
  | 'too_large'
  | 'server'

/**
 * Mutating requests must carry this header (CSRF defence on top of the
 * SameSite=Strict session cookie). The API rejects a POST/PUT/DELETE without it.
 */
export const CSRF_HEADER = 'x-dodar-request'
export const CSRF_VALUE = '1'

export const SESSION_COOKIE = 'dodar_session'
