import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { shelter, childrenHome } from '@/lib/snapshot.fixtures'
import { renderWithProviders } from '@/test/render'
import type { MapEngine, MaplibreModule } from './maplibre-engine'
import { MapView } from './MapView'

/** A stand-in for maplibre-gl, enough to drive the component: no WebGL in jsdom. */
const fakeLibrary = () => {
  const state = {
    map: null as FakeMap | null,
    features: [] as unknown[],
    flyTo: vi.fn(),
    easeTo: vi.fn(),
    setData: vi.fn(),
    popups: [] as FakePopup[],
    labels: null as Map<string, unknown> | null,
  }

  class FakeMap {
    handlers = new Map<string, (() => void)[]>()
    container: HTMLElement
    constructor(options: { container: HTMLElement }) {
      this.container = options.container
      state.map = this
    }
    on(event: string, cb: () => void) {
      this.handlers.set(event, [...(this.handlers.get(event) ?? []), cb])
      return this
    }
    fire(event: string) {
      for (const cb of this.handlers.get(event) ?? []) cb()
    }
    addControl() {}
    addSource() {}
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
    getSource() {
      return { setData: state.setData, getClusterExpansionZoom: () => Promise.resolve(9) }
    }
    getZoom() {
      return 7
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

    fireEvent.click(screen.getByRole('button', { name: '4 organizācijas šajā apgabalā. Pietuvināt' }))
    await waitFor(() => expect(state.easeTo).toHaveBeenCalledWith(expect.objectContaining({ zoom: 9 })))

    rerender(view('c-ulubele', { id: 'c-ulubele', nonce: 1 }))
    expect(state.flyTo).toHaveBeenCalledWith(expect.objectContaining({ center: [24.1, 56.95], zoom: 12.5 }))
    const link = await screen.findByRole('link', { name: /Skatīt vajadzības/ })
    expect(link).toHaveAttribute('href', '/organizacija/ulubele')
    expect(screen.getByRole('button', { name: 'Dzīvnieku patversme Ulubele, Dzīvnieku patversme' })).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(screen.getByRole('button', { name: 'Aizvērt' }))
    expect(onSelect).toHaveBeenLastCalledWith(null)

    // Pins leave when the data no longer has them.
    state.features = []
    act(() => state.map?.fire('render'))
    expect(screen.queryByRole('button', { name: /Ulubele, / })).not.toBeInTheDocument()

    rerender(<MapView charities={[childrenHome]} selectedId={null} onSelect={onSelect} focus={null} engine={engine} />)
    expect(state.setData).toHaveBeenCalled()
  })
})
