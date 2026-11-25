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

export const SOURCE_ID = 'charities'
/** An invisible layer: MapLibre only tiles a source some layer uses, and the markers read those tiles. */
export const HIT_LAYER_ID = 'charities-hit'
export const CLUSTER_RADIUS = 48
export const CLUSTER_MAX_ZOOM = 12

/** Zoom a fly-to lands on, unless the map is already closer. */
export const FOCUS_ZOOM = 12.5
export const FLY_DURATION_MS = 1600
/** Pixels between a pin's centre and its popup's tip. */
export const POPUP_OFFSET = 26
