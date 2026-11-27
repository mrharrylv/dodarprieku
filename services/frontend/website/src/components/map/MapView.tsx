import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import type { Map as MlMap, MapMouseEvent, MapSourceDataEvent, Marker } from 'maplibre-gl'

import { LATVIA_BOUNDS, type PublicCharity } from '@shared/contracts'
import { drawnAt, toFeatureCollection } from '@/lib/snapshot'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { Spinner } from '@/components/ui/Spinner'
import { CharitySheet } from './CharitySheet'
import { MapPopupCard, type CardFocus } from './MapPopupCard'
import { CategoryClusterPin, CharityPin, ClusterPin } from './MapPins'
import {
  CLUSTER_ZOOM_EXTRA,
  FLY_DURATION_MS,
  FOCUS_ZOOM,
  MAP_BOUNDS,
  MAP_MAX_ZOOM,
  MAP_MIN_ZOOM,
  MAP_STYLE_URL,
  MOVE_SYNC_MS,
  PANEL_SHEET_QUERY,
  SOURCES,
  type SourceKey,
} from './map-config'
import { spreadColocated } from './colocated'
import { createClusterSplitter, type ClusterSplitter } from './cluster-split'
import { addCharitySources, applyLatvianLabels, childrenOf, markersInView, refitCoarseSource, setCharityData, sourceOf } from './map-setup'
import { MAPLIBRE_ENGINE, prefersReducedMotion, type MapEngine, type MaplibreModule } from './maplibre-engine'
import { pinSignature, type FadedPoint, type PinItem } from './marker-sync'
import { createSyncThrottle } from './sync-throttle'
import { flightKey, mapPadding, pinOffset, useCharityPopup } from './useCharityPopup'
import './map.css'

type Phase = 'loading' | 'ready' | 'unavailable'

interface Placed {
  readonly item: PinItem
  readonly element: HTMLElement
}

/** A request to fly to a charity; `nonce` repeats a fly to the same one. `expand` opens its card expanded (a shared link). */
export interface MapFocus {
  readonly id: string
  readonly nonce: number
  readonly expand?: boolean
}

const LATVIA_BOX: [[number, number], [number, number]] = [
  [LATVIA_BOUNDS.minLng, LATVIA_BOUNDS.minLat],
  [LATVIA_BOUNDS.maxLng, LATVIA_BOUNDS.maxLat],
]
const FIT_PADDING = 24
/** How long the map takes to make room for the docked panel, or to take it back. */
const INSET_EASE_MS = 300

/** Fitting the country: the usual margin, and the docked panel's width on the right. */
const fitPadding = (inset: number) => ({ top: FIT_PADDING, bottom: FIT_PADDING, left: FIT_PADDING, right: FIT_PADDING + inset })

/** The zoom that fits the whole country in the map as it is sized now. */
const countryZoom = (map: MlMap): number => map.cameraForBounds(LATVIA_BOX, { padding: FIT_PADDING })?.zoom ?? map.getZoom()

const NONE: readonly PublicCharity[] = []

const OUR_SOURCES: ReadonlySet<string> = new Set(Object.values(SOURCES).map((s) => s.id))

/** Where the camera is, to the pixel: a sync for the same camera and the same data changes nothing. */
const cameraKey = (map: MlMap): string => {
  const { lng, lat } = map.getCenter()
  const box = map.getContainer()
  return `${map.getZoom().toFixed(3)}|${lng.toFixed(5)}|${lat.toFixed(5)}|${box.clientWidth}x${box.clientHeight}`
}

interface SyncRequest {
  /** `changed`: the data or tiles changed, so work the markers out again on the next frame. */
  readonly request: (changed?: boolean) => void
}
const IDLE_SYNC: SyncRequest = { request: () => undefined }

/** Faded markers sit under the active ones, so a pin that needs something is never hidden by one that does not. */
const FADED_CLASS = 'dp-marker-faded'
const isFaded = (item: PinItem): boolean => item.kind === 'point' && item.faded === true

/** A click on a marker or inside the card is not a click on the map. */
const onChrome = (event: MapMouseEvent | undefined): boolean => {
  const target = event?.originalEvent?.target
  return target instanceof Element && target.closest('.maplibregl-popup, .dp-marker') !== null
}

/**
 * The MapLibre map, mounted only in the browser after hydration. Pins are
 * HTML markers rendered by React through portals, so each one is a real,
 * focusable button; only the clusters and charities in or just around the
 * view become markers, so a thousand charities cost a few dozen elements.
 * The search's results list remains the main accessible path.
 *
 * `charities` are the organisations with open needs: they cluster, and the
 * clusters count only them. `faded` (no needs) are drawn greyed out from
 * FADED_FROM_ZOOM, beside the clusters, never in them.
 */
export const MapView = ({
  charities,
  faded = NONE,
  selectedId,
  onSelect,
  focus,
  insetRight = 0,
  engine = MAPLIBRE_ENGINE,
}: {
  charities: readonly PublicCharity[]
  faded?: readonly PublicCharity[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  focus: MapFocus | null
  /**
   * Pixels of the map's right edge a docked panel covers. The map takes them
   * as padding, so its centre, fly-tos, cluster zooms and the charity card
   * all sit in the visible part on the left.
   */
  insetRight?: number
  engine?: MapEngine
}) => {
  const { t } = useTranslation('map')
  const container = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MlMap | null>(null)
  const libRef = useRef<MaplibreModule | null>(null)
  const markers = useRef(new Map<string, Marker>())
  const signature = useRef('')
  const throttleRef = useRef<SyncRequest>(IDLE_SYNC)
  /** Splits of the biggest clusters; forgotten whenever the clusters change. */
  const splitterRef = useRef<ClusterSplitter | null>(null)
  const [phase, setPhase] = useState<Phase>('loading')
  const [placed, setPlaced] = useState<readonly Placed[]>([])
  // A shared link can arrive before the map's chunk has loaded: it is already selected, and asks for the card expanded.
  const [expandedId, setExpandedId] = useState<string | null>(() => (focus?.expand === true && focus.id === selectedId ? selectedId : null))
  /** Which of the card's buttons takes focus next: the collapse button after expanding, "Skatīt vajadzības" after collapsing. */
  const [focusTarget, setFocusTarget] = useState<CardFocus | null>(null)
  /** The charity whose pin was just pressed: its card takes focus when it opens, so the keyboard lands in it. */
  const [pinPressed, setPinPressed] = useState<string | null>(null)
  /** The selection the expanded state belongs to: a new selection, or none, starts small. */
  const [expandedFor, setExpandedFor] = useState(selectedId)
  if (expandedFor !== selectedId) {
    setExpandedFor(selectedId)
    // A shared link selects its charity and asks for the card expanded in the same render.
    setExpandedId(focus?.expand === true && focus.id === selectedId ? selectedId : null)
    setFocusTarget(selectedId !== null && pinPressed === selectedId ? 'view' : null)
    setPinPressed(null)
  }
  const phone = useMediaQuery(PANEL_SHEET_QUERY)
  /** The charity a fly-to is taking the map to: the popup's own pan must not cut that flight short. */
  const flyingToRef = useRef<string | null>(null)
  const onSelectRef = useRef(onSelect)
  /** The expanded card's pledge step is open: a stray map click or backdrop tap must not throw it away. */
  const pledgingRef = useRef(false)
  const onPledging = useCallback((pledging: boolean) => {
    pledgingRef.current = pledging
  }, [])
  /** The padding every camera move uses: the docked panel's width on the right. */
  const insetRef = useRef(insetRight)
  const appliedInset = useRef(0)
  const everyone = useMemo(() => [...charities, ...faded], [charities, faded])
  // Spread together, so a faded pin at an active one's address does not hide under it.
  const positions = useMemo(() => spreadColocated(everyone), [everyone])
  const data = useMemo(() => toFeatureCollection(charities, positions), [charities, positions])
  const fadedPoints = useMemo(
    (): readonly FadedPoint[] => faded.map((c) => ({ id: c.id, lngLat: drawnAt(c, positions) })),
    [faded, positions],
  )
  const dataRef = useRef(data)
  const fadedRef = useRef(fadedPoints)
  const selectedRef = useRef(selectedId)
  const byId = useMemo(() => new Map(everyone.map((c) => [c.id, c])), [everyone])

  useEffect(() => {
    onSelectRef.current = onSelect
    dataRef.current = data
    fadedRef.current = fadedPoints
  })

  // Create the map once.
  useEffect(() => {
    let cancelled = false
    const markerMap = markers.current

    /** The camera the markers were last worked out for, and whether the data or tiles changed since. */
    let synced = ''
    let dirty = true

    const sync = () => {
      const map = mapRef.current
      const lib = libRef.current
      if (map === null || lib === null) return
      const camera = cameraKey(map)
      if (!dirty && camera === synced) return
      const items = markersInView(map, splitterRef.current ?? undefined, fadedRef.current, selectedRef.current)
      if (items === null) return
      synced = camera
      dirty = false
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
      setPlaced(
        items.map((item) => {
          const existing = markerMap.get(item.key)
          // The same key can come back for a different group after new data: move it.
          if (existing !== undefined) {
            const element = existing.setLngLat([item.lngLat[0], item.lngLat[1]]).getElement()
            element.classList.toggle(FADED_CLASS, isFaded(item))
            return { item, element }
          }
          const element = document.createElement('div')
          element.className = isFaded(item) ? `dp-marker ${FADED_CLASS}` : 'dp-marker'
          const marker = new lib.Marker({ element }).setLngLat([item.lngLat[0], item.lngLat[1]]).addTo(map)
          markerMap.set(item.key, marker)
          return { item, element }
        }),
      )
    }
    const throttle = createSyncThrottle(sync, MOVE_SYNC_MS)
    throttleRef.current = {
      request: (changed = false) => {
        if (changed) dirty = true
        throttle.request(changed)
      },
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
        fitBoundsOptions: { padding: fitPadding(insetRef.current) },
        minZoom: MAP_MIN_ZOOM,
        maxZoom: MAP_MAX_ZOOM,
        maxBounds: [MAP_BOUNDS[0], MAP_BOUNDS[1]],
        dragRotate: false,
        pitchWithRotate: false,
        attributionControl: { compact: true },
      })
      mapRef.current = map
      splitterRef.current = createClusterSplitter(childrenOf(map), () => throttleRef.current.request(true))
      map.addControl(new lib.NavigationControl({ showCompass: false }), 'bottom-right')
      map.on('load', () => {
        // The panel settles its width after the map is created; fit again
        // now that the container has its final size.
        map.resize()
        appliedInset.current = insetRef.current
        map.setPadding(mapPadding(insetRef.current))
        map.fitBounds(LATVIA_BOX, { padding: fitPadding(insetRef.current), animate: false })
        applyLatvianLabels(map)
        addCharitySources(map, dataRef.current, countryZoom(map))
        setPhase('ready')
        sync()
      })
      // Moving: at most every MOVE_SYNC_MS. Settled, or new tiles or data: on the next frame.
      map.on('move', () => throttle.request())
      map.on('moveend', () => throttle.request(true))
      map.on('resize', () => {
        // A phone turned or a window resized: the country view's distance is another number of pixels now.
        if (refitCoarseSource(map, dataRef.current, countryZoom(map))) splitterRef.current?.reset()
        throttleRef.current.request(true)
      })
      map.on('sourcedata', (event?: MapSourceDataEvent) => {
        if (event?.sourceId !== undefined && OUR_SOURCES.has(event.sourceId)) throttleRef.current.request(true)
      })
      map.on('idle', () => throttle.request(true))
      map.on('click', (event?: MapMouseEvent) => {
        if (!onChrome(event) && !pledgingRef.current) onSelectRef.current(null)
      })
    }
    void start()

    return () => {
      cancelled = true
      throttle.cancel()
      for (const marker of markerMap.values()) marker.remove()
      markerMap.clear()
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [engine])

  // New data: the filters changed.
  useEffect(() => {
    if (phase !== 'ready' || mapRef.current === null) return
    setCharityData(mapRef.current, data)
    splitterRef.current?.reset()
    throttleRef.current.request(true)
  }, [data, phase])

  // The faded pins are not in a source: work the markers out again when they change.
  useEffect(() => {
    fadedRef.current = fadedPoints
    throttleRef.current.request(true)
  }, [fadedPoints])

  // A faded pin is drawn whenever it is the selected one: work the markers out again.
  useEffect(() => {
    selectedRef.current = selectedId
    throttleRef.current.request(true)
  }, [selectedId])

  // A dock opened, closed or resized: make room for it, or take the room back, gently.
  useEffect(() => {
    insetRef.current = insetRight
    const map = mapRef.current
    if (phase !== 'ready' || map === null || appliedInset.current === insetRight) return
    appliedInset.current = insetRight
    map.easeTo({ padding: mapPadding(insetRight), duration: prefersReducedMotion() ? 0 : INSET_EASE_MS })
  }, [insetRight, phase])

  // Fly to a charity chosen in the list.
  useEffect(() => {
    const map = mapRef.current
    const target = focus === null ? undefined : byId.get(focus.id)
    if (phase !== 'ready' || map === null || target === undefined) return
    flyingToRef.current = flightKey(target.id, focus?.expand === true)
    map.flyTo({
      center: drawnAt(target, positions),
      zoom: Math.max(map.getZoom(), FOCUS_ZOOM),
      offset: pinOffset(map, focus?.expand === true),
      padding: mapPadding(insetRef.current),
      duration: prefersReducedMotion() ? 0 : FLY_DURATION_MS,
      essential: true,
    })
    // byId is deliberately not a dependency: a filter change must not fly again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus, phase])

  const selected = selectedId === null ? undefined : byId.get(selectedId)
  const expanded = selected !== undefined && expandedId === selected.id
  const sheet = expanded && phone
  const expand = (id: string) => {
    setExpandedId(id)
    setFocusTarget('collapse')
  }
  const collapse = () => {
    setExpandedId(null)
    setFocusTarget('view')
  }
  const popupNode = useCharityPopup({ ready: phase === 'ready', mapRef, libRef, flyingToRef, insetRef, selected, at: positions, expanded, sheet, onClosed: () => onSelect(null) })

  const zoomCluster = (source: SourceKey, clusterId: number, lngLat: readonly [number, number]) => {
    const map = mapRef.current
    const clustered = map === null ? undefined : sourceOf(map, source)
    if (map === null || clustered === undefined) return
    void clustered.getClusterExpansionZoom(clusterId).then(
      (zoom) =>
        map.easeTo({
          center: [lngLat[0], lngLat[1]],
          zoom: Math.min(zoom + CLUSTER_ZOOM_EXTRA, MAP_MAX_ZOOM),
          padding: mapPadding(insetRef.current),
          duration: prefersReducedMotion() ? 0 : 600,
        }),
      (error: unknown) => console.warn('[map] cluster zoom failed', error),
    )
  }

  /** A pin pressed: select it, and send focus into its card once it is on screen. */
  const selectFromPin = (id: string) => {
    setPinPressed(id)
    onSelect(id)
  }
  /** The card closed by X or Escape: focus goes back to its pin, not to the page. A map click does not use this. */
  const closeCard = () => {
    if (selectedId === null) return
    const pinKey = `p:${selectedId}`
    onSelect(null)
    requestAnimationFrame(() => markers.current.get(pinKey)?.getElement().querySelector<HTMLElement>('button')?.focus({ preventScroll: true }))
  }

  // A mouse click on a pin leaves focus on the page (MapLibre keeps it off the
  // canvas), where the wrapper's onKeyDown never hears Escape: listen there too.
  useEffect(() => {
    if (selectedId === null) return undefined
    const onPageKey = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented || event.target !== document.body || pledgingRef.current) return
      if (expanded) collapse()
      else closeCard()
    }
    document.addEventListener('keydown', onPageKey)
    return () => document.removeEventListener('keydown', onPageKey)
  })

  const onKeyDown = (event: KeyboardEvent) => {
    // The phone's sheet handles its own Escape, and the pledge step inside the card its own (ExpandedCard).
    if (event.key !== 'Escape' || selectedId === null || (event.target instanceof Element && event.target.closest('dialog') !== null)) return
    if (expanded) collapse()
    else closeCard()
  }

  const card =
    selected === undefined ? null : (
      <MapPopupCard
        key={selected.id}
        charity={selected}
        expanded={expanded}
        sheet={sheet}
        focusTarget={focusTarget}
        onFocused={() => setFocusTarget(null)}
        onExpand={() => expand(selected.id)}
        onCollapse={collapse}
        onClose={closeCard}
        onPledging={onPledging}
      />
    )

  return (
    <div className="relative h-full w-full" onKeyDown={onKeyDown}>
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
      {placed.map(({ item, element }) => createPortal(<Pin item={item} byId={byId} selectedId={selectedId} onSelect={selectFromPin} onZoom={zoomCluster} />, element, item.key))}
      {popupNode !== null && card !== null && !sheet && createPortal(card, popupNode)}
      {sheet && selected !== undefined && <CharitySheet title={selected.profile.organization.name} onDismiss={() => { if (!pledgingRef.current) collapse() }}>{card}</CharitySheet>}
    </div>
  )
}

/** One marker: a heart for a mixed cluster, the category's badge with a count for a cluster of one category, the charity's own pin. */
const Pin = ({
  item,
  byId,
  selectedId,
  onSelect,
  onZoom,
}: {
  item: PinItem
  byId: ReadonlyMap<string, PublicCharity>
  selectedId: string | null
  onSelect: (id: string) => void
  onZoom: (source: SourceKey, clusterId: number, lngLat: readonly [number, number]) => void
}) => {
  if (item.kind === 'cluster') {
    const zoom = () => onZoom(item.source, item.clusterId, item.lngLat)
    return item.category !== null ? (
      <CategoryClusterPin count={item.count} category={item.category} onZoom={zoom} />
    ) : (
      <ClusterPin count={item.count} onZoom={zoom} />
    )
  }
  const charity = byId.get(item.id)
  return charity === undefined ? null : (
    <CharityPin charity={charity} faded={item.faded === true} selected={charity.id === selectedId} onSelect={onSelect} />
  )
}
