import type { GeoJSONSource, Map as MlMap } from 'maplibre-gl'

import type { toFeatureCollection } from '@/lib/snapshot'
import type { ChildrenOf, ClusterSplitter } from './cluster-split'
import { splitLevels } from './cluster-split'
import { CLUSTER_MAX_ZOOM, COARSE_REBUILD_CHANGE, FADED, SOURCES, VIEW_MARGIN, type SourceKey } from './map-config'
import {
  chooseSource,
  clusterProperties,
  coarseRadius,
  fadedInView,
  inBox,
  padBox,
  pinItems,
  thinFaded,
  type FadedPoint,
  type PinItem,
  type SourceFeature,
  type ToPixels,
} from './marker-sync'

/**
 * OpenFreeMap's style labels places in English ("Latvia", "Lithuania"). Where
 * OpenStreetMap has a Latvian name, show that instead, falling back to the
 * local name.
 */
export const applyLatvianLabels = (map: MlMap): void => {
  for (const layer of map.getStyle().layers) {
    if (layer.type !== 'symbol' || map.getLayoutProperty(layer.id, 'text-field') === undefined) continue
    map.setLayoutProperty(layer.id, 'text-field', ['coalesce', ['get', 'name:lv'], ['get', 'name']])
  }
}

type CharityData = ReturnType<typeof toFeatureCollection>

const SOURCE_KEYS = Object.keys(SOURCES) as SourceKey[]

/** The coarse radius each map's source was built with, in pixels. */
const coarseRadii = new WeakMap<MlMap, number>()

const addSource = (map: MlMap, key: SourceKey, data: CharityData, radius: number): void => {
  const { id, layer } = SOURCES[key]
  map.addSource(id, {
    type: 'geojson',
    data,
    cluster: true,
    clusterRadius: radius,
    clusterMaxZoom: CLUSTER_MAX_ZOOM,
    clusterProperties: clusterProperties(),
  })
  map.addLayer({ id: layer, type: 'circle', source: id, paint: { 'circle-radius': 1, 'circle-opacity': 0 } })
}

/**
 * Both clustered copies of the charities, each under an invisible layer so
 * MapLibre tiles it. The coarse radius comes from `countryZoom`, the zoom that
 * fits the whole country in this map, so it means the same distance on a phone
 * and on a desktop.
 */
export const addCharitySources = (map: MlMap, data: CharityData, countryZoom: number): void => {
  const coarse = coarseRadius(countryZoom, map.getCenter().lat)
  coarseRadii.set(map, coarse)
  for (const key of SOURCE_KEYS) addSource(map, key, data, key === 'coarse' ? coarse : SOURCES.fine.radius)
}

/** The coarse source's radius now, in pixels, or 0 before it exists. */
export const coarseRadiusOf = (map: MlMap): number => coarseRadii.get(map) ?? 0

/**
 * The map changed size: work the coarse radius out again for the zoom that
 * now fits the country, and rebuild the coarse source when it moved by more
 * than COARSE_REBUILD_CHANGE (MapLibre cannot change a source's radius in
 * place). True when it was rebuilt, so the caller forgets its splits.
 */
export const refitCoarseSource = (map: MlMap, data: CharityData, countryZoom: number): boolean => {
  const current = coarseRadii.get(map)
  if (current === undefined) return false
  const next = coarseRadius(countryZoom, map.getCenter().lat)
  if (Math.abs(next - current) <= current * COARSE_REBUILD_CHANGE) return false
  const { id, layer } = SOURCES.coarse
  map.removeLayer(layer)
  map.removeSource(id)
  addSource(map, 'coarse', data, next)
  coarseRadii.set(map, next)
  return true
}

/** A cluster's children one zoom further in, from the source it came from. */
export const childrenOf =
  (map: MlMap): ChildrenOf =>
  async (cluster) => {
    const source = map.getSource(SOURCES[cluster.source].id) as GeoJSONSource | undefined
    if (source === undefined) return []
    return pinItems((await source.getClusterChildren(cluster.clusterId)) as unknown as SourceFeature[], cluster.source)
  }

/** New data for both sources: the filters changed. */
export const setCharityData = (map: MlMap, data: CharityData): void => {
  for (const key of SOURCE_KEYS) (map.getSource(SOURCES[key].id) as GeoJSONSource | undefined)?.setData(data)
}

export const sourceOf = (map: MlMap, key: SourceKey): GeoJSONSource | undefined => map.getSource(SOURCES[key].id) as GeoJSONSource | undefined

const loaded = (map: MlMap, key: SourceKey): boolean => map.getSource(SOURCES[key].id) !== undefined && map.isSourceLoaded(SOURCES[key].id)

const itemsIn = (map: MlMap, key: SourceKey): readonly PinItem[] =>
  pinItems(map.querySourceFeatures(SOURCES[key].id) as unknown as SourceFeature[], key)

/**
 * The markers to draw now: from whichever clustering suits the view, and only
 * those in it or just around it, plus the `faded` organisations (no needs)
 * once the map is close enough, the selected one always among them. `null`
 * while the sources are still loading.
 */
export const markersInView = (
  map: MlMap,
  splitter?: ClusterSplitter,
  faded: readonly FadedPoint[] = [],
  selectedId: string | null = null,
): readonly PinItem[] | null => {
  if (!loaded(map, 'coarse') || !loaded(map, 'fine')) return null
  const bounds = map.getBounds()
  const view = { west: bounds.getWest(), south: bounds.getSouth(), east: bounds.getEast(), north: bounds.getNorth() }
  const near = padBox(view, VIEW_MARGIN)
  const coarse = itemsIn(map, 'coarse')
  const fine = itemsIn(map, 'fine')
  const chosen = chooseSource(map.getZoom(), inBox(coarse, view).length, inBox(fine, view).length)
  const radius = chosen === 'fine' ? SOURCES.fine.radius : coarseRadiusOf(map)
  const items = chosen === 'fine' ? fine : coarse
  const active = inBox(splitter === undefined ? items : splitter.split(inBox(items, near), splitLevels(radius)), near)
  const toPx: ToPixels = ([lng, lat]) => {
    const p = map.project([lng, lat])
    return [p.x, p.y]
  }
  return [...active, ...thinFaded(fadedInView(faded, map.getZoom(), view), active, toPx, { ...FADED, keep: selectedId })]
}
