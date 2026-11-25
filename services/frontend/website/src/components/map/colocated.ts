import type { PublicCharity } from '@shared/contracts'
import type { DrawnAt } from '@/lib/snapshot'
import { COLOCATED_GAP_M, COLOCATED_SPREAD_M, COLOCATED_WITHIN_M } from './map-config'

const METRES_PER_DEGREE_LAT = 111_320

const metresPerDegreeLng = (lat: number): number => METRES_PER_DEGREE_LAT * Math.cos((lat * Math.PI) / 180)

/** A grid of COLOCATED_WITHIN_M cells: two charities at the same place are in the same cell or a neighbouring one. */
const cellOf = (c: PublicCharity): readonly [number, number] => {
  const { lat, lng } = c.profile.location
  return [Math.floor((lat * METRES_PER_DEGREE_LAT) / COLOCATED_WITHIN_M), Math.floor((lng * metresPerDegreeLng(lat)) / COLOCATED_WITHIN_M)]
}

const near = (a: PublicCharity, b: PublicCharity): boolean => {
  const dy = (a.profile.location.lat - b.profile.location.lat) * METRES_PER_DEGREE_LAT
  const dx = (a.profile.location.lng - b.profile.location.lng) * metresPerDegreeLng(a.profile.location.lat)
  return Math.hypot(dx, dy) <= COLOCATED_WITHIN_M
}

/**
 * Charities within COLOCATED_WITHIN_M of a group's first member join it. A
 * grid with its neighbouring cells, not rounded coordinates: two charities a
 * hand apart can fall either side of a rounding boundary.
 */
const groupByPlace = (charities: readonly PublicCharity[]): readonly (readonly PublicCharity[])[] => {
  const cells = new Map<string, number[]>()
  const groups: PublicCharity[][] = []
  for (const c of charities) {
    const [row, col] = cellOf(c)
    const around = [-1, 0, 1].flatMap((dr) => [-1, 0, 1].flatMap((dc) => cells.get(`${row + dr},${col + dc}`) ?? []))
    const found = around.find((g) => near(groups[g]![0]!, c))
    const index = found ?? groups.length
    groups[index] = [...(groups[index] ?? []), c]
    if (found === undefined) cells.set(`${row},${col}`, [...(cells.get(`${row},${col}`) ?? []), index])
  }
  return groups
}

const ring = (members: readonly PublicCharity[], metres: number): ReadonlyArray<readonly [string, readonly [number, number]]> => {
  const [first] = members
  if (first === undefined) return []
  const { lat, lng } = first.profile.location
  // Neighbours COLOCATED_GAP_M apart round the ring, never closer in than `metres`.
  const radius = Math.max(metres, COLOCATED_GAP_M / (2 * Math.sin(Math.PI / members.length)))
  const perLng = metresPerDegreeLng(lat)
  return [...members]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((c, i) => {
      const angle = (2 * Math.PI * i) / members.length - Math.PI / 2
      return [c.id, [lng + (radius * Math.cos(angle)) / perLng, lat - (radius * Math.sin(angle)) / METRES_PER_DEGREE_LAT]] as const
    })
}

/**
 * Where to draw charities that share an address: evenly round a small ring
 * about the first one's place, in a stable order, so each becomes its own pin
 * when the map is close instead of one hiding the others. Only those that
 * share a place are in the result; everyone else is drawn where they are.
 */
export const spreadColocated = (charities: readonly PublicCharity[], metres: number = COLOCATED_SPREAD_M): DrawnAt =>
  new Map(groupByPlace([...charities].sort((a, b) => a.id.localeCompare(b.id))).filter((g) => g.length > 1).flatMap((g) => ring(g, metres)))
