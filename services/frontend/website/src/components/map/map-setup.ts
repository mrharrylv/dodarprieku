import type { GeoJSONSource, Map as MlMap } from 'maplibre-gl'

import type { toFeatureCollection } from '@/lib/snapshot'
import { CLUSTER_MAX_ZOOM, SOURCES, VIEW_MARGIN, type SourceKey } from './map-config'
import { chooseSource, clusterProperties, coarseRadius, inBox, padBox, pinItems, type PinItem, type SourceFeature } from './marker-sync'

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

/** Both clustered copies of the charities, each under an invisible layer so MapLibre tiles it. */
export const addCharitySources = (map: MlMap, data: CharityData): void => {
  for (const key of SOURCE_KEYS) {
    const { id, layer, radius } = SOURCES[key]
    map.addSource(id, {
      type: 'geojson',
      data,
      cluster: true,
      clusterRadius: key === 'coarse' ? coarseRadius(map.getContainer().clientWidth) : radius,
      clusterMaxZoom: CLUSTER_MAX_ZOOM,
      clusterProperties: clusterProperties(),
    })
    map.addLayer({ id: layer, type: 'circle', source: id, paint: { 'circle-radius': 1, 'circle-opacity': 0 } })
  }
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
 * those in it or just around it. `null` while the sources are still loading.
 */
export const markersInView = (map: MlMap): readonly PinItem[] | null => {
  if (!loaded(map, 'coarse') || !loaded(map, 'fine')) return null
  const bounds = map.getBounds()
  const view = { west: bounds.getWest(), south: bounds.getSouth(), east: bounds.getEast(), north: bounds.getNorth() }
  const near = padBox(view, VIEW_MARGIN)
  const coarse = itemsIn(map, 'coarse')
  const fine = itemsIn(map, 'fine')
  const chosen = chooseSource(map.getZoom(), inBox(coarse, view).length, inBox(fine, view).length)
  return inBox(chosen === 'fine' ? fine : coarse, near)
}
