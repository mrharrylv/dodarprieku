import { LATVIA_BOUNDS } from '@shared/contracts'

/**
 * The map's fixed settings. OpenFreeMap: free vector tiles with no key; the
 * one third-party origin of the public site, named in the privacy and
 * cookie policies and allowed by the CSP (doc/specs/dodarprieku.md, "Map").
 */
export const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/positron'

/** Longitude, latitude: the middle of Latvia. */
export const MAP_CENTER: readonly [number, number] = [24.6, 56.9]
export const MAP_ZOOM = 6.6
export const MAP_MIN_ZOOM = 4.5
export const MAP_MAX_ZOOM = 18

/** How far past Latvia's box the visitor may pan, in degrees. Generous: MapLibre zooms in until the view fits inside maxBounds, so a tight box stops a tall, narrow map from showing the whole country. */
const MARGIN = { lng: 4, lat: 2.5 } as const

/** South-west and north-east corners, longitude first, as MapLibre wants them. */
export const MAP_BOUNDS: readonly [[number, number], [number, number]] = [
  [LATVIA_BOUNDS.minLng - MARGIN.lng, LATVIA_BOUNDS.minLat - MARGIN.lat],
  [LATVIA_BOUNDS.maxLng + MARGIN.lng, LATVIA_BOUNDS.maxLat + MARGIN.lat],
]

/**
 * Two clustered copies of the same points. The coarse one groups widely, so
 * the whole country reads as about ten hearts rather than forty bubbles
 * (its radius is wider than the 80-100px first suggested: with the 1024
 * imported charities 90px still left about 40 markers at country zoom); the
 * fine one takes over once the view is close (FINE_FROM_ZOOM) or the coarse
 * one leaves fewer than MIN_VISIBLE_MARKERS on screen (Harry, 2026-11-26).
 * Each has an invisible layer: MapLibre only tiles a source some layer uses,
 * and the markers read those tiles.
 */
export const SOURCES = {
  /** Its radius follows the map's width (coarseRadius), at most this. */
  coarse: { id: 'charities', layer: 'charities-hit', radius: 160 },
  fine: { id: 'charities-fine', layer: 'charities-fine-hit', radius: 60 },
} as const
export type SourceKey = keyof typeof SOURCES
/** The coarse radius is the map's width over this, between the two bounds: a phone groups less widely. */
export const COARSE_RADIUS = { divisor: 9, min: 56 } as const
export const CLUSTER_MAX_ZOOM = 13
/** From this zoom (roughly a 100 km wide view) the fine clustering is used. */
export const FINE_FROM_ZOOM = 9
/** Fewer markers than this on screen and the clusters split further. */
export const MIN_VISIBLE_MARKERS = 5
/** A cluster this small is drawn as one category pin with a count, never a lone "2". */
export const SMALL_CLUSTER_MAX = 3
/** How far past a cluster's expansion zoom a click goes, so it really opens. */
export const CLUSTER_ZOOM_EXTRA = 0.5
/** While the map moves, the markers are worked out at most this often, in milliseconds; once it stops, at once. */
export const MOVE_SYNC_MS = 120
/** Markers are kept for a margin around the view, as a share of its size, so panning never pops them in. */
export const VIEW_MARGIN = 0.2

/** Zoom a fly-to lands on, unless the map is already closer. */
export const FOCUS_ZOOM = 14
export const FLY_DURATION_MS = 1600
/** Pixels between a pin's centre and its popup's tip. */
export const POPUP_OFFSET = 26
/** How far below the map's centre a selected pin settles, in pixels: the small card opens above it. */
export const POPUP_PAN_OFFSET_PX = 170
/** On a phone the small card settles this far right of centre, clear of the rail. */
export const POPUP_PHONE_SHIFT_PX = 16
/** How far above the map's bottom edge the pin of an expanded card settles, in pixels. */
export const EXPANDED_PIN_FROM_BOTTOM_PX = 36

/**
 * Below this width the map's panels are a bottom sheet over the map (Tailwind's
 * `md` breakpoint), so choosing a charity in the list closes the sheet to show it.
 */
export const PANEL_SHEET_QUERY = '(max-width: 47.99rem)'

/** Where a selected pin settles from the map's centre, in pixels: below it, and right of it on a phone. */
export const popupPanOffset = (): [number, number] => {
  const phone = typeof window.matchMedia === 'function' && window.matchMedia(PANEL_SHEET_QUERY).matches
  return [phone ? POPUP_PHONE_SHIFT_PX : 0, POPUP_PAN_OFFSET_PX]
}
