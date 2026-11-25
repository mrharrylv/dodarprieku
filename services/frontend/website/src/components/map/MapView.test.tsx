import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { fakeFetch, shelter, childrenHome } from '@/lib/snapshot.fixtures'
import { renderWithProviders } from '@/test/render'
import type { MapEngine, MaplibreModule } from './maplibre-engine'
import { MapView } from './MapView'

/** A stand-in for maplibre-gl, enough to drive the component: no WebGL in jsdom. */
const fakeLibrary = () => {
  const state = {
    map: null as FakeMap | null,
    features: [] as unknown[],
    zoom: 7,
    /** The zoom that fits the country in the container: what a resize changes. */
    fitZoom: 7,
    children: [] as unknown[],
    flyTo: vi.fn(),
    easeTo: vi.fn(),
    setData: vi.fn(),
    popups: [] as FakePopup[],
    labels: null as Map<string, unknown> | null,
    moved: [] as unknown[],
  }

  class FakeMap {
    handlers = new Map<string, ((e?: unknown) => void)[]>()
    container: HTMLElement
    constructor(options: { container: HTMLElement }) {
      this.container = options.container
      state.map = this
    }
    on(event: string, cb: (e?: unknown) => void) {
      this.handlers.set(event, [...(this.handlers.get(event) ?? []), cb])
      return this
    }
    fire(event: string, e?: unknown) {
      for (const cb of this.handlers.get(event) ?? []) cb(e)
    }
    sources: string[] = []
    addControl() {}
    addSource(id: string) {
      this.sources.push(id)
    }
    addLayer() {}
    removeLayer() {}
    removeSource(id: string) {
      this.sources = this.sources.filter((s) => s !== id)
    }
    cameraForBounds() {
      return { zoom: state.fitZoom }
    }
    resize() {}
    fitBounds() {}
    labels = new Map<string, unknown>([['place', ['get', 'name:en']]])
    getStyle() {
      return { layers: [{ id: 'place', type: 'symbol' }, { id: 'water', type: 'fill' }, { id: 'icons', type: 'symbol' }] }
    }
    getLayoutProperty(id: string) {
      return this.labels.get(id)
    }
    setLayoutProperty(id: string, _name: string, value: unknown) {
      this.labels.set(id, value)
      state.labels = this.labels
    }
    isSourceLoaded() {
      return true
    }
    querySourceFeatures() {
      return state.features
    }
    getSource(id: string) {
      return this.sources.includes(id) ? { setData: state.setData, getClusterExpansionZoom: () => Promise.resolve(9), getClusterChildren: () => Promise.resolve(state.children) } : undefined
    }
    getZoom() {
      return state.zoom
    }
    getCenter() {
      return { lng: 24.6, lat: 56.9 }
    }
    getBounds() {
      return { getWest: () => 20, getSouth: () => 55, getEast: () => 29, getNorth: () => 58.5 }
    }
    getContainer() {
      return this.container
    }
    flyTo(o: unknown) {
      state.flyTo(o)
    }
    easeTo(o: unknown) {
      state.easeTo(o)
    }
    remove() {}
  }

  class FakeMarker {
    element: HTMLElement
    constructor({ element }: { element: HTMLElement }) {
      this.element = element
    }
    setLngLat(at: unknown) {
      state.moved.push(at)
      return this
    }
    addTo(map: FakeMap) {
      map.container.appendChild(this.element)
      return this
    }
    getElement() {
      return this.element
    }
    remove() {
      this.element.remove()
    }
  }

  class FakePopup {
    node: HTMLElement | null = null
    close: (() => void) | null = null
    map: FakeMap | null = null
    constructor() {
      state.popups.push(this)
    }
    setLngLat() {
      return this
    }
    setDOMContent(node: HTMLElement) {
      this.node = node
      return this
    }
    addTo(map: FakeMap) {
      this.map = map
      if (this.node) map.container.appendChild(this.node)
      return this
    }
    on(_e: string, cb: () => void) {
      this.close = cb
      return this
    }
    remove() {
      this.node?.remove()
      this.close?.()
    }
  }

  class FakeNav {}

  const lib = { Map: FakeMap, Marker: FakeMarker, Popup: FakePopup, NavigationControl: FakeNav } as unknown as MaplibreModule
  const engine: MapEngine = { supported: () => true, load: () => Promise.resolve(lib) }
  return { state, engine }
}

const point = (id: string, lng: number, lat: number) => ({ geometry: { type: 'Point', coordinates: [lng, lat] }, properties: { id } })

describe('MapView', () => {
  it('says so, without loading anything, when the browser cannot draw a map', async () => {
    const load = vi.fn()
    renderWithProviders(<MapView charities={[]} selectedId={null} onSelect={vi.fn()} focus={null} engine={{ supported: () => false, load }} />)
    expect(await screen.findByText('Karti nevar parādīt')).toBeInTheDocument()
    expect(load).not.toHaveBeenCalled()
  })

  it('falls back the same way when the library fails to load', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    renderWithProviders(
      <MapView charities={[]} selectedId={null} onSelect={vi.fn()} focus={null} engine={{ supported: () => true, load: () => Promise.reject(new Error('offline')) }} />,
    )
    expect(await screen.findByText('Karti nevar parādīt')).toBeInTheDocument()
  })

  it('draws pins and clusters as buttons, opens a popup and flies to a focus', async () => {
    vi.stubGlobal('fetch', fakeFetch({}))
    const { state, engine } = fakeLibrary()
    const onSelect = vi.fn()
    const charities = [shelter, childrenHome]
    const view = (selectedId: string | null, focus: { id: string; nonce: number } | null) => (
      <MapView charities={charities} selectedId={selectedId} onSelect={onSelect} focus={focus} engine={engine} />
    )
    const { rerender } = renderWithProviders(view(null, null))
    expect(screen.getByText('Ielādē karti…')).toBeInTheDocument()
    await waitFor(() => expect(state.map).not.toBeNull())

    state.features = [point('c-ulubele', 24.1, 56.95), { geometry: { type: 'Point', coordinates: [25, 57] }, properties: { cluster: true, cluster_id: 3, point_count: 4 } }]
    act(() => state.map?.fire('load'))
    // Place names switch to Latvian where OpenStreetMap has one.
    expect(state.labels?.get('place')).toEqual(['coalesce', ['get', 'name:lv'], ['get', 'name']])
    expect(state.labels?.has('icons')).toBe(false)
    expect(screen.queryByText('Ielādē karti…')).not.toBeInTheDocument()

    const pin = await screen.findByRole('button', { name: 'Dzīvnieku patversme Ulubele, Dzīvnieku patversme' })
    fireEvent.click(pin)
    expect(onSelect).toHaveBeenCalledWith('c-ulubele')

    // A big cluster is a heart; clicking it zooms past its expansion zoom, so it really opens.
    fireEvent.click(screen.getByRole('button', { name: '4 organizācijas šajā apgabalā. Pietuvināt' }))
    await waitFor(() => expect(state.easeTo).toHaveBeenCalledWith(expect.objectContaining({ zoom: 9.5 })))

    rerender(view('c-ulubele', { id: 'c-ulubele', nonce: 1 }))
    expect(state.flyTo).toHaveBeenCalledWith(expect.objectContaining({ center: [24.1, 56.95], zoom: 14 }))
    // The small card first; "Skatīt vajadzības" expands it in place, it does not navigate.
    const expand = await screen.findByRole('button', { name: /Skatīt vajadzības/ })
    expect(expand).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('link', { name: /Atvērt pilnu lapu/ })).toBeNull()
    expect(screen.getByRole('button', { name: 'Dzīvnieku patversme Ulubele, Dzīvnieku patversme' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(expand)
    expect(await screen.findByRole('link', { name: /Atvērt pilnu lapu/ })).toHaveAttribute('href', '/organizacija/ulubele')
    // Focus follows the card: into the expanded card, back to "Skatīt vajadzības" when it collapses.
    expect(screen.getByRole('button', { name: 'Sakļaut' })).toHaveFocus()
    expect(screen.getByRole('button', { name: /Es ziedošu/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Kā nogādāt' })).toBeInTheDocument()
    // Escape collapses it back to the small card first.
    fireEvent.keyDown(screen.getByRole('link', { name: /Atvērt pilnu lapu/ }), { key: 'Escape' })
    expect(screen.queryByRole('link', { name: /Atvērt pilnu lapu/ })).toBeNull()
    expect(screen.getByRole('button', { name: /Skatīt vajadzības/ })).toHaveFocus()

    fireEvent.click(screen.getByRole('button', { name: 'Aizvērt' }))
    expect(onSelect).toHaveBeenLastCalledWith(null)

    // Pins leave when the data no longer has them.
    state.features = []
    act(() => state.map?.fire('sourcedata', { sourceId: 'charities' }))
    await waitFor(() => expect(screen.queryByRole('button', { name: /Ulubele, / })).not.toBeInTheDocument())

    rerender(<MapView charities={[childrenHome]} selectedId={null} onSelect={onSelect} focus={null} engine={engine} />)
    expect(state.setData).toHaveBeenCalled()
  })
  it('draws a one-category cluster as its badge with the count, a mixed one as a heart, and leaves off-screen ones out', async () => {
    const { state, engine } = fakeLibrary()
    renderWithProviders(<MapView charities={[shelter, childrenHome]} selectedId={null} onSelect={vi.fn()} focus={null} engine={engine} />)
    await waitFor(() => expect(state.map).not.toBeNull())
    state.features = [
      { geometry: { type: 'Point', coordinates: [24, 57] }, properties: { cluster: true, cluster_id: 5, point_count: 19, 'n:bernu-nams': 19 } },
      { geometry: { type: 'Point', coordinates: [25, 57] }, properties: { cluster: true, cluster_id: 6, point_count: 3, 'n:bernu-nams': 2, 'n:skola': 1 } },
      point('c-far', 40, 40),
    ]
    act(() => state.map?.fire('load'))

    const same = await screen.findByRole('button', { name: '19 organizāciju šajā apgabalā, visas: Bērnu nams. Pietuvināt' })
    expect(same).toHaveTextContent('19')
    expect(same.querySelector('.dp-heart')).toBeNull()
    const mixed = screen.getByRole('button', { name: '3 organizācijas šajā apgabalā. Pietuvināt' })
    expect(mixed.querySelector('.dp-heart')).not.toBeNull()
    expect(state.map?.sources).toEqual(['charities', 'charities-fine'])
    // The point at 40,40 is far outside the view: no marker for it.
    expect(document.querySelectorAll('.dp-marker')).toHaveLength(2)
  })

  it('draws a cluster of several hundred as its children at the country view, so Riga is not one blob', async () => {
    const { state, engine } = fakeLibrary()
    renderWithProviders(<MapView charities={[shelter, childrenHome]} selectedId={null} onSelect={vi.fn()} focus={null} engine={engine} />)
    await waitFor(() => expect(state.map).not.toBeNull())
    state.features = [{ geometry: { type: 'Point', coordinates: [24.1, 56.95] }, properties: { cluster: true, cluster_id: 1, point_count: 353 } }]
    state.children = [
      { geometry: { type: 'Point', coordinates: [24.1, 56.95] }, properties: { cluster: true, cluster_id: 11, point_count: 300 } },
      { geometry: { type: 'Point', coordinates: [23.8, 56.97] }, properties: { cluster: true, cluster_id: 12, point_count: 53 } },
    ]
    act(() => state.map?.fire('load'))
    expect(await screen.findByRole('button', { name: '300 organizāciju šajā apgabalā. Pietuvināt' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '53 organizācijas šajā apgabalā. Pietuvināt' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^353 / })).toBeNull()
  })

  it('rebuilds the distance grouping when the map is resized from a phone to a desktop, and not for a small change', async () => {
    const { state, engine } = fakeLibrary()
    state.fitZoom = 5.4
    renderWithProviders(<MapView charities={[shelter, childrenHome]} selectedId={null} onSelect={vi.fn()} focus={null} engine={engine} />)
    await waitFor(() => expect(state.map).not.toBeNull())
    act(() => state.map?.fire('load'))
    const removeSource = vi.spyOn(state.map as NonNullable<typeof state.map>, 'removeSource')
    state.fitZoom = 5.45
    act(() => state.map?.fire('resize'))
    expect(removeSource).not.toHaveBeenCalled()
    state.fitZoom = 7.03
    act(() => state.map?.fire('resize'))
    expect(removeSource).toHaveBeenCalledWith('charities')
    expect(state.map?.sources).toEqual(['charities-fine', 'charities'])
  })

  it('regression: redraws a reused cluster id with its new members and place, never the old count and icon', async () => {
    const { state, engine } = fakeLibrary()
    renderWithProviders(<MapView charities={[shelter, childrenHome]} selectedId={null} onSelect={vi.fn()} focus={null} engine={engine} />)
    await waitFor(() => expect(state.map).not.toBeNull())
    const cluster = (lng: number, props: Record<string, number>) => ({ geometry: { type: 'Point', coordinates: [lng, 56.5] }, properties: { cluster: true, cluster_id: 9, ...props } })
    state.features = [cluster(21.17, { point_count: 2, 'n:zupas-virtuve': 2 })]
    act(() => state.map?.fire('load'))
    expect(await screen.findByRole('button', { name: /^2 organizācijas šajā apgabalā, visas: Zupas virtuve/ })).toBeInTheDocument()

    // New data: supercluster hands the same id to a mixed pair somewhere else.
    state.features = [cluster(21.01, { point_count: 2, 'n:zupas-virtuve': 1, 'n:cits': 1 })]
    act(() => state.map?.fire('sourcedata', { sourceId: 'charities' }))
    const heart = await screen.findByRole('button', { name: '2 organizācijas šajā apgabalā. Pietuvināt' })
    expect(heart.querySelector('.dp-heart')).not.toBeNull()
    expect(screen.queryByRole('button', { name: /Zupas virtuve/ })).toBeNull()
    expect(state.moved.at(-1)).toEqual([21.01, 56.5])
  })

  it('ties the newsletter sign-up in the expanded card to that charity', async () => {
    const fetcher = fakeFetch({ '/api/subscribe': { body: { ok: true, data: {} } } })
    vi.stubGlobal('fetch', fetcher)
    const { state, engine } = fakeLibrary()
    renderWithProviders(<MapView charities={[shelter]} selectedId={shelter.id} onSelect={vi.fn()} focus={null} engine={engine} />)
    await waitFor(() => expect(state.map).not.toBeNull())
    act(() => state.map?.fire('load'))
    fireEvent.click(await screen.findByRole('button', { name: /Skatīt vajadzības/ }))
    fireEvent.change(await screen.findByLabelText(/^E-pasts/), { target: { value: 'ilze@example.lv' } })
    fireEvent.click(screen.getByRole('checkbox', { name: /Piekrītu saņemt/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Pierakstīties' }))
    expect(await screen.findByText('Paldies! Jūsu pieraksts ir saņemts.')).toBeInTheDocument()
    const call = fetcher.mock.calls.find(([url]) => String(url).endsWith('/subscribe'))
    expect(JSON.parse(String(call?.[1]?.body))).toEqual({ email: 'ilze@example.lv', consent: true, charityId: shelter.id })
  })

  it('draws charities at one address on a small ring, and opens the popup on the drawn pin', async () => {
    const twin = { ...childrenHome, id: 'c-twin', profile: { ...childrenHome.profile, location: shelter.profile.location } }
    const { state, engine } = fakeLibrary()
    renderWithProviders(<MapView charities={[shelter, twin]} selectedId={null} onSelect={vi.fn()} focus={{ id: shelter.id, nonce: 1 }} engine={engine} />)
    await waitFor(() => expect(state.map).not.toBeNull())
    act(() => state.map?.fire('load'))
    const center = state.flyTo.mock.calls[0]?.[0]?.center as [number, number]
    expect(center).not.toEqual([shelter.profile.location.lng, shelter.profile.location.lat])
    expect(Math.abs(center[1] - shelter.profile.location.lat)).toBeLessThan(0.001)
  })

  it('opens the small card of a charity with no needs yet, saying so', async () => {
    const { state, engine } = fakeLibrary()
    renderWithProviders(<MapView charities={[childrenHome]} selectedId={childrenHome.id} onSelect={vi.fn()} focus={null} engine={engine} />)
    await waitFor(() => expect(state.map).not.toBeNull())
    act(() => state.map?.fire('load'))
    expect(await screen.findByText('Vajadzības vēl nav norādītas.')).toBeInTheDocument()
    expect(screen.getByText('Iestāde tās varēs pievienot pēc reģistrēšanās.')).toBeInTheDocument()
  })

  it('opens small again after the expanded card is closed and the charity chosen again', async () => {
    const { state, engine } = fakeLibrary()
    const view = (selectedId: string | null) => (
      <MapView charities={[shelter, childrenHome]} selectedId={selectedId} onSelect={vi.fn()} focus={null} engine={engine} />
    )
    const { rerender } = renderWithProviders(view(shelter.id))
    await waitFor(() => expect(state.map).not.toBeNull())
    act(() => state.map?.fire('load'))
    fireEvent.click(await screen.findByRole('button', { name: /Skatīt vajadzības/ }))
    expect(await screen.findByRole('link', { name: /Atvērt pilnu lapu/ })).toBeInTheDocument()

    // Closed (the close button, a map click), then the same pin again: the small card.
    rerender(view(null))
    rerender(view(shelter.id))
    expect(await screen.findByRole('button', { name: /Skatīt vajadzības/ })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Atvērt pilnu lapu/ })).toBeNull()

    // Expanded, then another pin: that one opens small too.
    fireEvent.click(screen.getByRole('button', { name: /Skatīt vajadzības/ }))
    await screen.findByRole('link', { name: /Atvērt pilnu lapu/ })
    rerender(view(childrenHome.id))
    expect(await screen.findByRole('button', { name: /Skatīt vajadzības/ })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Atvērt pilnu lapu/ })).toBeNull()
  })

  it('expands into a modal bottom sheet on a phone, which Escape and the backdrop collapse', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: true, media: query, addEventListener: () => undefined, removeEventListener: () => undefined }))
    const { state, engine } = fakeLibrary()
    renderWithProviders(<MapView charities={[shelter]} selectedId={shelter.id} onSelect={vi.fn()} focus={null} engine={engine} />)
    await waitFor(() => expect(state.map).not.toBeNull())
    act(() => state.map?.fire('load'))
    fireEvent.click(await screen.findByRole('button', { name: /Skatīt vajadzības/ }))
    const sheet = await screen.findByRole('dialog', { name: shelter.profile.organization.name })
    expect(sheet).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByRole('button', { name: 'Sakļaut' })).toHaveFocus()

    fireEvent.keyDown(screen.getByRole('button', { name: 'Sakļaut' }), { key: 'Escape' })
    expect(screen.queryByRole('dialog', { name: shelter.profile.organization.name })).toBeNull()
    expect(await screen.findByRole('button', { name: /Skatīt vajadzības/ })).toHaveFocus()

    fireEvent.click(screen.getByRole('button', { name: /Skatīt vajadzības/ }))
    fireEvent.click(await screen.findByRole('dialog', { name: shelter.profile.organization.name }))
    expect(screen.queryByRole('dialog', { name: shelter.profile.organization.name })).toBeNull()
    vi.unstubAllGlobals()
  })
})
