import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ConfirmPanel } from '@/components/profile-editor/ConfirmPanel'
import { MapCanvas } from './MapCanvas'

type Handler = (e: { lngLat: { lat: number; lng: number }; error?: unknown }) => void

const fake = vi.hoisted(() => {
  const state = {
    handlers: {} as Record<string, Handler>,
    markers: [] as { at: [number, number]; drag?: () => void; setLngLat: (p: [number, number]) => unknown }[],
    flown: [] as unknown[],
    removed: 0,
  }
  class Map {
    addControl() {}
    on(event: string, fn: Handler) {
      state.handlers[event] = fn
    }
    flyTo(options: unknown) {
      state.flown.push(options)
    }
    remove() {
      state.removed++
    }
  }
  class Marker {
    at: [number, number] = [0, 0]
    drag?: () => void
    constructor() {
      state.markers.push(this)
    }
    setLngLat(p: [number, number]) {
      this.at = p
      return this
    }
    addTo() {
      return this
    }
    on(_event: string, fn: () => void) {
      this.drag = fn
    }
    getLngLat() {
      return { lng: 25.1234567, lat: 57.7654321 }
    }
  }
  class NavigationControl {}
  return { state, Map, Marker, NavigationControl }
})

vi.mock('maplibre-gl', () => ({ Map: fake.Map, Marker: fake.Marker, NavigationControl: fake.NavigationControl, setWorkerUrl: () => {} }))
vi.mock('maplibre-gl/dist/maplibre-gl.css', () => ({}))

describe('MapCanvas', () => {
  it('loads the map, moves the pin on click and drag, and flies to a search result', async () => {
    const onChange = vi.fn()
    const onState = vi.fn()
    const { rerender, unmount } = render(
      <MapCanvas value={{ lat: 56.9, lng: 24.1 }} onChange={onChange} flyTo={null} label="Karte" onState={onState} />,
    )
    expect(screen.getByRole('application', { name: 'Karte' })).toBeInTheDocument()
    await waitFor(() => expect(onState).toHaveBeenCalledWith('ready'))
    expect(fake.state.markers).toHaveLength(1)
    expect(fake.state.markers[0]?.at).toEqual([24.1, 56.9])

    fake.state.handlers.click?.({ lngLat: { lat: 57.1234567, lng: 25.7654321 } })
    expect(onChange).toHaveBeenLastCalledWith({ lat: 57.123457, lng: 25.765432 })
    expect(fake.state.markers).toHaveLength(1)

    fake.state.markers[0]?.drag?.()
    expect(onChange).toHaveBeenLastCalledWith({ lat: 57.765432, lng: 25.123457 })

    rerender(<MapCanvas value={null} onChange={onChange} flyTo={{ lat: 56.5, lng: 21.0 }} label="Karte" onState={onState} />)
    await waitFor(() => expect(fake.state.flown).toHaveLength(1))
    expect(fake.state.markers[0]?.at).toEqual([21, 56.5])

    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    fake.state.handlers.error?.({ lngLat: { lat: 0, lng: 0 }, error: new Error('tiles') })
    unmount()
    expect(fake.state.removed).toBe(1)
  })
})

describe('ConfirmPanel', () => {
  it('takes focus, confirms, and cancels on Escape', () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    render(<ConfirmPanel title="Jautājums" body="Teksts" confirmLabel="Jā" cancelLabel="Nē" onConfirm={onConfirm} onCancel={onCancel} />)
    const dialog = screen.getByRole('alertdialog', { name: 'Jautājums' })
    expect(dialog).toHaveFocus()
    fireEvent.click(screen.getByRole('button', { name: 'Jā' }))
    fireEvent.keyDown(dialog, { key: 'Escape' })
    expect(onConfirm).toHaveBeenCalledOnce()
    expect(onCancel).toHaveBeenCalledOnce()
  })
})
