import type * as maplibregl from 'maplibre-gl'

/** The parts of the maplibre-gl module the map uses; tests hand in a fake. */
export type MaplibreModule = Pick<typeof maplibregl, 'Map' | 'Marker' | 'Popup' | 'NavigationControl'>

export interface MapEngine {
  /** Whether this browser can draw the map (WebGL). Checked before the library is downloaded. */
  readonly supported: () => boolean
  readonly load: () => Promise<MaplibreModule>
}

export const supportsWebGl = (): boolean => {
  try {
    const canvas = document.createElement('canvas')
    return canvas.getContext('webgl2') !== null || canvas.getContext('webgl') !== null
  } catch {
    return false
  }
}

/**
 * The real engine: maplibre-gl and its stylesheet, fetched only now, after
 * hydration, in their own chunk. Nothing a page renders first depends on it.
 */
export const MAPLIBRE_ENGINE: MapEngine = {
  supported: supportsWebGl,
  load: async () => {
    const [lib] = await Promise.all([import('maplibre-gl'), import('maplibre-gl/dist/maplibre-gl.css')])
    return lib
  },
}

export const prefersReducedMotion = (): boolean => {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}
