import { describe, expect, it } from 'vitest'

import { COARSE_RADIUS, FADED, FADED_FROM_ZOOM, FINE_FROM_ZOOM, HEART_PX, MIN_VISIBLE_MARKERS } from './map-config'
import {
  chooseSource,
  clusterProperties,
  clusterSize,
  coarseRadius,
  fadedInView,
  inBox,
  metresPerPixel,
  padBox,
  pinItems,
  pinSignature,
  sharedCategory,
  thinFaded,
} from './marker-sync'

const pt = (coordinates: unknown, properties: Record<string, unknown> | null) => ({ geometry: { type: 'Point', coordinates }, properties })

describe('marker sync', () => {
  it('turns clusters and points into keyed items, dropping duplicates and junk', () => {
    const items = pinItems([
      pt([24, 57], { cluster: true, cluster_id: 7, point_count: 12, 'n:skola': 3, 'n:bernu-nams': 9 }),
      pt([23, 56], { cluster: true, cluster_id: 8, point_count: 5, 'n:skola': 5 }),
      pt([24, 57], { cluster: true, cluster_id: 7, point_count: 12 }),
      pt([25, 56], { id: 'a', category: 'skola' }),
      pt([25, 56], {}),
      pt(['x', 1], { id: 'b' }),
      { geometry: { type: 'LineString', coordinates: [] }, properties: { id: 'c' } },
      pt([26, 57], null),
    ])
    expect(items).toEqual([
      { key: 'c:coarse:7', kind: 'cluster', source: 'coarse', clusterId: 7, count: 12, category: null, lngLat: [24, 57] },
      { key: 'c:coarse:8', kind: 'cluster', source: 'coarse', clusterId: 8, count: 5, category: 'skola', lngLat: [23, 56] },
      { key: 'p:a', kind: 'point', id: 'a', lngLat: [25, 56] },
    ])
  })

  it('keys a cluster by its source, so the two clusterings never share a marker', () => {
    const feature = pt([24, 57], { cluster: true, cluster_id: 1, point_count: 4 })
    expect(pinItems([feature], 'fine')[0]?.key).toBe('c:fine:1')
    expect(pinItems([feature], 'coarse')[0]?.key).toBe('c:coarse:1')
  })

  it('signs a set by what it shows, in any order', () => {
    const a = pinItems([pt([1, 1], { id: 'a' }), pt([2, 2], { id: 'b' })])
    const b = pinItems([pt([2, 2], { id: 'b' }), pt([1, 1], { id: 'a' })])
    expect(pinSignature(a)).toBe(pinSignature(b))
    expect(pinSignature([])).toBe('')
  })

  it('re-signs a cluster whose id comes back with other members after new data', () => {
    // supercluster numbers clusters afresh on setData: the same id, a different group.
    const before = pinItems([pt([21.17, 56.535], { cluster: true, cluster_id: 33, point_count: 2, 'n:zupas-virtuve': 2 })], 'fine')
    const after = pinItems([pt([21.01, 56.48], { cluster: true, cluster_id: 33, point_count: 3, 'n:cits': 3 })], 'fine')
    expect(before[0]?.key).toBe(after[0]?.key)
    expect(pinSignature(before)).not.toBe(pinSignature(after))
    const moved = pinItems([pt([21.18, 56.535], { cluster: true, cluster_id: 33, point_count: 2, 'n:zupas-virtuve': 2 })], 'fine')
    expect(pinSignature(moved)).not.toBe(pinSignature(before))
  })

  it('draws the faded organisations only from close up, only in the box, never as clusters', () => {
    const points = [
      { id: 'near', lngLat: [24.1, 56.95] as const },
      { id: 'far', lngLat: [27, 57.5] as const },
    ]
    const box = { west: 24, south: 56.9, east: 24.2, north: 57 }
    expect(fadedInView(points, FADED_FROM_ZOOM - 0.01, box)).toEqual([])
    expect(fadedInView(points, FADED_FROM_ZOOM, box)).toEqual([{ key: 'p:near', kind: 'point', id: 'near', lngLat: [24.1, 56.95], faded: true }])
    expect(fadedInView([], 15, box)).toEqual([])
  })

  it('thins the faded pins: none on top of an active marker or of each other, never more than the cap', () => {
    const px = (lngLat: readonly [number, number]): readonly [number, number] => [lngLat[0], lngLat[1]]
    const faded = (id: string, x: number, y: number) => ({ key: `p:${id}`, kind: 'point', id, lngLat: [x, y], faded: true }) as const
    const active = [{ key: 'p:a', kind: 'point', id: 'a', lngLat: [0, 0] }] as const
    const gap = 40
    const kept = thinFaded([faded('under', 10, 0), faded('b', 100, 0), faded('c', 120, 0), faded('d', 200, 0)], active, px, { minGapPx: gap, max: 10 })
    expect(kept.map((i) => i.key)).toEqual(['p:b', 'p:d'])
    const many = Array.from({ length: 500 }, (_, i) => faded(`f${String(i).padStart(3, '0')}`, (i % 25) * 100, Math.floor(i / 25) * 100))
    const capped = thinFaded(many, [], px, { minGapPx: gap, max: 30 })
    expect(capped).toHaveLength(30)
    // The same view keeps the same pins, whatever order they came in.
    expect(thinFaded([...many].reverse(), [], px, { minGapPx: gap, max: 30 })).toEqual(capped)
    expect(FADED.max).toBeLessThanOrEqual(60)
  })

  it('signs a faded pin apart from an active one at the same place', () => {
    const active = [{ key: 'p:a', kind: 'point', id: 'a', lngLat: [24, 57] }] as const
    const faded = [{ ...active[0], faded: true }] as const
    expect(pinSignature(active)).not.toBe(pinSignature(faded))
  })

  it('names a cluster by its category only when every member shares it', () => {
    expect(sharedCategory({ 'n:skola': 4 }, 4)).toBe('skola')
    expect(sharedCategory({ 'n:skola': 1, 'n:pansionats': 2 }, 3)).toBeNull()
    expect(sharedCategory({ 'n:skola': 0, 'n:pansionats': 2 }, 2)).toBe('pansionats')
    expect(sharedCategory({ 'n:skola': 2 }, 3)).toBeNull()
    expect(sharedCategory({}, 2)).toBeNull()
  })

  it('regression: a soup kitchen and an "other" 40 m apart in Grobiņa are a mixed "2", never a soup kitchen "2"', () => {
    // The two real charities Harry saw near Liepāja: the old majority rule broke
    // the 1-1 tie by catalogue order and drew the pair as a soup kitchen.
    const props = clusterProperties()
    const members = [
      { category: 'cits', at: [21.169583, 56.535081] },
      { category: 'zupas-virtuve', at: [21.170255, 56.535118] },
    ]
    const counted = Object.fromEntries(
      Object.keys(props).map((name) => [name, members.filter((m) => `n:${m.category}` === name).length]),
    )
    const [item] = pinItems([pt([21.1699, 56.5351], { cluster: true, cluster_id: 5, point_count: members.length, ...counted })], 'fine')
    expect(item).toMatchObject({ kind: 'cluster', count: 2, category: null })
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

  it('works out metres per pixel at the whole zoom MapLibre tiles at', () => {
    expect(metresPerPixel(0, 0)).toBeCloseTo(78_271.5, 0)
    expect(metresPerPixel(7.9, 56.9)).toBeCloseTo(metresPerPixel(7, 56.9))
    expect(metresPerPixel(8, 56.9)).toBeCloseTo(metresPerPixel(7, 56.9) / 2)
  })

  it('groups by distance at the country view, never so tight that markers overlap', () => {
    // A 1440px desktop opens on zoom 7.03: COARSE_RADIUS.km there.
    const desktop = coarseRadius(7.03, 56.9)
    expect(desktop * metresPerPixel(7.03, 56.9)).toBeCloseTo(COARSE_RADIUS.km * 1000, -3)
    expect(desktop).toBe(135)
    // A phone opens on zoom 5.4: the same distance is fewer pixels than a marker, so the floor holds.
    expect(coarseRadius(5.4, 56.9)).toBe(COARSE_RADIUS.min)
    expect(coarseRadius(2, 56.9)).toBe(COARSE_RADIUS.min)
    expect(coarseRadius(12, 56.9)).toBe(COARSE_RADIUS.max)
  })

  it('draws a heart clearly larger than a 44px pin, growing gently with the count', () => {
    expect(clusterSize(2)).toBeGreaterThan(44)
    expect(clusterSize(1)).toBe(HEART_PX.min)
    expect(clusterSize(4)).toBeLessThan(clusterSize(40))
    expect(clusterSize(40)).toBeLessThan(clusterSize(400))
    expect(clusterSize(100000)).toBe(HEART_PX.max)
  })
})
