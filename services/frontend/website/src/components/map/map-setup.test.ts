import type { Map as MlMap } from 'maplibre-gl'
import { describe, expect, it, vi } from 'vitest'

import { addCharitySources, childrenOf, coarseRadiusOf, refitCoarseSource } from './map-setup'
import { COARSE_RADIUS, SOURCES } from './map-config'
import { coarseRadius } from './marker-sync'

const DATA = { type: 'FeatureCollection', features: [] } as never

/** Just the calls the sources make. */
const fakeMap = () => {
  const sources = new Map<string, { clusterRadius: number }>()
  const children = vi.fn((id: number) =>
    Promise.resolve([
      { geometry: { type: 'Point', coordinates: [24.1, 56.9] }, properties: { cluster: true, cluster_id: id * 10, point_count: 300 } },
      { geometry: { type: 'Point', coordinates: [23.8, 56.9] }, properties: { id: 'jurmala' } },
    ]),
  )
  const map = {
    getCenter: () => ({ lng: 24.6, lat: 56.9 }),
    addSource: (id: string, spec: { clusterRadius: number }) => sources.set(id, spec),
    addLayer: vi.fn(),
    removeLayer: vi.fn(),
    removeSource: vi.fn((id: string) => sources.delete(id)),
    getSource: (id: string) => (sources.has(id) ? { getClusterChildren: children } : undefined),
  }
  return { map: map as unknown as MlMap, raw: map, sources, children }
}

describe('map sources', () => {
  it('builds the coarse source for the zoom that fits the country', () => {
    const { map, sources } = fakeMap()
    addCharitySources(map, DATA, 7.03)
    expect(sources.get(SOURCES.coarse.id)?.clusterRadius).toBe(coarseRadius(7.03, 56.9))
    expect(sources.get(SOURCES.fine.id)?.clusterRadius).toBe(SOURCES.fine.radius)
    expect(coarseRadiusOf(map)).toBe(coarseRadius(7.03, 56.9))
  })

  it('rebuilds the coarse source when a resize changes the country view materially, and only then', () => {
    const { map, raw, sources } = fakeMap()
    // A phone (radius at the floor) turned into a desktop.
    addCharitySources(map, DATA, 5.4)
    expect(coarseRadiusOf(map)).toBe(COARSE_RADIUS.min)
    expect(refitCoarseSource(map, DATA, 5.45)).toBe(false)
    expect(raw.removeSource).not.toHaveBeenCalled()

    expect(refitCoarseSource(map, DATA, 7.03)).toBe(true)
    expect(raw.removeLayer).toHaveBeenCalledWith(SOURCES.coarse.layer)
    expect(raw.removeSource).toHaveBeenCalledWith(SOURCES.coarse.id)
    expect(sources.get(SOURCES.coarse.id)?.clusterRadius).toBe(coarseRadius(7.03, 56.9))
    expect(coarseRadiusOf(map)).toBe(coarseRadius(7.03, 56.9))

    // And back: a desktop window shrunk to a phone's width.
    expect(refitCoarseSource(map, DATA, 5.4)).toBe(true)
    expect(sources.get(SOURCES.coarse.id)?.clusterRadius).toBe(COARSE_RADIUS.min)
  })

  it('does nothing on a resize before the sources exist', () => {
    const { map, raw } = fakeMap()
    expect(refitCoarseSource(map, DATA, 7)).toBe(false)
    expect(raw.removeSource).not.toHaveBeenCalled()
  })

  it('reads a cluster’s children from its own source as pin items', async () => {
    const { map, children } = fakeMap()
    addCharitySources(map, DATA, 7)
    const cluster = { key: 'c:coarse:4', kind: 'cluster', source: 'coarse', clusterId: 4, count: 301, category: null, lngLat: [24, 56.9] } as const
    const items = await childrenOf(map)(cluster)
    expect(children).toHaveBeenCalledWith(4)
    expect(items.map((i) => i.key)).toEqual(['c:coarse:40', 'p:jurmala'])
    const { map: empty } = fakeMap()
    expect(await childrenOf(empty)(cluster)).toEqual([])
  })
})
