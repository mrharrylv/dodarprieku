import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { resetSnapshotCache } from '@/hooks/useSnapshot'
import { fakeFetch, snapshotFixture } from '@/lib/snapshot.fixtures'
import type { MapFocus } from '@/components/map/MapView'
import { renderWithProviders } from '@/test/render'
import { MapPage } from './MapPage'

/** What the page asked the map for: the map itself is tested on its own (MapView.test). */
const seen: { selectedId: string | null; focus: MapFocus | null }[] = []
vi.mock('@/components/map/MapView', () => ({
  MapView: ({ selectedId, focus }: { selectedId: string | null; focus: MapFocus | null }) => {
    seen.push({ selectedId, focus })
    return <output aria-label="karte">{`${selectedId ?? '-'}|${focus?.expand === true ? 'expanded' : 'small'}`}</output>
  },
}))

const mapState = () => screen.findByRole('status', { name: 'karte' })

describe('MapPage, a shared /organizacija/<slug> link', () => {
  beforeEach(() => {
    resetSnapshotCache()
    seen.length = 0
    vi.stubGlobal('fetch', fakeFetch({ '/data/charities.json': { body: snapshotFixture } }))
  })

  it('opens the map on that organisation with its card open, small', async () => {
    renderWithProviders(<MapPage />, { route: '/organizacija/ulubele' })
    await waitFor(async () => expect(await mapState()).toHaveTextContent('c-ulubele|small'))
    expect(seen.at(-1)?.focus).toMatchObject({ id: 'c-ulubele', expand: false })
  })

  it('opens it expanded with ?vajadzibas=1, as the copy-link button writes it', async () => {
    renderWithProviders(<MapPage />, { route: '/organizacija/ulubele?vajadzibas=1' })
    await waitFor(async () => expect(await mapState()).toHaveTextContent('c-ulubele|expanded'))
  })

  it('opens nothing for a slug the map does not have', async () => {
    renderWithProviders(<MapPage />, { route: '/organizacija/nav-tadas' })
    await screen.findByRole('group', { name: 'Kategorijas' })
    expect(await mapState()).toHaveTextContent('-|small')
  })
})
