/**
 * One row of the charity map CSV -> one imported charity profile. Pure. Only
 * what the registers say goes in: no needs, no photos, no invented facts, and
 * a contact person that is visibly a placeholder (it is never public anyway).
 */
import { LATVIA_BOUNDS, LIMITS, type CharityProfile, type LegalForm } from '../../../shared/src/contracts'
import { isEmail, isHttpUrl, normaliseEmail } from '../../../shared/src/validate'
import { CATEGORY_MAP, isCsvCategory, legalFormFromName, legalFormOf } from './categories'

export type CsvRow = Readonly<Record<string, string>>

export type RowResult =
  | {
      readonly ok: true
      readonly id: string
      readonly profile: CharityProfile
      /** The pin is a settlement's or municipality's centre, not the building. */
      readonly approximate: boolean
    }
  | { readonly ok: false; readonly id: string; readonly reason: string }

export const PLACEHOLDER_CONTACT = { firstName: 'Nav norādīts', lastName: '', email: '', phone: '' } as const

const DESCRIPTION_TAIL = 'Dati no publiskajiem reģistriem; iestāde savu profilu vēl nav papildinājusi.'
const GENERIC_LABEL = 'Organizācija'
const ELLIPSIS = '…'
const POSTAL_RE = /\bLV-?(\d{4})\b/i
const MUNICIPALITY_RE = /(\bnov\.|\bnovads|\bpag\.|\bpagasts)$/i

const col = (row: CsvRow, name: string): string => (row[name] ?? '').trim()

const tokens = (text: string): string[] =>
  text.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((t) => t !== '')

/** Cuts `text` to `max` characters on a word boundary; drops a bracket the cut would leave open. */
export const cutWords = (text: string, max: number): string => {
  if (text.length <= max) return text
  const head = text.slice(0, max - ELLIPSIS.length)
  const space = head.lastIndexOf(' ')
  const words = (space > max / 2 ? head.slice(0, space) : head).replace(/[\s,;:(–-]+$/u, '')
  const open = words.lastIndexOf('(')
  if (open > words.lastIndexOf(')') && open >= max / 3) return words.slice(0, open).trimEnd()
  return `${words}${ELLIPSIS}`
}

/**
 * Every word is in the address, and so is the first number (the house); a
 * further number, a flat ("Biešu iela 6 - 1"), is not in a standardised address.
 */
const repeatsAddress = (inside: readonly string[], known: ReadonlySet<string>): boolean => {
  const numbers = inside.filter((t) => /^\d+$/.test(t))
  const words = inside.filter((t) => !/^\d+$/.test(t))
  const firstNumber = numbers[0]
  return inside.length > 0 && words.every((t) => known.has(t)) && (firstNumber === undefined || known.has(firstNumber))
}

/**
 * "Dienas centrs (Parka iela 6, Madona)" -> "Dienas centrs" when every word in
 * the brackets is already in the address; brackets that say anything else stay.
 */
export const cleanName = (name: string, address: string, city: string): string => {
  const match = /^(.*\S)\s*\(([^()]*)\)\s*$/u.exec(name.trim())
  let out = name.trim()
  if (match) {
    const known = new Set([...tokens(address), ...tokens(city)])
    if (repeatsAddress(tokens(match[2]!), known)) out = match[1]!.trim()
  }
  return cutWords(out.replace(/\s+/g, ' '), LIMITS.orgName)
}

export const postalCodeOf = (address: string): string => {
  const m = POSTAL_RE.exec(address)
  return m ? `LV-${m[1]}` : ''
}

/**
 * The street part of a standardised address: the postal code, the city and the
 * municipality/parish parts are dropped from the end. The first part always stays.
 */
export const streetOf = (address: string, city: string): string => {
  const cityParts = new Set(city.split(',').map((p) => p.trim().toLowerCase()).filter((p) => p !== ''))
  const parts = address.split(',').map((p) => p.trim()).filter((p) => p !== '')
  let end = parts.length
  while (end > 1) {
    const part = parts[end - 1]!
    const lower = part.toLowerCase()
    if (!(POSTAL_RE.test(part) || MUNICIPALITY_RE.test(part) || cityParts.has(lower))) break
    end -= 1
  }
  return cutWords(parts.slice(0, end).join(', '), LIMITS.addressLine)
}

/** The first valid address of `email`, then of `other_emails` (separated by ; , or spaces). */
export const firstEmail = (...lists: readonly string[]): string => {
  const found = lists
    .flatMap((l) => l.split(/[;,\s]+/))
    .map(normaliseEmail)
    .find((e) => e !== '' && isEmail(e))
  return found ?? ''
}

/**
 * The first number of a list ("+371 22429754; +371 67336653"), without a
 * trailing label ("64222475 (lietvede)" -> "64222475"). One number only: the
 * charity page turns it into a single tel: link. Short service numbers are kept.
 */
export const phoneOf = (raw: string): string => {
  const first = (raw.split(/[;,]/)[0] ?? '').replace(/\s*\([^()]*\)\s*$/u, '').trim()
  return first.length <= LIMITS.phone ? first : ''
}

/** The register's legal form; when it is blank, what the legal name or the name states. */
export const legalFormOfRow = (legalForm: string, ...names: readonly string[]): LegalForm =>
  legalForm.trim() === '' ? legalFormFromName(...names) : legalFormOf(legalForm)

/** coord_precision values that put the pin on the building itself. Blank: the source did not say. */
const EXACT_PRECISION = new Set(['building', ''])
const APPROXIMATE_NOTE: Readonly<Record<string, string>> = {
  settlement: 'Kartē atzīmēts apdzīvotās vietas centrs, nevis precīza adrese.',
  municipality: 'Kartē atzīmēts novada centrs, nevis precīza adrese.',
}
const APPROXIMATE_FALLBACK = 'Atrašanās vieta kartē ir aptuvena.'

export const isApproximate = (precision: string): boolean => !EXACT_PRECISION.has(precision.trim().toLowerCase())

const approximateNote = (precision: string): string =>
  APPROXIMATE_NOTE[precision.trim().toLowerCase()] ?? APPROXIMATE_FALLBACK

export const websiteOf = (raw: string): string | undefined => {
  const v = raw.trim()
  return v !== '' && isHttpUrl(v) ? v : undefined
}

/** The neutral sentence, plus a note when the pin is only the settlement's or municipality's centre. */
export const descriptionOf = (categoryLv: string, city: string, precision = 'building'): string => {
  const label = categoryLv === '' || categoryLv.toLowerCase() === 'cits' ? GENERIC_LABEL : categoryLv
  const head = city === '' ? label : `${label}, ${city}`
  const text = `${head.replace(/\.$/, '')}. ${DESCRIPTION_TAIL}`
  return isApproximate(precision) ? `${text} ${approximateNote(precision)}` : text
}

const coordinate = (raw: string): number => (raw === '' ? NaN : Math.round(Number(raw) * 1e6) / 1e6)

const inLatvia = (lat: number, lng: number): boolean =>
  lat >= LATVIA_BOUNDS.minLat && lat <= LATVIA_BOUNDS.maxLat && lng >= LATVIA_BOUNDS.minLng && lng <= LATVIA_BOUNDS.maxLng

export const rowToProfile = (row: CsvRow): RowResult => {
  const id = `imp-${col(row, 'location_id')}`
  if (col(row, 'location_id') === '') return { ok: false, id, reason: 'no location_id' }
  if (col(row, 'legal_status').toLowerCase().startsWith('terminated')) return { ok: false, id, reason: 'terminated' }
  const rawCategory = col(row, 'category')
  if (!isCsvCategory(rawCategory)) throw new Error(`unknown category "${rawCategory}" in ${id}: add it to CATEGORY_MAP`)
  const addressStd = col(row, 'address_std') || col(row, 'address')
  const city = cutWords(col(row, 'city'), LIMITS.city)
  const name = cleanName(col(row, 'name') || col(row, 'organization_name'), addressStd, city)
  if (name === '') return { ok: false, id, reason: 'no name' }
  const lat = coordinate(col(row, 'lat'))
  const lng = coordinate(col(row, 'lon'))
  if (!inLatvia(lat, lng)) return { ok: false, id, reason: 'no location in Latvia' }
  const website = websiteOf(col(row, 'website'))
  const inPersonAddress = cutWords(addressStd, LIMITS.addressLine)
  const legalName = cutWords(col(row, 'legal_name') || col(row, 'organization_name') || name, LIMITS.legalName)
  const profile: CharityProfile = {
    organization: {
      name,
      legalName,
      regNumber: (col(row, 'regcode') || col(row, 'organization_regcode')).slice(0, LIMITS.regNumber),
      legalForm: legalFormOfRow(col(row, 'legal_form'), legalName, name),
      publicBenefit: false,
      email: firstEmail(col(row, 'email'), col(row, 'other_emails')),
      phone: phoneOf(col(row, 'phone')),
      ...(website ? { website } : {}),
    },
    contactPerson: { ...PLACEHOLDER_CONTACT },
    address: { street: streetOf(addressStd, city), city, postalCode: postalCodeOf(addressStd) },
    location: { lat, lng },
    category: CATEGORY_MAP[rawCategory],
    description: descriptionOf(col(row, 'category_lv'), city, col(row, 'coord_precision')),
    photos: [],
    needs: [],
    delivery: { parcelLockers: [], ...(inPersonAddress ? { inPerson: { address: inPersonAddress } } : {}) },
    sponsors: [],
  }
  return { ok: true, id, profile, approximate: isApproximate(col(row, 'coord_precision')) }
}
