/**
 * The second tier of the coarse grouping. Pure distance leaves one heart of
 * several hundred over Riga at the country view (Harry, 2026-11-26: "Riga is
 * not one giant blob"), so a cluster over SPLIT_CLUSTERS.over is drawn as its
 * children one zoom further in, while those still sit at least a heart apart
 * on screen. Children come from MapLibre asynchronously: the parent is shown
 * until they arrive, then the markers are worked out again.
 */
import { SPLIT_CLUSTERS } from './map-config'
import type { PinItem } from './marker-sync'

export type ClusterItem = Extract<PinItem, { kind: 'cluster' }>

/** A cluster's children, one zoom further in, as pin items. */
export type ChildrenOf = (cluster: ClusterItem) => Promise<readonly PinItem[]>

export interface ClusterSplitter {
  /** The items with every cluster over the threshold replaced by its children, at most `levels` deep. */
  readonly split: (items: readonly PinItem[], levels: number) => readonly PinItem[]
  /** Forget every split: the data or the clustering changed, so the cluster ids mean other groups. */
  readonly reset: () => void
}

/**
 * How many times a cluster may be split for a source of this radius:
 * supercluster halves the radius on screen at each zoom in, so the children
 * of one split sit about radius / 2 apart, of two about radius / 4, and so on.
 * Only as deep as that spacing stays at least SPLIT_CLUSTERS.minGapPx.
 */
export const splitLevels = (radiusPx: number): number =>
  radiusPx <= 0 ? 0 : Math.max(0, Math.floor(Math.log2(radiusPx / SPLIT_CLUSTERS.minGapPx)))

/** Same id, same count, same place: the same group. A reused id after new data never picks up stale children. */
const groupKey = (c: ClusterItem): string => `${c.key}#${c.count}@${c.lngLat.join(',')}`

type Entry = readonly PinItem[] | 'pending' | 'failed'

export const createClusterSplitter = (childrenOf: ChildrenOf, onReady: () => void): ClusterSplitter => {
  let cache = new Map<string, Entry>()
  let generation = 0

  const fetch = (cluster: ClusterItem) => {
    const key = groupKey(cluster)
    const asked = generation
    cache = new Map(cache).set(key, 'pending')
    childrenOf(cluster).then(
      (children) => {
        if (asked !== generation) return
        cache = new Map(cache).set(key, children.length > 1 ? children : 'failed')
        onReady()
      },
      (error: unknown) => {
        if (asked !== generation) return
        console.warn('[map] cluster children failed', error)
        cache = new Map(cache).set(key, 'failed')
      },
    )
  }

  const split = (items: readonly PinItem[], levels: number): readonly PinItem[] =>
    levels <= 0
      ? items
      : items.flatMap((item) => {
          if (item.kind !== 'cluster' || item.count <= SPLIT_CLUSTERS.over) return [item]
          const entry = cache.get(groupKey(item))
          if (entry === undefined) fetch(item)
          return Array.isArray(entry) ? split(entry, levels - 1) : [item]
        })

  return {
    split,
    reset: () => {
      generation += 1
      cache = new Map()
    },
  }
}
