import { describe, expect, it, vi } from 'vitest'

import { createClusterSplitter, splitLevels, type ClusterItem } from './cluster-split'
import { SPLIT_CLUSTERS } from './map-config'
import type { PinItem } from './marker-sync'

const cluster = (id: number, count: number, lngLat: readonly [number, number] = [24.1, 56.95]): ClusterItem => ({
  key: `c:coarse:${id}`,
  kind: 'cluster',
  source: 'coarse',
  clusterId: id,
  count,
  category: null,
  lngLat,
})
const point = (id: string): PinItem => ({ key: `p:${id}`, kind: 'point', id, lngLat: [24, 57] })

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('cluster split', () => {
  it('splits only as deep as the children stay a heart apart on screen', () => {
    expect(splitLevels(135)).toBe(1)
    expect(splitLevels(SPLIT_CLUSTERS.minGapPx * 4)).toBe(2)
    expect(splitLevels(48)).toBe(0)
    expect(splitLevels(0)).toBe(0)
  })

  it('draws a cluster over the threshold as its children once they arrive, and asks for them once', async () => {
    const riga = cluster(1, 353)
    const children = [cluster(11, 300, [24.1, 56.95]), cluster(12, 53, [23.8, 56.97])]
    const childrenOf = vi.fn(() => Promise.resolve(children))
    const onReady = vi.fn()
    const splitter = createClusterSplitter(childrenOf, onReady)
    const items = [riga, cluster(2, 20), point('a')]

    expect(splitter.split(items, 1)).toEqual(items)
    expect(splitter.split(items, 1)).toEqual(items)
    expect(childrenOf).toHaveBeenCalledTimes(1)
    await flush()
    expect(onReady).toHaveBeenCalledTimes(1)
    expect(splitter.split(items, 1).map((i) => i.key)).toEqual(['c:coarse:11', 'c:coarse:12', 'c:coarse:2', 'p:a'])
  })

  it('leaves everything whole when no split fits on screen, or the cluster is small', () => {
    const childrenOf = vi.fn(() => Promise.resolve([]))
    const splitter = createClusterSplitter(childrenOf, vi.fn())
    const items = [cluster(1, 353), cluster(2, SPLIT_CLUSTERS.over)]
    expect(splitter.split(items, 0)).toEqual(items)
    expect(splitter.split([cluster(2, SPLIT_CLUSTERS.over)], 1)).toEqual([cluster(2, SPLIT_CLUSTERS.over)])
    expect(childrenOf).not.toHaveBeenCalled()
  })

  it('never splits deeper than allowed, even when a child is over the threshold too', async () => {
    const childrenOf = vi.fn((c: ClusterItem) => Promise.resolve(c.clusterId === 1 ? [cluster(11, 300), cluster(12, 53)] : [cluster(111, 200), cluster(112, 100)]))
    const splitter = createClusterSplitter(childrenOf, vi.fn())
    splitter.split([cluster(1, 353)], 1)
    await flush()
    expect(splitter.split([cluster(1, 353)], 1).map((i) => i.key)).toEqual(['c:coarse:11', 'c:coarse:12'])
    expect(childrenOf).toHaveBeenCalledTimes(1)
  })

  it('forgets its splits when the data changes, and drops answers for the old data', async () => {
    let resolve: (items: readonly PinItem[]) => void = () => undefined
    const childrenOf = vi.fn(() => new Promise<readonly PinItem[]>((r) => (resolve = r)))
    const onReady = vi.fn()
    const splitter = createClusterSplitter(childrenOf, onReady)
    splitter.split([cluster(1, 353)], 1)
    splitter.reset()
    resolve([cluster(11, 300), cluster(12, 53)])
    await flush()
    expect(onReady).not.toHaveBeenCalled()
    expect(splitter.split([cluster(1, 353)], 1)).toEqual([cluster(1, 353)])
    expect(childrenOf).toHaveBeenCalledTimes(2)
  })

  it('keys a split by count and place too, so a reused cluster id never shows stale children', async () => {
    const childrenOf = vi.fn(() => Promise.resolve([cluster(11, 300), cluster(12, 53)]))
    const splitter = createClusterSplitter(childrenOf, vi.fn())
    splitter.split([cluster(1, 353)], 1)
    await flush()
    expect(splitter.split([cluster(1, 200, [26, 56])], 1)).toEqual([cluster(1, 200, [26, 56])])
  })

  it('keeps the parent, with a warning, when the children cannot be had or do not split', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const failing = createClusterSplitter(() => Promise.reject(new Error('gone')), vi.fn())
    failing.split([cluster(1, 353)], 1)
    await flush()
    expect(failing.split([cluster(1, 353)], 1)).toEqual([cluster(1, 353)])
    expect(warn).toHaveBeenCalled()

    const single = createClusterSplitter(() => Promise.resolve([cluster(11, 353)]), vi.fn())
    single.split([cluster(1, 353)], 1)
    await flush()
    expect(single.split([cluster(1, 353)], 1)).toEqual([cluster(1, 353)])
  })
})
