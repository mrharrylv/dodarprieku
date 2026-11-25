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
    flyTo: vi.fn(),
    easeTo: vi.fn(),
    setData: vi.fn(),
    popups: [] as FakePopup[],
    labels: null as Map<string, unknown> | null,
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
      return this.sources.includes(id) ? { setData: state.setData, getClusterExpansionZoom: () => Promise.resolve(9) } : undefined
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
    setLngLat() {
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
  it('draws two or three charities as one category pin with a count, and leaves off-screen ones out', async () => {
    const { state, engine } = fakeLibrary()
    renderWithProviders(<MapView charities={[shelter, childrenHome]} selectedId={null} onSelect={vi.fn()} focus={null} engine={engine} />)
    await waitFor(() => expect(state.map).not.toBeNull())
    state.features = [
      { geometry: { type: 'Point', coordinates: [24, 57] }, properties: { cluster: true, cluster_id: 5, point_count: 2, 'n:bernu-nams': 2 } },
      point('c-far', 40, 40),
    ]
    act(() => state.map?.fire('load'))

    const small = await screen.findByRole('button', { name: '2 organizācijas šajā apgabalā. Pietuvināt' })
    expect(small).toHaveTextContent('2')
    expect(small.querySelector('svg path')).not.toBeNull()
    expect(state.map?.sources).toEqual(['charities', 'charities-fine'])
    expect(screen.queryAllByRole('button', { name: /, / })).toHaveLength(0)
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
