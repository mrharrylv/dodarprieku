import { vi } from 'vitest'
import type { MapEngine, MaplibreModule } from '@/components/map/maplibre-engine'

/** A stand-in for maplibre-gl, enough to drive the component: no WebGL in jsdom. */
export const fakeLibrary = () => {
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
    padding: null as unknown,
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
    setPadding(padding: unknown) {
      state.padding = padding
      return this
    }
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
    project([lng, lat]: [number, number]) {
      return { x: lng * 1000, y: lat * 1000 }
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
