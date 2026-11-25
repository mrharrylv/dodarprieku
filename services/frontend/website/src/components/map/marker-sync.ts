/**
 * Which markers the map should show: one per cluster or charity in the
 * source's rendered tiles that lies in (or just around) the view, keyed so a
 * marker that stays on screen is reused rather than rebuilt on every frame.
 * Pure, so it is tested without a map.
 */
import { CATEGORIES, type CategoryId } from '@shared/catalog'

import { COARSE_RADIUS, FINE_FROM_ZOOM, HEART_PX, MIN_VISIBLE_MARKERS, type SourceKey } from './map-config'

export type PinItem =
  | { readonly key: string; readonly kind: 'point'; readonly id: string; readonly lngLat: readonly [number, number] }
  | {
      readonly key: string
      readonly kind: 'cluster'
      readonly source: SourceKey
      readonly clusterId: number
      readonly count: number
      /**
       * The one category every charity in it shares, or null when they mix:
       * only then is it a heart. Never a guess from a majority.
       */
      readonly category: CategoryId | null
      readonly lngLat: readonly [number, number]
    }

/** The parts of a GeoJSON feature that matter here. */
export interface SourceFeature {
  readonly geometry: { readonly type: string; readonly coordinates?: unknown }
  readonly properties: Readonly<Record<string, unknown>> | null
}

/** West, south, east, north, in degrees. */
export interface ViewBox {
  readonly west: number
  readonly south: number
  readonly east: number
  readonly north: number
}

/** The cluster property that counts one category: `n:<category id>`. */
export const categoryCountProp = (id: CategoryId): string => `n:${id}`

/**
 * MapLibre `clusterProperties`: how many of each category a cluster holds,
 * so every cluster knows its composition exactly.
 */
export const clusterProperties = (): Record<string, unknown> =>
  Object.fromEntries(
    CATEGORIES.map((c) => [categoryCountProp(c.id), ['+', ['case', ['==', ['get', 'category'], c.id], 1, 0]]]),
  )

const EARTH_CIRCUMFERENCE_M = 40_075_016.686
const TILE_PX = 512

const point = (geometry: SourceFeature['geometry']): readonly [number, number] | null => {
  const c = geometry.coordinates
  return geometry.type === 'Point' && Array.isArray(c) && typeof c[0] === 'number' && typeof c[1] === 'number'
    ? [c[0], c[1]]
    : null
}

/**
 * The category all of a cluster's `count` charities share, or null when they
 * mix. A 1-1 pair is mixed: it used to be drawn as the first category in the
 * catalogue (a "2" soup kitchen near Liepāja whose members were a soup kitchen
 * and an "other" 40 m apart), so the count and the icon disagreed.
 */
export const sharedCategory = (props: Readonly<Record<string, unknown>>, count: number): CategoryId | null => {
  for (const c of CATEGORIES) {
    const n = props[categoryCountProp(c.id)]
    if (typeof n === 'number' && n > 0) return n === count ? c.id : null
  }
  return null
}

const toItem = (feature: SourceFeature, source: SourceKey): PinItem | null => {
  const lngLat = point(feature.geometry)
  const props = feature.properties ?? {}
  if (lngLat === null) return null
  if (props.cluster === true && typeof props.cluster_id === 'number' && typeof props.point_count === 'number') {
    return {
      key: `c:${source}:${props.cluster_id}`,
      kind: 'cluster',
      source,
      clusterId: props.cluster_id,
      count: props.point_count,
      category: sharedCategory(props, props.point_count),
      lngLat,
    }
  }
  return typeof props.id === 'string' ? { key: `p:${props.id}`, kind: 'point', id: props.id, lngLat } : null
}

/** Features to pin items, duplicates (one feature in several tiles) dropped. */
export const pinItems = (features: readonly SourceFeature[], source: SourceKey = 'coarse'): readonly PinItem[] => {
  const seen = new Set<string>()
  const items: PinItem[] = []
  for (const feature of features) {
    const item = toItem(feature, source)
    if (item === null || seen.has(item.key)) continue
    seen.add(item.key)
    items.push(item)
  }
  return items
}

/** The view grown by `margin` of its own width and height on every side. */
export const padBox = (box: ViewBox, margin: number): ViewBox => {
  const dx = (box.east - box.west) * margin
  const dy = (box.north - box.south) * margin
  return { west: box.west - dx, south: box.south - dy, east: box.east + dx, north: box.north + dy }
}

/** Only the items inside the box: nothing off screen becomes a DOM marker. */
export const inBox = (items: readonly PinItem[], box: ViewBox): readonly PinItem[] =>
  items.filter(({ lngLat: [lng, lat] }) => lng >= box.west && lng <= box.east && lat >= box.south && lat <= box.north)

/**
 * Which clustering to show: the fine one from FINE_FROM_ZOOM, or sooner
 * when the coarse one leaves fewer than MIN_VISIBLE_MARKERS in view and the
 * fine one splits them further.
 */
export const chooseSource = (zoom: number, coarseInView: number, fineInView: number): SourceKey =>
  zoom >= FINE_FROM_ZOOM || (coarseInView < MIN_VISIBLE_MARKERS && fineInView > coarseInView) ? 'fine' : 'coarse'

/** Metres per pixel at a whole zoom, in MapLibre's 512px world (the one `clusterRadius` is measured in). */
export const metresPerPixel = (zoom: number, lat: number): number =>
  (EARTH_CIRCUMFERENCE_M * Math.cos((lat * Math.PI) / 180)) / (TILE_PX * 2 ** Math.floor(zoom))

/**
 * The coarse clustering's radius in pixels: COARSE_RADIUS.km on the ground at
 * the zoom the country view opens on. supercluster keeps a radius in pixels at
 * every zoom, so the same radius covers half the distance at each zoom in,
 * and the grouping gets finer as the visitor zooms. Clamped so a phone's
 * far-out view never draws markers on top of each other.
 */
export const coarseRadius = (fitZoom: number, lat: number): number =>
  Math.min(COARSE_RADIUS.max, Math.max(COARSE_RADIUS.min, Math.round((COARSE_RADIUS.km * 1000) / metresPerPixel(fitZoom, lat))))

/**
 * A cheap identity for what the markers show, to skip a re-render when
 * nothing changed. Not only the keys: after a filter change supercluster
 * hands out the same cluster ids to different groups, so a key alone kept a
 * marker showing the old count and category at the old place.
 */
export const pinSignature = (items: readonly PinItem[]): string =>
  items
    .map((i) => (i.kind === 'point' ? `${i.key}@${i.lngLat.join(',')}` : `${i.key}#${i.count}:${i.category ?? '*'}@${i.lngLat.join(',')}`))
    .sort()
    .join('|')

/** A mixed cluster's heart, in pixels: clearly larger than a 44px pin, growing gently with the count. */
export const clusterSize = (count: number): number =>
  Math.round(Math.min(HEART_PX.max, HEART_PX.min + Math.log10(Math.max(count, 1)) * HEART_PX.perDecade))
