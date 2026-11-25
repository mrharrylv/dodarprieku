import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import type { GeoJSONSource, Map as MlMap, Marker, Popup } from 'maplibre-gl'

import { LATVIA_BOUNDS, type PublicCharity } from '@shared/contracts'
import { toFeatureCollection } from '@/lib/snapshot'
import { Spinner } from '@/components/ui/Spinner'
import { MapPopupCard } from './MapPopupCard'
import { CharityPin, ClusterPin } from './MapPins'
import {
  CLUSTER_MAX_ZOOM,
  CLUSTER_RADIUS,
  FLY_DURATION_MS,
  FOCUS_ZOOM,
  HIT_LAYER_ID,
  MAP_BOUNDS,
  MAP_MAX_ZOOM,
  MAP_MIN_ZOOM,
  MAP_STYLE_URL,
  POPUP_OFFSET,
  SOURCE_ID,
} from './map-config'
import { MAPLIBRE_ENGINE, prefersReducedMotion, type MapEngine, type MaplibreModule } from './maplibre-engine'
import { pinItems, pinSignature, type PinItem, type SourceFeature } from './marker-sync'
import './map.css'

type Phase = 'loading' | 'ready' | 'unavailable'

interface Placed {
  readonly item: PinItem
  readonly element: HTMLElement
}

/** A request to fly to a charity; `nonce` repeats a fly to the same one. */
export interface MapFocus {
  readonly id: string
  readonly nonce: number
}

/**
 * The MapLibre map, mounted only in the browser after hydration. Pins are
 * HTML markers rendered by React through portals, so each one is a real,
 * focusable button; the panel's list remains the main accessible path.
 */
const LATVIA_BOX: [[number, number], [number, number]] = [
  [LATVIA_BOUNDS.minLng, LATVIA_BOUNDS.minLat],
  [LATVIA_BOUNDS.maxLng, LATVIA_BOUNDS.maxLat],
]
const FIT_PADDING = 24
/** How far below the map's centre a selected pin settles, in pixels. */
const POPUP_PAN_OFFSET_PX = 170

/**
 * OpenFreeMap's style labels places in English ("Latvia", "Lithuania"). Where
 * OpenStreetMap has a Latvian name, show that instead, falling back to the
 * local name.
 */
const applyLatvianLabels = (map: MlMap): void => {
  for (const layer of map.getStyle().layers) {
    if (layer.type !== 'symbol' || map.getLayoutProperty(layer.id, 'text-field') === undefined) continue
    map.setLayoutProperty(layer.id, 'text-field', ['coalesce', ['get', 'name:lv'], ['get', 'name']])
  }
}

export const MapView = ({
  charities,
  selectedId,
  onSelect,
  focus,
  engine = MAPLIBRE_ENGINE,
}: {
  charities: readonly PublicCharity[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  focus: MapFocus | null
  engine?: MapEngine
}) => {
  const { t } = useTranslation('map')
  const container = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MlMap | null>(null)
  const libRef = useRef<MaplibreModule | null>(null)
  const markers = useRef(new Map<string, Marker>())
  const signature = useRef('')
  const [phase, setPhase] = useState<Phase>('loading')
  const [placed, setPlaced] = useState<readonly Placed[]>([])
  const [popupNode, setPopupNode] = useState<HTMLElement | null>(null)
  const onSelectRef = useRef(onSelect)
  const data = useMemo(() => toFeatureCollection(charities), [charities])
  const dataRef = useRef(data)
  const byId = useMemo(() => new Map(charities.map((c) => [c.id, c])), [charities])

  useEffect(() => {
    onSelectRef.current = onSelect
    dataRef.current = data
  })

  // Create the map once.
  useEffect(() => {
    let cancelled = false
    const markerMap = markers.current

    const sync = () => {
      const map = mapRef.current
      const lib = libRef.current
      if (map === null || lib === null || !map.getSource(SOURCE_ID) || !map.isSourceLoaded(SOURCE_ID)) return
      const items = pinItems(map.querySourceFeatures(SOURCE_ID) as unknown as SourceFeature[])
      const next = pinSignature(items)
      if (next === signature.current) return
      signature.current = next
      const keep = new Set(items.map((i) => i.key))
      for (const [key, marker] of markerMap) {
        if (!keep.has(key)) {
          marker.remove()
          markerMap.delete(key)
        }
      }
      const nextPlaced = items.map((item) => {
        const existing = markerMap.get(item.key)
        if (existing !== undefined) return { item, element: existing.getElement() }
        const element = document.createElement('div')
        element.className = 'dp-marker'
        const marker = new lib.Marker({ element }).setLngLat([item.lngLat[0], item.lngLat[1]]).addTo(map)
        markerMap.set(item.key, marker)
        return { item, element }
      })
      setPlaced(nextPlaced)
    }

    const start = async () => {
      await Promise.resolve()
      if (cancelled || container.current === null) return
      if (!engine.supported()) return setPhase('unavailable')
      let lib: MaplibreModule
      try {
        lib = await engine.load()
      } catch (error) {
        console.warn('[map] maplibre could not be loaded', error)
        if (!cancelled) setPhase('unavailable')
        return
      }
      if (cancelled || container.current === null) return
      libRef.current = lib
      const map = new lib.Map({
        container: container.current,
        style: MAP_STYLE_URL,
        // Fit the whole country whatever the panel leaves of the screen; a
        // fixed zoom showed only Riga on a narrow map.
        bounds: LATVIA_BOX,
        fitBoundsOptions: { padding: FIT_PADDING },
        minZoom: MAP_MIN_ZOOM,
        maxZoom: MAP_MAX_ZOOM,
        maxBounds: [MAP_BOUNDS[0], MAP_BOUNDS[1]],
        dragRotate: false,
        pitchWithRotate: false,
        attributionControl: { compact: true },
      })
      mapRef.current = map
      map.addControl(new lib.NavigationControl({ showCompass: false }), 'bottom-right')
      map.on('load', () => {
        // The panel settles its width after the map is created; fit again
        // now that the container has its final size.
        map.resize()
        map.fitBounds(LATVIA_BOX, { padding: FIT_PADDING, animate: false })
        applyLatvianLabels(map)
        map.addSource(SOURCE_ID, {
          type: 'geojson',
          data: dataRef.current,
          cluster: true,
          clusterRadius: CLUSTER_RADIUS,
          clusterMaxZoom: CLUSTER_MAX_ZOOM,
        })
        map.addLayer({ id: HIT_LAYER_ID, type: 'circle', source: SOURCE_ID, paint: { 'circle-radius': 1, 'circle-opacity': 0 } })
        setPhase('ready')
        sync()
      })
      map.on('render', sync)
      map.on('click', () => onSelectRef.current(null))
    }
    void start()

    return () => {
      cancelled = true
      for (const marker of markerMap.values()) marker.remove()
      markerMap.clear()
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [engine])

  // New data: the filters changed.
  useEffect(() => {
    if (phase !== 'ready') return
    const source = mapRef.current?.getSource(SOURCE_ID) as GeoJSONSource | undefined
    source?.setData(data)
  }, [data, phase])

  // Fly to a charity chosen in the list.
  useEffect(() => {
    const map = mapRef.current
    const target = focus === null ? undefined : byId.get(focus.id)
    if (phase !== 'ready' || map === null || target === undefined) return
    map.flyTo({
      center: [target.profile.location.lng, target.profile.location.lat],
      zoom: Math.max(map.getZoom(), FOCUS_ZOOM),
      duration: prefersReducedMotion() ? 0 : FLY_DURATION_MS,
      essential: true,
    })
    // byId is deliberately not a dependency: a filter change must not fly again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus, phase])

  // The popup of the selected charity.
  const selected = selectedId === null ? undefined : byId.get(selectedId)
  useEffect(() => {
    const map = mapRef.current
    const lib = libRef.current
    if (phase !== 'ready' || map === null || lib === null || selected === undefined) return
    // Bring the pin to the lower middle of the map, so the card (anchored
    // automatically) opens above it with room to spare instead of running off
    // the bottom edge.
    map.easeTo({
      center: [selected.profile.location.lng, selected.profile.location.lat],
      offset: [0, POPUP_PAN_OFFSET_PX],
      duration: prefersReducedMotion() ? 0 : FLY_DURATION_MS / 2,
    })
    const node = document.createElement('div')
    const popup: Popup = new lib.Popup({ closeButton: false, offset: POPUP_OFFSET, maxWidth: 'none', className: 'dp-popup', focusAfterOpen: false })
      .setLngLat([selected.profile.location.lng, selected.profile.location.lat])
      .setDOMContent(node)
      .addTo(map)
    let removing = false
    popup.on('close', () => {
      if (!removing) onSelectRef.current(null)
    })
    // Rendered into on the next frame, through a portal.
    const frame = requestAnimationFrame(() => setPopupNode(node))
    return () => {
      cancelAnimationFrame(frame)
      removing = true
      popup.remove()
      setPopupNode(null)
    }
  }, [phase, selected])

  const zoomCluster = (clusterId: number, lngLat: readonly [number, number]) => {
    const map = mapRef.current
    const source = map?.getSource(SOURCE_ID) as GeoJSONSource | undefined
    if (map === null || map === undefined || source === undefined) return
    void source.getClusterExpansionZoom(clusterId).then(
      (zoom) => map.easeTo({ center: [lngLat[0], lngLat[1]], zoom, duration: prefersReducedMotion() ? 0 : 600 }),
      (error: unknown) => console.warn('[map] cluster zoom failed', error),
    )
  }

  return (
    <div
      className="relative h-full w-full"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && selectedId !== null) onSelect(null)
      }}
    >
      {/* MapLibre's stylesheet sets position: relative on its container, which
          would override absolute positioning and collapse it to zero height,
          so the container fills an absolutely positioned wrapper instead. */}
      <div className="absolute inset-0">
        <div ref={container} className="h-full w-full" role="region" aria-label={t('map.label')} />
      </div>
      {phase === 'loading' && (
        <p className="absolute top-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-(--surface-raised) px-4 py-2 text-(length:--text-sm) text-(--text-secondary) shadow-(--shadow-card)">
          <Spinner />
          {t('map.loading')}
        </p>
      )}
      {phase === 'unavailable' && (
        <div className="absolute inset-x-4 top-4 mx-auto max-w-sm rounded-(--radius-lg) bg-(--surface-raised) p-4 shadow-(--shadow-card)">
          <p className="font-medium text-(--text-primary)">{t('map.unavailableTitle')}</p>
          <p className="mt-1 text-(length:--text-sm) text-(--text-secondary)">{t('map.unavailableBody')}</p>
        </div>
      )}
      {placed.map(({ item, element }) => {
        if (item.kind === 'cluster') {
          return createPortal(
            <ClusterPin count={item.count} onZoom={() => zoomCluster(item.clusterId, item.lngLat)} />,
            element,
            item.key,
          )
        }
        const charity = byId.get(item.id)
        return charity === undefined
          ? null
          : createPortal(
              <CharityPin charity={charity} selected={charity.id === selectedId} onSelect={onSelect} />,
              element,
              item.key,
            )
      })}
      {popupNode !== null &&
        selected !== undefined &&
        createPortal(<MapPopupCard charity={selected} onClose={() => onSelect(null)} />, popupNode)}
    </div>
  )
}
