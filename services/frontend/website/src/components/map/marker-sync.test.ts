import { describe, expect, it } from 'vitest'

import { pinItems, pinSignature } from './marker-sync'

const pt = (coordinates: unknown, properties: Record<string, unknown> | null) => ({ geometry: { type: 'Point', coordinates }, properties })

describe('marker sync', () => {
  it('turns clusters and points into keyed items, dropping duplicates and junk', () => {
    const items = pinItems([
      pt([24, 57], { cluster: true, cluster_id: 7, point_count: 12 }),
      pt([24, 57], { cluster: true, cluster_id: 7, point_count: 12 }),
      pt([25, 56], { id: 'a', category: 'skola' }),
      pt([25, 56], {}),
      pt(['x', 1], { id: 'b' }),
      { geometry: { type: 'LineString', coordinates: [] }, properties: { id: 'c' } },
      pt([26, 57], null),
    ])
    expect(items).toEqual([
      { key: 'c:7', kind: 'cluster', clusterId: 7, count: 12, lngLat: [24, 57] },
      { key: 'p:a', kind: 'point', id: 'a', lngLat: [25, 56] },
    ])
  })

  it('signs a set by its keys, in any order', () => {
    const a = pinItems([pt([1, 1], { id: 'a' }), pt([2, 2], { id: 'b' })])
    const b = pinItems([pt([2, 2], { id: 'b' }), pt([1, 1], { id: 'a' })])
    expect(pinSignature(a)).toBe(pinSignature(b))
    expect(pinSignature([])).toBe('')
  })
})
