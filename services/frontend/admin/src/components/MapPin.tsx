/**
 * A small map with one pin. MapLibre and OpenFreeMap's positron style, loaded
 * on demand so the rest of the portal does not wait for it. When WebGL or the
 * tiles fail, the coordinates and an OpenStreetMap link stay.
 */
import { useEffect, useRef, useState } from 'react'
import type { GeoPoint } from '@shared/contracts'
import { fmt, lv } from '../i18n/lv'

export const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/positron'
const PIN_ZOOM = 14

export const MapPin = ({ location }: { readonly location: GeoPoint }) => {
  const container = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let disposed = false
    let cleanup: (() => void) | undefined
    import('maplibre-gl')
      .then(async (maplibre) => {
        await import('maplibre-gl/dist/maplibre-gl.css')
        if (disposed || !container.current) return
        const map = new maplibre.Map({
          container: container.current,
          style: MAP_STYLE_URL,
          center: [location.lng, location.lat],
          zoom: PIN_ZOOM,
          attributionControl: { compact: true },
        })
        new maplibre.Marker().setLngLat([location.lng, location.lat]).addTo(map)
        map.on('error', (e: { error?: unknown }) => console.warn('[map] tile or style error', e.error))
        cleanup = () => map.remove()
      })
      .catch((e: unknown) => {
        console.warn('[map] could not start the map', e)
        if (!disposed) setFailed(true)
      })
    return () => {
      disposed = true
      cleanup?.()
    }
  }, [location.lat, location.lng])

  const osm = `https://www.openstreetmap.org/?mlat=${location.lat}&mlon=${location.lng}#map=16/${location.lat}/${location.lng}`
  return (
    <div className="space-y-2">
      {failed ? (
        <p role="status" className="rounded-[var(--radius-md)] bg-[var(--surface-sunken)] p-4 text-sm text-[var(--text-secondary)]">
          {fmt(lv.view.mapFailed, { lat: location.lat, lng: location.lng })}
        </p>
      ) : (
        <div ref={container} role="img" aria-label={lv.view.mapLabel} className="h-56 overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-subtle)]" />
      )}
      <a href={osm} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center text-sm font-medium text-[var(--text-accent)] underline">
        {lv.view.openMap}
      </a>
    </div>
  )
}
