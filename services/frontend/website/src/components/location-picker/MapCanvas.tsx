import { useEffect, useRef, useState } from 'react'

import type { GeoPoint } from '@shared/contracts'

import { COUNTRY_ZOOM, DEFAULT_CENTER, MAP_STYLE_URL, MAX_BOUNDS, PIN_ZOOM, roundCoord } from './geo'

type MapState = 'loading' | 'ready' | 'error'

type MapLib = typeof import('maplibre-gl')
type MapInstance = InstanceType<MapLib['Map']>
type MarkerInstance = InstanceType<MapLib['Marker']>

/** Puts the pin at `point`, creating it (draggable) the first time. Returns the rounded point. */
const placeMarker = (
  lib: MapLib,
  map: MapInstance,
  markerRef: { current: MarkerInstance | null },
  point: GeoPoint,
  onDrag: (point: GeoPoint) => void,
): GeoPoint => {
  const rounded = { lat: roundCoord(point.lat), lng: roundCoord(point.lng) }
  if (markerRef.current) {
    markerRef.current.setLngLat([rounded.lng, rounded.lat])
    return rounded
  }
  const marker = new lib.Marker({ draggable: true, color: 'currentColor' }).setLngLat([rounded.lng, rounded.lat]).addTo(map)
  marker.on('dragend', () => {
    const at = marker.getLngLat()
    onDrag({ lat: roundCoord(at.lat), lng: roundCoord(at.lng) })
  })
  markerRef.current = marker
  return rounded
}

/**
 * The MapLibre map with one draggable pin. MapLibre is imported only when
 * this mounts, so nobody downloads it before they reach the location step.
 * Click moves the pin, a drag moves it too; both report the new point.
 * `flyTo` changes when the address search finds a place.
 */
export const MapCanvas = ({
  value,
  onChange,
  flyTo,
  label,
  onState,
}: {
  value: GeoPoint | null
  onChange: (point: GeoPoint) => void
  flyTo: GeoPoint | null
  label: string
  onState: (state: MapState) => void
}) => {
  const container = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapInstance | null>(null)
  const markerRef = useRef<MarkerInstance | null>(null)
  const libRef = useRef<MapLib | null>(null)
  const onChangeRef = useRef(onChange)
  const [ready, setReady] = useState(false)
  const initial = useRef(value)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    let cancelled = false
    onState('loading')
    import('@/lib/load-maplibre')
      .then(({ loadMaplibre }) => loadMaplibre())
      .then((lib) => {
        if (cancelled || !container.current) return
        libRef.current = lib
        const start = initial.current
        const map = new lib.Map({
          container: container.current,
          style: MAP_STYLE_URL,
          center: [(start ?? DEFAULT_CENTER).lng, (start ?? DEFAULT_CENTER).lat],
          zoom: start ? PIN_ZOOM : COUNTRY_ZOOM,
          maxBounds: MAX_BOUNDS,
          attributionControl: { compact: true },
        })
        map.addControl(new lib.NavigationControl({ showCompass: false }), 'top-right')
        const report = (point: GeoPoint) => onChangeRef.current(point)
        map.on('click', (e) => report(placeMarker(lib, map, markerRef, { lat: e.lngLat.lat, lng: e.lngLat.lng }, report)))
        map.on('error', (e) => console.error('[location-picker] map error', e.error))
        mapRef.current = map
        if (start) placeMarker(lib, map, markerRef, start, report)
        setReady(true)
        onState('ready')
      })
      .catch((err: unknown) => {
        console.error('[location-picker] could not load the map', err)
        if (!cancelled) onState('error')
      })
    return () => {
      cancelled = true
      mapRef.current?.remove()
      mapRef.current = null
      markerRef.current = null
    }
    // onState is a setter from the parent; the map is built once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const lib = libRef.current
    const map = mapRef.current
    if (!ready || !flyTo || !lib || !map) return
    placeMarker(lib, map, markerRef, flyTo, (point) => onChangeRef.current(point))
    map.flyTo({ center: [flyTo.lng, flyTo.lat], zoom: PIN_ZOOM })
  }, [flyTo, ready])

  return (
    <div
      ref={container}
      role="application"
      aria-label={label}
      className="h-80 w-full overflow-hidden rounded-(--radius-lg) border border-(--border-strong) bg-(--surface-sunken) text-(--text-accent) sm:h-96"
    />
  )
}
