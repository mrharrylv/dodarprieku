/**
 * The location picker's map settings and the address search. Nominatim
 * (https://nominatim.openstreetmap.org) is asked only when the person presses
 * the search button, never as they type, as the privacy policy promises.
 */

import { LATVIA_BOUNDS, type GeoPoint } from '@shared/contracts'

import { REQUEST_TIMEOUT_MS } from '@/config/constants'

export const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/positron'
export const NOMINATIM_SEARCH_URL = 'https://nominatim.openstreetmap.org/search'
/** Riga, and a zoom that shows the whole country: where the map opens with no pin yet. */
export const DEFAULT_CENTER: GeoPoint = { lat: 56.95, lng: 24.11 }
export const COUNTRY_ZOOM = 6.6
export const PIN_ZOOM = 15
export const MAX_BOUNDS: [[number, number], [number, number]] = [
  [LATVIA_BOUNDS.minLng - 1, LATVIA_BOUNDS.minLat - 0.6],
  [LATVIA_BOUNDS.maxLng + 1, LATVIA_BOUNDS.maxLat + 0.6],
]

export const roundCoord = (value: number): number => Math.round(value * 1e6) / 1e6

export const inLatvia = (p: GeoPoint): boolean =>
  p.lat >= LATVIA_BOUNDS.minLat && p.lat <= LATVIA_BOUNDS.maxLat && p.lng >= LATVIA_BOUNDS.minLng && p.lng <= LATVIA_BOUNDS.maxLng

export const searchUrl = (query: string): string => {
  const params = new URLSearchParams({ format: 'json', countrycodes: 'lv', limit: '1', q: query.trim() })
  return `${NOMINATIM_SEARCH_URL}?${params.toString()}`
}

/** The first result's point, or null when there is none or it is malformed. */
export const firstResult = (body: unknown): GeoPoint | null => {
  if (!Array.isArray(body) || body.length === 0) return null
  const first = body[0] as { lat?: unknown; lon?: unknown } | null
  const lat = Number(first?.lat)
  const lng = Number(first?.lon)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return { lat: roundCoord(lat), lng: roundCoord(lng) }
}

export type GeocodeResult =
  | { readonly ok: true; readonly point: GeoPoint }
  | { readonly ok: false; readonly error: 'empty' | 'not_found' | 'outside' | 'network' | 'timeout' | 'server' }

export const geocode = async (query: string): Promise<GeocodeResult> => {
  if (query.trim() === '') return { ok: false, error: 'empty' }
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const response = await globalThis.fetch(searchUrl(query), {
      headers: { accept: 'application/json' },
      signal: controller.signal,
    })
    if (!response.ok) return { ok: false, error: 'server' }
    const point = firstResult(await response.json().catch(() => null))
    if (!point) return { ok: false, error: 'not_found' }
    return inLatvia(point) ? { ok: true, point } : { ok: false, error: 'outside' }
  } catch (err) {
    if (controller.signal.aborted) return { ok: false, error: 'timeout' }
    console.error('[geocode] address search failed', err)
    return { ok: false, error: 'network' }
  } finally {
    clearTimeout(timer)
  }
}
