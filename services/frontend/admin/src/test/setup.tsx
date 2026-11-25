import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// MapLibre needs WebGL, which jsdom has not got. The pin is a plain stand-in.
vi.mock('../components/MapPin', () => ({
  MapPin: ({ location }: { location: { lat: number; lng: number } }) => (
    <div data-testid="map-pin">{`${location.lat},${location.lng}`}</div>
  ),
}))

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  window.localStorage.clear()
})
