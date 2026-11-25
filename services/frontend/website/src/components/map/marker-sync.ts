/**
 * Which markers the map should show: one per cluster or charity in the
 * source's rendered tiles, keyed so a marker that stays on screen is reused
 * rather than rebuilt on every frame. Pure, so it is tested without a map.
 */

export type PinItem =
  | { readonly key: string; readonly kind: 'point'; readonly id: string; readonly lngLat: readonly [number, number] }
  | {
      readonly key: string
      readonly kind: 'cluster'
      readonly clusterId: number
      readonly count: number
      readonly lngLat: readonly [number, number]
    }

/** The parts of a GeoJSON feature that matter here. */
export interface SourceFeature {
  readonly geometry: { readonly type: string; readonly coordinates?: unknown }
  readonly properties: Readonly<Record<string, unknown>> | null
}

const point = (geometry: SourceFeature['geometry']): readonly [number, number] | null => {
  const c = geometry.coordinates
  return geometry.type === 'Point' && Array.isArray(c) && typeof c[0] === 'number' && typeof c[1] === 'number'
    ? [c[0], c[1]]
    : null
}

/** Features to pin items, duplicates (one feature in several tiles) dropped. */
export const pinItems = (features: readonly SourceFeature[]): readonly PinItem[] => {
  const seen = new Set<string>()
  const items: PinItem[] = []
  for (const feature of features) {
    const lngLat = point(feature.geometry)
    const props = feature.properties ?? {}
    if (lngLat === null) continue
    const item: PinItem | null =
      props.cluster === true && typeof props.cluster_id === 'number' && typeof props.point_count === 'number'
        ? { key: `c:${props.cluster_id}`, kind: 'cluster', clusterId: props.cluster_id, count: props.point_count, lngLat }
        : typeof props.id === 'string'
          ? { key: `p:${props.id}`, kind: 'point', id: props.id, lngLat }
          : null
    if (item === null || seen.has(item.key)) continue
    seen.add(item.key)
    items.push(item)
  }
  return items
}

/** A cheap identity for a set of items, to skip a re-render when nothing moved in or out. */
export const pinSignature = (items: readonly PinItem[]): string =>
  items
    .map((i) => i.key)
    .sort()
    .join('|')
