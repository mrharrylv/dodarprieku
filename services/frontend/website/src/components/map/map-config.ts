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
 * Two clustered copies of the same points. The coarse one groups by distance:
 * about COARSE_RADIUS.km on the ground at the zoom the country view opens on,
 * so a desktop shows a couple of dozen groups and Riga splits into several
 * (Harry, 2026-11-26: a width-based 160px radius left five hearts). The fine
 * one takes over once the view is close (FINE_FROM_ZOOM) or the coarse one
 * leaves fewer than MIN_VISIBLE_MARKERS on screen. Each has an invisible
 * layer: MapLibre only tiles a source some layer uses, and the markers read
 * those tiles.
 */
export const SOURCES = {
  /** Its radius is worked out from the country view's zoom (coarseRadius). */
  coarse: { id: 'charities', layer: 'charities-hit' },
  fine: { id: 'charities-fine', layer: 'charities-fine-hit', radius: 60 },
} as const
export type SourceKey = keyof typeof SOURCES
/** The coarse radius: this many kilometres at the country view, in pixels between the two bounds. */
export const COARSE_RADIUS = { km: 45, min: 48, max: 200 } as const
/**
 * The coarse radius is worked out again when the map's size changes (a phone
 * turned, a window resized), and the source rebuilt only when the new radius
 * differs from the one in use by more than this share: a rebuild re-tiles
 * every cluster, so a few pixels are not worth it.
 */
export const COARSE_REBUILD_CHANGE = 0.15
/**
 * A cluster of more than `over` charities is drawn as its children one zoom
 * further in (cluster-split.ts), as long as they stay `minGapPx` apart on
 * screen: Riga was one heart of 353 at the country view.
 */
export const SPLIT_CLUSTERS = { over: 150, minGapPx: 56 } as const
/**
 * Clusters last until this zoom, so two charities a few doors apart stay one
 * marker until they are far enough apart on screen not to cover each other.
 */
export const CLUSTER_MAX_ZOOM = 16
/** From this zoom (roughly a 100 km wide view) the fine clustering is used. */
export const FINE_FROM_ZOOM = 9
/**
 * Organisations without needs appear, greyed out, from this zoom (a few
 * streets of Riga); at the country, regional and town views only the ones that
 * need something are on the map (Harry, 2026-11-26). Zoom 11 put hundreds of
 * grey pins over Riga, in clumps on top of the hearts.
 */
export const FADED_FROM_ZOOM = 13
/**
 * How the faded pins are thinned: none within `minGapPx` of an active marker
 * or of another faded one, and at most `max` in view, so they stay a quiet
 * background and the tab order stays short.
 */
export const FADED = { minGapPx: 40, max: 40 } as const
/** Fewer markers than this on screen and the clusters split further. */
export const MIN_VISIBLE_MARKERS = 5
/** A mixed cluster's heart, in pixels: from `min` for two, `perDecade` more for every tenfold, at most `max`. A pin is 44px. */
export const HEART_PX = { min: 52, max: 68, perDecade: 6 } as const
/**
 * Charities at the same address (one building, or one organisation listed
 * twice) are drawn on a small ring this many metres round it, so each is its
 * own pin once the map is close; stacked, one hid the other and a "2" opened
 * onto a single pin.
 */
export const COLOCATED_SPREAD_M = 12
/**
 * Neighbours on that ring stay at least this far apart, in metres: a 44px pin
 * at zoom 17, where the clusters have all opened (about 0.33 m a pixel at
 * Latvia's latitude). The ring grows for a crowd to keep it.
 */
export const COLOCATED_GAP_M = 15
/** Two charities closer than this, in metres, are at the same place. */
export const COLOCATED_WITHIN_M = 2
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
