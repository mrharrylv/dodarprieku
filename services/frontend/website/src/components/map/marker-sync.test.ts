import { describe, expect, it } from 'vitest'

import { FINE_FROM_ZOOM, MIN_VISIBLE_MARKERS } from './map-config'
import { chooseSource, clusterProperties, clusterSize, coarseRadius, inBox, majorityCategory, padBox, pinItems, pinSignature } from './marker-sync'

const pt = (coordinates: unknown, properties: Record<string, unknown> | null) => ({ geometry: { type: 'Point', coordinates }, properties })

describe('marker sync', () => {
  it('turns clusters and points into keyed items, dropping duplicates and junk', () => {
    const items = pinItems([
      pt([24, 57], { cluster: true, cluster_id: 7, point_count: 12, 'n:skola': 3, 'n:bernu-nams': 9 }),
      pt([24, 57], { cluster: true, cluster_id: 7, point_count: 12 }),
      pt([25, 56], { id: 'a', category: 'skola' }),
      pt([25, 56], {}),
      pt(['x', 1], { id: 'b' }),
      { geometry: { type: 'LineString', coordinates: [] }, properties: { id: 'c' } },
      pt([26, 57], null),
    ])
    expect(items).toEqual([
      { key: 'c:coarse:7', kind: 'cluster', source: 'coarse', clusterId: 7, count: 12, majority: 'bernu-nams', lngLat: [24, 57] },
      { key: 'p:a', kind: 'point', id: 'a', lngLat: [25, 56] },
    ])
  })

  it('keys a cluster by its source, so the two clusterings never share a marker', () => {
    const feature = pt([24, 57], { cluster: true, cluster_id: 1, point_count: 4 })
    expect(pinItems([feature], 'fine')[0]?.key).toBe('c:fine:1')
    expect(pinItems([feature], 'coarse')[0]?.key).toBe('c:coarse:1')
  })

  it('signs a set by its keys, in any order', () => {
    const a = pinItems([pt([1, 1], { id: 'a' }), pt([2, 2], { id: 'b' })])
    const b = pinItems([pt([2, 2], { id: 'b' }), pt([1, 1], { id: 'a' })])
    expect(pinSignature(a)).toBe(pinSignature(b))
    expect(pinSignature([])).toBe('')
  })

  it('finds the majority category, first listed on a tie, none without counts', () => {
    expect(majorityCategory({ 'n:skola': 1, 'n:pansionats': 2 })).toBe('pansionats')
    expect(majorityCategory({ 'n:dzivnieku-patversme': 1, 'n:skola': 1 })).toBe('dzivnieku-patversme')
    expect(majorityCategory({})).toBeNull()
  })

  it('counts every category in a cluster', () => {
    const props = clusterProperties()
    expect(props['n:skola']).toEqual(['+', ['case', ['==', ['get', 'category'], 'skola'], 1, 0]])
    expect(Object.keys(props).length).toBeGreaterThan(10)
  })

  it('keeps only what is in the view, plus a margin', () => {
    const items = pinItems([pt([24, 57], { id: 'in' }), pt([30, 57], { id: 'out' }), pt([28.5, 57], { id: 'edge' })])
    const view = { west: 21, south: 55.5, east: 28, north: 58 }
    expect(inBox(items, view).map((i) => i.key)).toEqual(['p:in'])
    expect(inBox(items, padBox(view, 0.2)).map((i) => i.key)).toEqual(['p:in', 'p:edge'])
  })

  it('splits further when too few markers are on screen, and always from the close zoom', () => {
    expect(chooseSource(7, 10, 25)).toBe('coarse')
    expect(chooseSource(7, MIN_VISIBLE_MARKERS - 1, MIN_VISIBLE_MARKERS + 3)).toBe('fine')
    expect(chooseSource(7, 2, 2)).toBe('coarse')
    expect(chooseSource(FINE_FROM_ZOOM, 30, 30)).toBe('fine')
  })

  it('groups less widely on a narrow map', () => {
    expect(coarseRadius(1440)).toBe(160)
    expect(coarseRadius(390)).toBe(56)
    expect(coarseRadius(900)).toBe(100)
  })

  it('draws a heart that grows gently, never past 44px', () => {
    expect(clusterSize(4)).toBeLessThan(clusterSize(40))
    expect(clusterSize(40)).toBeLessThan(clusterSize(400))
    expect(clusterSize(100000)).toBe(44)
    expect(clusterSize(1)).toBe(28)
  })
})
