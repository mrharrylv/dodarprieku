// Pure normalisers for the parcel-locker snapshot. No I/O here, so it can be tested offline.
// Output shape matches ParcelLockerChoice in src/contracts.ts plus city and coordinates:
// { provider, id, name, address, city, lat?, lng? }

export const COUNTRY = 'LV'

/** Rough bounding box of Latvia, used to drop coordinates that are obviously wrong. */
export const LATVIA_BOUNDS = Object.freeze({ minLat: 55.6, maxLat: 58.1, minLng: 20.9, maxLng: 28.3 })

export const SOURCES = Object.freeze({
  omniva: 'https://www.omniva.ee/locations.json',
  venipak: 'https://go.venipak.lt/ws/get_pickup_points?country=LV',
})

const clean = (value) =>
  typeof value === 'string' || typeof value === 'number' ? String(value).replace(/\s+/g, ' ').trim() : ''

const toCoord = (value) => {
  const n = Number.parseFloat(clean(value))
  return Number.isFinite(n) ? Math.round(n * 1e6) / 1e6 : undefined
}

/** Returns { lat, lng } only when both are numbers inside Latvia, otherwise {}. */
export const coords = (latRaw, lngRaw) => {
  const lat = toCoord(latRaw)
  const lng = toCoord(lngRaw)
  if (lat === undefined || lng === undefined) return {}
  const b = LATVIA_BOUNDS
  const inside = lat >= b.minLat && lat <= b.maxLat && lng >= b.minLng && lng <= b.maxLng
  return inside ? { lat, lng } : {}
}

const joinParts = (parts) => parts.map(clean).filter(Boolean).join(' ')

/**
 * Omniva locations.json row. A0_NAME is the country, A1 the municipality, A2 the town or parish,
 * A3 the village, A5 the street, A6 a house name, A7 the house number, A8 a flat or building.
 * ZIP is Omniva's own locker id. X_COORDINATE is longitude, Y_COORDINATE latitude.
 */
export const normaliseOmniva = (row) => {
  if (!row || clean(row.A0_NAME) !== COUNTRY) return null
  const id = clean(row.ZIP)
  const name = clean(row.NAME)
  if (!id || !name) return null
  const street = joinParts([row.A5_NAME, row.A7_NAME])
  const flat = clean(row.A8_NAME)
  const address = [street || clean(row.A6_NAME), flat].filter(Boolean).join(', ')
  const city = clean(row.A3_NAME) || clean(row.A2_NAME) || clean(row.A1_NAME)
  return {
    provider: 'omniva',
    id,
    name,
    address: address || city,
    city,
    ...coords(row.Y_COORDINATE, row.X_COORDINATE),
  }
}

/** Venipak get_pickup_points row: type 3 is a locker, type 1 a staffed pickup point. */
export const normaliseVenipak = (row) => {
  if (!row || clean(row.country) !== COUNTRY) return null
  const id = clean(row.id)
  const name = clean(row.display_name) || clean(row.name)
  if (!id || !name) return null
  const city = clean(row.city)
  return {
    provider: 'venipak',
    id,
    name,
    address: clean(row.address) || city,
    city,
    ...coords(row.lat, row.lng),
  }
}

export const NORMALISERS = Object.freeze({ omniva: normaliseOmniva, venipak: normaliseVenipak })

const collator = new Intl.Collator('lv', { sensitivity: 'base' })

export const compareLockers = (a, b) =>
  collator.compare(a.provider, b.provider) ||
  collator.compare(a.city, b.city) ||
  collator.compare(a.name, b.name) ||
  collator.compare(a.id, b.id)

/** Normalises raw rows of one provider, drops non-Latvian and broken rows. */
export const normaliseRows = (provider, rows) => {
  const normalise = NORMALISERS[provider]
  if (!normalise) throw new Error(`Unknown provider: ${provider}`)
  if (!Array.isArray(rows)) throw new Error(`${provider}: expected an array, got ${typeof rows}`)
  return rows.map(normalise).filter(Boolean)
}

/** Dedupes by provider+id (first wins), then sorts by provider, city, name. Returns a new array. */
export const finalise = (lockers) => {
  const seen = new Set()
  const unique = lockers.filter((l) => {
    const key = `${l.provider}:${l.id}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  return [...unique].sort(compareLockers)
}

/** Compact JSON: one object per line, so diffs stay readable. */
export const serialise = (lockers) =>
  lockers.length === 0 ? '[]\n' : `[\n${lockers.map((l) => JSON.stringify(l)).join(',\n')}\n]\n`

export const countByProvider = (lockers) =>
  lockers.reduce((acc, l) => ({ ...acc, [l.provider]: (acc[l.provider] ?? 0) + 1 }), {})
