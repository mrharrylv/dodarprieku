import { describe, expect, it } from 'vitest'

import { childrenHome, shelter } from '@/lib/snapshot.fixtures'
import { drawnAt } from '@/lib/snapshot'
import { spreadColocated } from './colocated'
import { COLOCATED_GAP_M } from './map-config'

const at = (id: string, lat: number, lng: number) => ({ ...shelter, id, profile: { ...shelter.profile, location: { lat, lng } } })
const metres = ([lng1, lat1]: readonly [number, number], [lng2, lat2]: readonly [number, number]) => {
  const dy = (lat2 - lat1) * 111_320
  const dx = (lng2 - lng1) * 111_320 * Math.cos((lat1 * Math.PI) / 180)
  return Math.hypot(dx, dy)
}

describe('spreadColocated', () => {
  it('leaves charities at their own address alone', () => {
    expect(spreadColocated([shelter, childrenHome]).size).toBe(0)
  })

  it('regression: the two "Liepājas Neredzīgo biedrība" at one point become two pins, a ring apart', () => {
    const a = at('a', 56.481577, 21.01403)
    const b = at('b', 56.481577, 21.01403)
    const spread = spreadColocated([b, a], 12)
    const pa = spread.get('a')!
    const pb = spread.get('b')!
    expect(metres(pa, [21.01403, 56.481577])).toBeCloseTo(12, 0)
    expect(metres(pb, [21.01403, 56.481577])).toBeCloseTo(12, 0)
    expect(metres(pa, pb)).toBeCloseTo(24, 0)
    // In a stable order, whatever order they arrive in.
    expect(spreadColocated([a, b], 12)).toEqual(spread)
  })

  it('grows the ring for a crowd, so neighbours stay apart', () => {
    const crowd = Array.from({ length: 10 }, (_, i) => at(`c${i}`, 56.95, 24.1))
    const spread = spreadColocated(crowd, 12)
    const points = crowd.map((c) => spread.get(c.id)!)
    const gaps = points.map((p, i) => metres(p, points[(i + 1) % points.length]!))
    expect(Math.min(...gaps)).toBeGreaterThan(10)
  })

  it('keeps six or more a pin apart at zoom 17, not only ten', () => {
    for (const n of [6, 7, 12]) {
      const crowd = Array.from({ length: n }, (_, i) => at(`c${i}`, 56.95, 24.1))
      const spread = spreadColocated(crowd, 12)
      const points = crowd.map((c) => spread.get(c.id)!)
      const gaps = points.map((p, i) => metres(p, points[(i + 1) % points.length]!))
      expect(Math.min(...gaps)).toBeGreaterThanOrEqual(COLOCATED_GAP_M - 0.5)
    }
  })

  it('treats two charities a hand apart as one place, even across a rounding boundary', () => {
    // 56.950004999 and 56.950005001 round to different five-decimal keys.
    const spread = spreadColocated([at('a', 56.950004999, 24.1), at('b', 56.950005001, 24.1)], 12)
    expect(spread.size).toBe(2)
    // Two charities a street apart are not.
    expect(spreadColocated([at('a', 56.95, 24.1), at('b', 56.9502, 24.1)]).size).toBe(0)
  })

  it('is what the map draws, falling back to the real place', () => {
    const spread = spreadColocated([at('a', 57, 24), at('b', 57, 24)])
    expect(drawnAt(at('a', 57, 24), spread)).toEqual(spread.get('a'))
    expect(drawnAt(shelter, spread)).toEqual([shelter.profile.location.lng, shelter.profile.location.lat])
    expect(drawnAt(shelter)).toEqual([shelter.profile.location.lng, shelter.profile.location.lat])
  })
})
