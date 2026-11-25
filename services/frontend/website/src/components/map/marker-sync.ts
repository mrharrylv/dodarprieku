/**
 * Which markers the map should show: one per cluster or charity in the
 * source's rendered tiles that lies in (or just around) the view, keyed so a
 * marker that stays on screen is reused rather than rebuilt on every frame.
 * Pure, so it is tested without a map.
 */
import { CATEGORIES, type CategoryId } from '@shared/catalog'

import { COARSE_RADIUS, FINE_FROM_ZOOM, MIN_VISIBLE_MARKERS, SOURCES, type SourceKey } from './map-config'

export type PinItem =
  | { readonly key: string; readonly kind: 'point'; readonly id: string; readonly lngLat: readonly [number, number] }
  | {
      readonly key: string
      readonly kind: 'cluster'
      readonly source: SourceKey
      readonly clusterId: number
      readonly count: number
      /** The category most of its charities share, for a small cluster drawn as one pin. */
      readonly majority: CategoryId | null
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
 * so a small cluster can be drawn as the pin of its majority.
 */
export const clusterProperties = (): Record<string, unknown> =>
  Object.fromEntries(
    CATEGORIES.map((c) => [categoryCountProp(c.id), ['+', ['case', ['==', ['get', 'category'], c.id], 1, 0]]]),
  )

const point = (geometry: SourceFeature['geometry']): readonly [number, number] | null => {
  const c = geometry.coordinates
  return geometry.type === 'Point' && Array.isArray(c) && typeof c[0] === 'number' && typeof c[1] === 'number'
    ? [c[0], c[1]]
    : null
}

/** The category with the highest count in a cluster's properties; the first listed wins a tie. */
export const majorityCategory = (props: Readonly<Record<string, unknown>>): CategoryId | null => {
  let best: CategoryId | null = null
  let most = 0
  for (const c of CATEGORIES) {
    const n = props[categoryCountProp(c.id)]
    if (typeof n === 'number' && n > most) {
      best = c.id
      most = n
    }
  }
  return best
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
      majority: majorityCategory(props),
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

/** The coarse clustering's radius for a map this wide: about ten hearts across Latvia on any screen. */
export const coarseRadius = (width: number): number =>
  Math.min(SOURCES.coarse.radius, Math.max(COARSE_RADIUS.min, Math.round(width / COARSE_RADIUS.divisor)))

/** A cheap identity for a set of items, to skip a re-render when nothing moved in or out. */
export const pinSignature = (items: readonly PinItem[]): string =>
  items
    .map((i) => i.key)
    .sort()
    .join('|')

/** The heart's diameter in pixels: noticeably small, growing gently with the count. */
export const clusterSize = (count: number): number => Math.round(Math.min(44, 28 + Math.log10(Math.max(count, 1)) * 6))
