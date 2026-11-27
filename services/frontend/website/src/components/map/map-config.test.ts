import { describe, expect, it } from 'vitest'

import { LATVIA_BOUNDS } from '@shared/contracts'
import { MAP_BOUNDS } from './map-config'

/** Web Mercator y in world units (0 at the north edge, 1 at the south), as MapLibre projects it. */
const mercY = (lat: number): number => (1 - Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) / Math.PI) / 2

/**
 * Whether a map `width` x `height` fitted to Latvia's width (24px padding,
 * as MapView fits it) lies inside maxBounds. When it does not, MapLibre
 * zooms in until it does, and part of the country starts off-screen (MAP-05).
 */
const fitsInBounds = (width: number, height: number): boolean => {
  const world = (width - 48) / ((LATVIA_BOUNDS.maxLng - LATVIA_BOUNDS.minLng) / 360)
  const centre = (mercY(LATVIA_BOUNDS.minLat) + mercY(LATVIA_BOUNDS.maxLat)) / 2
  const half = height / 2 / world
  const [[, south], [, north]] = MAP_BOUNDS
  return mercY(north) <= centre - half && mercY(south) >= centre + half
}

describe('MAP_BOUNDS', () => {
  it.each([
    [390, 844],
    [360, 800],
    [375, 812],
    [320, 740],
    [430, 932],
    [360, 900],
  ])('lets a %ix%i phone show the whole country, unclamped', (width, height) => {
    expect(fitsInBounds(width, height)).toBe(true)
  })
})
