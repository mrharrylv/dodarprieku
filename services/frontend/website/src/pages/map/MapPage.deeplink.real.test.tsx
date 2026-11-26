import { act, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { resetSnapshotCache } from '@/hooks/useSnapshot'
import type { MapEngine, MaplibreModule } from '@/components/map/maplibre-engine'
import { snapshotFixture } from '@/lib/snapshot.fixtures'
import { fakeLibrary } from '@/test/fake-maplibre'
import { renderWithProviders } from '@/test/render'
import { MapPage } from './MapPage'

/**
 * The shared-link path end to end: the page, the real MapView and its popup
 * card, with only maplibre itself stubbed. The map code and the snapshot can
 * arrive in either order, and the card must open both ways.
 */
const holder = vi.hoisted(() => ({ engine: null as MapEngine | null }))
vi.mock('@/components/map/maplibre-engine', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/components/map/maplibre-engine')>()
  return { ...real, MAPLIBRE_ENGINE: { supported: () => true, load: () => holder.engine!.load() } }
})

const deferred = <T,>() => {
  let resolve!: (v: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

const snapshotResponse = () =>
  new Response(JSON.stringify(snapshotFixture), { status: 200, headers: { 'Content-Type': 'application/json' } })

/** fetch with the snapshot held back until `release`; everything else 404s quietly. */
const heldSnapshot = () => {
  const gate = deferred<void>()
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.pathname : input.url
      if (url === '/data/charities.json') {
        await gate.promise
        return snapshotResponse()
      }
      return new Response('{}', { status: 404 })
    }),
  )
  return () => gate.resolve()
}

/** The fake library, its load held back until `release`. */
const heldEngine = () => {
  const fake = fakeLibrary()
  const gate = deferred<void>()
  holder.engine = { supported: () => true, load: async () => (await gate.promise, fake.engine.load()) as Promise<MaplibreModule> }
  return { state: fake.state, release: () => gate.resolve() }
}

const loadMap = async (state: ReturnType<typeof fakeLibrary>['state']) => {
  await waitFor(() => expect(state.map).not.toBeNull())
  act(() => state.map?.fire('load'))
}

describe('MapPage, a shared /organizacija/<slug> link, with the real map', () => {
  beforeEach(() => {
    resetSnapshotCache()
  })

  it('opens the card when the map is ready before the snapshot', async () => {
    const releaseSnapshot = heldSnapshot()
    const { state, release } = heldEngine()
    renderWithProviders(<MapPage />, { route: '/organizacija/ulubele' })
    release()
    await loadMap(state)
    releaseSnapshot()
    expect(await screen.findByRole('button', { name: /Skatīt vajadzības/ })).toBeInTheDocument()
    expect(state.flyTo).toHaveBeenCalled()
  })

  it('opens the card when the snapshot is in before the map code', async () => {
    const releaseSnapshot = heldSnapshot()
    const { state, release } = heldEngine()
    renderWithProviders(<MapPage />, { route: '/organizacija/ulubele' })
    releaseSnapshot()
    await screen.findByRole('group', { name: 'Kategorijas' })
    release()
    await loadMap(state)
    expect(await screen.findByRole('button', { name: /Skatīt vajadzības/ })).toBeInTheDocument()
  })

  it('opens it expanded with ?vajadzibas=1, either order', async () => {
    for (const snapshotFirst of [true, false]) {
      resetSnapshotCache()
      const releaseSnapshot = heldSnapshot()
      const { state, release } = heldEngine()
      const { unmount } = renderWithProviders(<MapPage />, { route: '/organizacija/ulubele?vajadzibas=1' })
      if (snapshotFirst) {
        releaseSnapshot()
        await screen.findByRole('group', { name: 'Kategorijas' })
      }
      release()
      await loadMap(state)
      if (!snapshotFirst) releaseSnapshot()
      expect(await screen.findByRole('button', { name: /Kopēt saiti/ })).toBeInTheDocument()
      unmount()
    }
  })
})
