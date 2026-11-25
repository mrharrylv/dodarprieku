import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'

/**
 * maplibre-gl, its stylesheet, and its worker URL set explicitly.
 *
 * MapLibre 6 finds its worker relative to its own module URL. Vite's dev
 * pre-bundling moves the module to node_modules/.vite/deps, where the worker
 * file does not exist, and the map never draws ("Worker failed to load").
 * Importing the worker with ?url makes Vite serve it in dev and emit it as a
 * same-origin asset in the build (CSP worker-src 'self').
 */
export const loadMaplibre = async (): Promise<typeof import('maplibre-gl')> => {
  const [lib] = await Promise.all([import('maplibre-gl'), import('maplibre-gl/dist/maplibre-gl.css')])
  lib.setWorkerUrl(workerUrl)
  return lib
}
